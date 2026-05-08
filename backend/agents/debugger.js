// ─────────────────────────────────────────────
// SYNAPSE — Debugging Agent
// A chat-based agent that can:
//   1. Analyze and explain errors
//   2. Fix existing code
//   3. Generate new files
//   4. Create tasks
// Powered by Groq (via AI Router)
// ─────────────────────────────────────────────

const { callAI } = require("../services/aiRouter");
const { parseBatchOutput } = require("../utils/parser");
const db = require("../database/connection");
const { saveFile, saveDocs, resolveFileType } = require("../utils/fileManager");
const log = require("../utils/logger");

// ── Build context prompt with project code + chat history ──

function buildDebugPrompt(projectFiles, chatHistory, userMessage, codeContext) {
    // Build a code summary of all project files
    const codeBlocks = projectFiles.map(f => {
        return `--- ${f.filename} (${f.file_type}) ---\n${f.code}\n--- end ${f.filename} ---`;
    }).join("\n\n");

    // Build chat history context
    const historyBlock = chatHistory.map(msg => {
        return `[${msg.role.toUpperCase()}]: ${msg.content}`;
    }).join("\n\n");

    return `
You are SYNAPSE Debug Agent — a senior full-stack developer helping a user debug, fix, and extend their project.

YOUR CAPABILITIES & INSTRUCTIONS:
1. ERROR ANALYSIS — When the user pastes an error, explain what it means, why it happened, and exactly how to fix it.
2. VISUAL DEBUGGING — If the user uploads a screenshot, heavily analyze the visual elements. Identify UI bugs, misalignments, color issues, or broken layouts, and map them to the exact CSS or HTML lines that need changing.
3. CODE FIXING — Modify the existing code directly. Output the complete, corrected version of the file. Be meticulous with CSS properties (Flexbox, Grid, Colors) if a visual bug is reported.
4. CODE GENERATION — Add new features or files when requested.
5. TECH STACK (STRICT) — Vanilla HTML, CSS, JavaScript only. Node.js backend. NEVER use React or JSX.

RESPONSE RULES:
- Always explain your reasoning clearly before showing code.
- CRITICAL: NEVER tell the user to manually create files or folders. YOU must generate all files using the <FILE> block format below.
- If you need to output new or modified files, use this EXACT format:

<FILE: filename.ext>
<EXPLANATION>
What was changed or created and why
</EXPLANATION>
<CODE>
complete working source code
</CODE>
</FILE>

- You can output MULTIPLE <FILE> blocks.
- If you are generating frontend files, they MUST be named exactly: frontend/index.html, frontend/style.css, and frontend/app.js.
- Backend files (.js): use require() and module.exports
- Always reference the actual project code when debugging — don't guess.

THE USER'S PROJECT CODE:
${codeBlocks}

${historyBlock ? `PREVIOUS CONVERSATION:\n${historyBlock}\n` : ""}
${codeContext ? `CODE CONTEXT (user highlighted this):\n${codeContext}\n` : ""}
USER'S MESSAGE:
${userMessage}

Respond now. Be precise, thorough, and helpful.
`;
}

// ── Main Debug Function ──

async function debuggerAgent({ projectId, sessionId, userMessage, codeContext, image }) {
    log.step("DEBUGGER", `Processing message for project ${projectId}, session ${sessionId}`);

    // Step 1: Load all generated files for this project
    let projectFiles = [];
    try {
        projectFiles = await db.query(
            `SELECT filename, file_type, code FROM generated_files WHERE project_id = ?`,
            [projectId]
        );
    } catch (err) {
        log.error("DEBUGGER", `Failed to load project files: ${err.message}`);
    }

    // Step 2: Load chat history for this session
    let chatHistory = [];
    try {
        chatHistory = await db.getChatHistory(sessionId);
    } catch (err) {
        log.warn("DEBUGGER", `Failed to load chat history: ${err.message}`);
    }

    // Step 3: Save user message to DB
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

    // Step 4: Build prompt and call AI (routes to Groq, or Gemini if image is present)
    const prompt = buildDebugPrompt(projectFiles, chatHistory, userMessage, codeContext);
    
    const aiOptions = { task: "debug" };
    if (image) aiOptions.image = image;
    
    const raw = await callAI(prompt, aiOptions);

    if (!raw || raw.trim().length === 0) {
        const fallbackMsg = "I couldn't process your request right now. Please try again.";

        await db.addChatMessage({
            debugSessionId: sessionId,
            role: "assistant",
            content: fallbackMsg
        });

        return { response: fallbackMsg, filesUpdated: [] };
    }

    // Step 5: Check if AI returned file blocks (code changes)
    const generatedFiles = parseBatchOutput(raw);
    let filesUpdated = [];

    if (generatedFiles.length > 0) {
        log.info("DEBUGGER", `AI generated/modified ${generatedFiles.length} file(s)`);

        // Get project info for saving to disk
        let project = null;
        try {
            const projects = await db.query(
                `SELECT project_name FROM projects WHERE id = ?`,
                [projectId]
            );
            project = projects[0];
        } catch (_) { }

        for (const file of generatedFiles) {
            // Save to disk if we have project info
            if (project) {
                try {
                    saveFile(project.project_name, file);
                    saveDocs(project.project_name, file);
                } catch (err) {
                    log.warn("DEBUGGER", `Disk save failed for ${file.filename}: ${err.message}`);
                }
            }

            // Update or insert in database
            try {
                // Check if this file already exists in the project
                const existing = await db.query(
                    `SELECT id FROM generated_files WHERE project_id = ? AND filename = ?`,
                    [projectId, file.filename]
                );

                if (existing.length > 0) {
                    // Update existing file
                    await db.query(
                        `UPDATE generated_files SET code = ?, explanation = ?, created_at = NOW() WHERE id = ?`,
                        [file.code, file.explanation || "", existing[0].id]
                    );
                    log.save("DEBUGGER", `Updated file in DB: ${file.filename}`);
                } else {
                    // Insert new file
                    const fileType = resolveFileType(file.filename);
                    await db.saveGeneratedFile({
                        projectId,
                        filename: file.filename,
                        fileType,
                        code: file.code,
                        explanation: file.explanation || ""
                    });
                    log.save("DEBUGGER", `New file saved to DB: ${file.filename}`);
                }

                filesUpdated.push(file.filename);
            } catch (err) {
                log.warn("DEBUGGER", `DB save failed for ${file.filename}: ${err.message}`);
            }
        }

        // Extract the explanation text (everything outside <FILE> blocks)
        const explanationText = raw
            .replace(/<FILE:[\s\S]*?<\/FILE>/g, "")
            .trim();

        const responseMsg = explanationText.length > 20
            ? explanationText
            : `I've updated ${filesUpdated.length} file(s): ${filesUpdated.join(", ")}. Check the code above for details.`;

        // Save assistant response
        try {
            await db.addChatMessage({
                debugSessionId: sessionId,
                role: "assistant",
                content: responseMsg
            });
        } catch (_) { }

        return { response: responseMsg, filesUpdated };
    }

    // Step 6: No file blocks — just a text response
    log.info("DEBUGGER", "AI returned explanation (no code changes)");

    try {
        await db.addChatMessage({
            debugSessionId: sessionId,
            role: "assistant",
            content: raw
        });
    } catch (_) { }

    return { response: raw, filesUpdated: [] };
}

module.exports = debuggerAgent;
