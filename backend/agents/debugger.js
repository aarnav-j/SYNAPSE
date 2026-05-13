// ─────────────────────────────────────────────
// SYNAPSE — Debugger Agent (Production v2)
// Principal-level debugging engine with:
// - Structured diagnosis pipeline
// - Architecture-aware context building
// - Smart file relevance filtering
// - Visual/CSS debugging support
// - Targeted repair with regression prevention
// - Token-optimized context sharding
// ─────────────────────────────────────────────

const { callAI } = require("../services/aiRouter");
const { parseBatchOutput } = require("../utils/parser");
const db = require("../database/connection");
const { saveFile, saveDocs, resolveFileType } = require("../utils/fileManager");
const log = require("../utils/logger");

// ── Constants ──

const MAX_FILE_LENGTH = 4000;
const MAX_HISTORY_MESSAGES = 8;
const MAX_CONTEXT_FILES = 12;

// ── Issue Classifier ──
// Determines which files are relevant to the user's issue

function classifyIssue(message) {
    const msg = message.toLowerCase();

    const categories = {
        backend: /server|route|api|express|middleware|cors|port|crash|500|401|403|404|jwt|auth|token|login|register|bcrypt|database|sql|data\s*store/,
        frontend: /ui|css|style|layout|button|modal|form|page|display|html|dom|render|click|event|listener|toast|animation|responsive|mobile|color|font|flex|grid|align|margin|padding|z-index|overflow|hover|scroll/,
        api: /fetch|post|get|put|delete|request|response|json|body|header|endpoint|mismatch|url|path/,
        state: /state|undefined|null|empty|missing|not showing|not working|nothing happens|blank|loading/,
        error: /error|bug|fail|crash|broken|exception|throw|catch|syntax|reference|type\s*error|cannot read/,
        styling: /css|style|color|font|spacing|margin|padding|border|shadow|radius|theme|dark|light|gradient|animation|transition|transform|opacity|z-index|position|flex|grid|responsive|media\s*query|breakpoint/
    };

    const matched = {};
    for (const [cat, regex] of Object.entries(categories)) {
        matched[cat] = regex.test(msg);
    }

    return {
        ...matched,
        isVisual: matched.frontend || matched.styling,
        isFullStack: matched.backend && (matched.frontend || matched.api),
        needsAllFiles: matched.isFullStack || /everything|whole|all files|entire|project/.test(msg)
    };
}

// ── Smart File Relevance Filter ──
// Sends only files relevant to the issue to save tokens

function filterRelevantFiles(files, classification, codeContext) {
    if (classification.needsAllFiles || files.length <= 5) {
        return files; // Small projects: send everything
    }

    const relevant = [];
    const fileMap = new Map(files.map(f => [f.filename, f]));

    // Always include server.js (routing hub)
    if (fileMap.has("server.js")) relevant.push(fileMap.get("server.js"));

    // If code context mentions specific files, prioritize those
    if (codeContext) {
        files.forEach(f => {
            if (codeContext.includes(f.filename)) relevant.push(f);
        });
    }

    // Category-based inclusion
    files.forEach(f => {
        if (relevant.includes(f)) return;

        const isFrontend = f.file_type === "frontend" || f.filename.startsWith("frontend/");
        const isBackend = f.file_type === "backend" || (!f.filename.startsWith("frontend/") && f.filename.endsWith(".js"));
        const isRoute = f.filename.startsWith("routes/");
        const isMiddleware = f.filename.startsWith("middleware/");
        const isUtil = f.filename.startsWith("utils/");

        if (classification.backend && (isBackend || isRoute || isMiddleware || isUtil)) {
            relevant.push(f);
        }
        if (classification.frontend && isFrontend) {
            relevant.push(f);
        }
        if (classification.api && (isRoute || isFrontend)) {
            relevant.push(f);
        }
        if (classification.styling && f.filename.includes("style.css")) {
            relevant.push(f);
        }
    });

    // If nothing matched, include all (safety fallback)
    if (relevant.length === 0) return files;

    // De-duplicate
    const seen = new Set();
    const deduped = relevant.filter(f => {
        if (seen.has(f.filename)) return false;
        seen.add(f.filename);
        return true;
    });

    return deduped.slice(0, MAX_CONTEXT_FILES);
}

// ── Pre-Analysis: extract architecture summary from files ──
// Gives the AI a compact overview without full code

function buildArchitectureSummary(files) {
    const summary = [];

    files.forEach(f => {
        if (!f.code) return;

        if (f.filename === "server.js") {
            // Extract mounted routes
            const mounts = [...f.code.matchAll(/app\.use\(['"]([^'"]+)['"],\s*require\(['"]([^'"]+)['"]\)/g)];
            if (mounts.length > 0) {
                summary.push(`SERVER ROUTES: ${mounts.map(m => `${m[1]} → ${m[2]}`).join(", ")}`);
            }
        }

        if (f.filename.startsWith("routes/")) {
            // Extract route handlers
            const handlers = [...f.code.matchAll(/router\.(get|post|put|patch|delete)\(['"]([^'"]+)['"]/gi)];
            if (handlers.length > 0) {
                summary.push(`${f.filename}: ${handlers.map(h => `${h[1].toUpperCase()} ${h[2]}`).join(", ")}`);
            }
        }

        if (f.filename === "frontend/app.js" || f.filename === "app.js") {
            // Extract fetch URLs
            const fetches = [...f.code.matchAll(/fetch\s*\(\s*[`'"](\/[^`'"]*)[`'"]/g)];
            if (fetches.length > 0) {
                summary.push(`FRONTEND FETCHES: ${fetches.map(m => m[1]).join(", ")}`);
            }
        }
    });

    return summary.length > 0 ? `\nARCHITECTURE OVERVIEW:\n${summary.join("\n")}\n` : "";
}

// ── Build Debug Prompt ──

function buildDebugPrompt(projectFiles, chatHistory, userMessage, codeContext, classification) {
    // Build compact code blocks with smart truncation
    const codeBlocks = projectFiles.map(f => {
        let code = f.code || "";
        if (code.length > MAX_FILE_LENGTH) {
            code = code.substring(0, MAX_FILE_LENGTH) + "\n// ... [truncated]";
        }
        return `--- ${f.filename} ---\n${code}\n--- end ---`;
    }).join("\n\n");

    // Trim chat history
    const recentHistory = chatHistory.slice(-MAX_HISTORY_MESSAGES);
    const historyBlock = recentHistory.map(msg =>
        `[${msg.role.toUpperCase()}]: ${msg.content}`
    ).join("\n\n");

    // Architecture summary for full-stack issues
    const archSummary = classification.isFullStack ? buildArchitectureSummary(projectFiles) : "";

    // Build issue-type-specific instructions
    let specialInstructions = "";

    if (classification.isVisual) {
        specialInstructions += `\nVISUAL DEBUGGING:
- Map UI issues to exact CSS properties (flex, grid, position, z-index, overflow, etc.)
- Identify layout model involved
- Ensure responsive design is preserved
- Check for stacking context issues
- Verify hover/focus/animation states\n`;
    }

    if (classification.isFullStack) {
        specialInstructions += `\nFULL-STACK DEBUGGING:
- Verify frontend fetch URLs match backend mounted routes EXACTLY
- Check request/response shape alignment
- Verify auth flow consistency (JWT, middleware, headers)
- Trace data flow: frontend → API → route handler → data store → response → render\n`;
    }

    if (classification.error) {
        specialInstructions += `\nERROR ANALYSIS:
- Identify the exact error type and location
- Trace the execution path that leads to the error
- Check for missing imports, undefined variables, async issues
- Verify middleware chain and error propagation\n`;
    }

    return `You are SYNAPSE Debugger — a principal engineer and runtime analyst debugging a live project.

RESPONSE STRUCTURE:
1. DIAGNOSIS — What is wrong and why. Reference actual files, functions, and variables.
2. ROOT CAUSE — The underlying reason, not just symptoms.
3. FIX — What you changed and why it resolves the issue.
4. PREVENTION — How to avoid this in the future.
5. If code changes needed → output <FILE> blocks.

MANDATORY REASONING:
- Understand the user's REAL issue before responding
- Map the architecture: routes, middleware, data flow, state, DOM
- Trace execution: what runs first → what fails → why
- Evaluate side effects: will the fix break anything else?
- NEVER guess. Reference actual code.
${specialInstructions}
TECH STACK: Vanilla HTML + CSS + JS frontend. Node.js + Express backend. CommonJS only. NEVER React/JSX.

FILE OUTPUT FORMAT (when code changes needed):
<FILE: filename.ext>
<EXPLANATION>
What was wrong, what was fixed, why the fix works, what side effects were prevented.
</EXPLANATION>
<CODE>
complete production-ready source code for this file
</CODE>
</FILE>

RULES:
- Output COMPLETE files — the system replaces entire files
- NEVER tell user to create files manually — generate <FILE> blocks
- NEVER suggest framework migrations
- NEVER add JS comments inside .json files
- Preserve all existing working functionality
- Verify every require() path exists
- Verify frontend fetch URLs match backend routes
- All async handlers must have try/catch
${archSummary}
PROJECT CODE:
${codeBlocks}

${historyBlock ? `CONVERSATION HISTORY:\n${historyBlock}\n` : ""}
${codeContext ? `HIGHLIGHTED CODE:\n${codeContext}\n` : ""}
USER'S MESSAGE:
${userMessage}

Respond now. Be precise, thorough, and production-safe.`;
}

// ── Validate AI-generated fixes before applying ──

function validateFixes(generatedFiles, existingFiles) {
    const issues = [];

    generatedFiles.forEach(f => {
        // Check for empty/truncated output
        if (!f.code || f.code.trim().length < 20) {
            issues.push(`${f.filename}: Empty or truncated fix`);
        }

        // Check for placeholder contamination
        if (/\/\/ TODO|\/\/ FIXME|\/\/ implement|\/\/ placeholder/i.test(f.code)) {
            issues.push(`${f.filename}: Contains placeholder comments`);
        }

        // Check for React contamination
        if (/import React|from ['"]react|useState\(|className=/.test(f.code)) {
            issues.push(`${f.filename}: Contains React/JSX code`);
        }

        // Backend files must have module.exports (except server.js)
        if (f.filename.endsWith(".js") && !f.filename.startsWith("frontend/") && f.filename !== "server.js") {
            if (!f.code.includes("module.exports")) {
                issues.push(`${f.filename}: Missing module.exports`);
            }
        }

        // Verify fix code looks like real code (not AI explanation)
        const firstLine = f.code.split("\n")[0].trim();
        const looksLikeCode = /^(const |let |var |import |require|function |\/\/|\/\*|export |'use |"use |<!DOCTYPE|<html|\*|@|:root|body|\.|#|\{|<)/.test(firstLine);
        if (!looksLikeCode) {
            issues.push(`${f.filename}: Output doesn't look like source code`);
        }
    });

    return issues;
}

// ── Save fixed files to disk and database ──

async function applyFixes(generatedFiles, projectId) {
    const filesUpdated = [];

    // Get project name for disk saves
    let projectName = null;
    try {
        const projects = await db.query(
            `SELECT project_name FROM projects WHERE id = ?`,
            [projectId]
        );
        if (projects && projects[0]) projectName = projects[0].project_name;
    } catch (_) { }

    for (const file of generatedFiles) {
        // Save to disk
        if (projectName) {
            try {
                saveFile(projectName, file);
                if (!file.filename.endsWith(".md")) {
                    saveDocs(projectName, file);
                }
            } catch (err) {
                log.warn("DEBUGGER", `Disk save failed for ${file.filename}: ${err.message}`);
            }
        }

        // Update or insert in database
        try {
            const existing = await db.query(
                `SELECT id FROM generated_files WHERE project_id = ? AND filename = ?`,
                [projectId, file.filename]
            );

            if (existing.length > 0) {
                await db.query(
                    `UPDATE generated_files SET code = ?, explanation = ?, created_at = NOW() WHERE id = ?`,
                    [file.code, file.explanation || "", existing[0].id]
                );
                log.save("DEBUGGER", `Updated: ${file.filename}`);
            } else {
                const fileType = resolveFileType(file.filename);
                await db.saveGeneratedFile({
                    projectId,
                    filename: file.filename,
                    fileType,
                    code: file.code,
                    explanation: file.explanation || ""
                });
                log.save("DEBUGGER", `Created: ${file.filename}`);
            }

            filesUpdated.push(file.filename);
        } catch (err) {
            log.warn("DEBUGGER", `DB save failed for ${file.filename}: ${err.message}`);
        }
    }

    return filesUpdated;
}

// ── Build response message from AI output ──

function buildResponseMessage(raw, generatedFiles, filesUpdated) {
    // Extract explanation text (everything outside <FILE> blocks)
    const explanationText = raw
        .replace(/<FILE:[\s\S]*?<\/FILE>/g, "")
        .trim();

    let responseMsg = explanationText;

    // Add per-file change descriptions
    const detailedExplanations = generatedFiles
        .filter(f => f.explanation)
        .map(f => `**${f.filename}**: ${f.explanation.trim()}`)
        .join("\n");

    if (detailedExplanations) {
        responseMsg += `\n\n**Changes made:**\n${detailedExplanations}`;
    } else if (responseMsg.length <= 20 && filesUpdated.length > 0) {
        responseMsg = `I've updated ${filesUpdated.length} file(s): ${filesUpdated.join(", ")}. Check the code for details.`;
    }

    return responseMsg.trim();
}

// ═══════════════════════════════════════════
// MAIN DEBUG FUNCTION
// ═══════════════════════════════════════════

async function debuggerAgent({ projectId, sessionId, userMessage, codeContext, image }) {
    log.step("DEBUGGER", `Processing message for project ${projectId}, session ${sessionId}`);

    // Step 1: Load project files
    let projectFiles = [];
    try {
        projectFiles = await db.query(
            `SELECT filename, file_type, code FROM generated_files WHERE project_id = ?`,
            [projectId]
        );
    } catch (err) {
        log.error("DEBUGGER", `Failed to load project files: ${err.message}`);
    }

    // Step 2: Load chat history
    let chatHistory = [];
    try {
        chatHistory = await db.getChatHistory(sessionId);
    } catch (err) {
        log.warn("DEBUGGER", `Failed to load chat history: ${err.message}`);
    }

    // Step 3: Save user message
    try {
        await db.addChatMessage({
            debugSessionId: sessionId,
            role: "user",
            content: userMessage,
            codeContext: codeContext || null
        });
    } catch (err) {
        log.warn("DEBUGGER", `Failed to save user message: ${err.message}`);
    }

    // Step 4: Classify issue and filter relevant files
    const classification = classifyIssue(userMessage);
    const relevantFiles = filterRelevantFiles(projectFiles, classification, codeContext);

    log.info("DEBUGGER", `Issue type: ${Object.entries(classification).filter(([k, v]) => v === true).map(([k]) => k).join(", ") || "general"}`);
    log.info("DEBUGGER", `Context: ${relevantFiles.length}/${projectFiles.length} files selected`);

    // Step 5: Build prompt and call AI
    const prompt = buildDebugPrompt(relevantFiles, chatHistory, userMessage, codeContext, classification);

    const aiOptions = { task: "debug" };
    if (image) aiOptions.image = image;

    const raw = await callAI(prompt, aiOptions);

    if (!raw || raw.trim().length === 0) {
        const fallbackMsg = "I couldn't process your request right now. Please try again.";
        try {
            await db.addChatMessage({ debugSessionId: sessionId, role: "assistant", content: fallbackMsg });
        } catch (_) { }
        return { response: fallbackMsg, filesUpdated: [] };
    }

    // Step 6: Parse file blocks (if any)
    const generatedFiles = parseBatchOutput(raw);
    let filesUpdated = [];

    if (generatedFiles.length > 0) {
        log.info("DEBUGGER", `AI generated/modified ${generatedFiles.length} file(s)`);

        // Step 7: Validate fixes before applying
        const validationIssues = validateFixes(generatedFiles, projectFiles);

        if (validationIssues.length > 0) {
            log.warn("DEBUGGER", `Fix validation issues: ${validationIssues.join("; ")}`);
            // Filter out files that failed validation
            const validFiles = generatedFiles.filter(f => {
                return !validationIssues.some(i => i.startsWith(f.filename + ":") && i.includes("doesn't look like source code"));
            });
            if (validFiles.length > 0) {
                filesUpdated = await applyFixes(validFiles, projectId);
            }
        } else {
            // Step 8: Apply fixes
            filesUpdated = await applyFixes(generatedFiles, projectId);
        }

        // Step 9: Build response
        const responseMsg = buildResponseMessage(raw, generatedFiles, filesUpdated);

        try {
            await db.addChatMessage({ debugSessionId: sessionId, role: "assistant", content: responseMsg });
        } catch (_) { }

        return { response: responseMsg, filesUpdated };
    }

    // Step 10: No file blocks — text-only response
    log.info("DEBUGGER", "AI returned explanation (no code changes)");

    try {
        await db.addChatMessage({ debugSessionId: sessionId, role: "assistant", content: raw });
    } catch (_) { }

    return { response: raw, filesUpdated: [] };
}

module.exports = debuggerAgent;
