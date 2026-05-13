// ─────────────────────────────────────────────
// SYNAPSE — Executor Agent (Production v2)
// Phased execution: Backend → Frontend → Validate → Repair
// Token-efficient, dependency-aware, self-validating
// ─────────────────────────────────────────────

const { callAI } = require("../services/aiRouter");
const { parseBatchOutput } = require("../utils/parser");
const log = require("../utils/logger");

// ── Constants ──

const ALLOWED_PACKAGES = new Set([
    "express", "cors", "dotenv", "bcryptjs",
    "jsonwebtoken", "multer", "express-validator",
    "socket.io", "better-sqlite3", "path", "fs"
]);

const MAX_REPAIR_ATTEMPTS = 2;

// ── Reusable prompt fragments (stored once, referenced by key) ──

const STANDARDS = {
    outputFormat: `OUTPUT FORMAT (STRICT — machine-parsed):
<FILE: path/filename.ext>
<EXPLANATION>
1-2 sentences: purpose, exports, connections.
</EXPLANATION>
<CODE>
complete source code — no markdown, no backticks
</CODE>
</FILE>

RULES:
- <CODE> blocks contain ONLY valid source code
- Every file COMPLETE. No TODOs, no placeholders, no fake implementations
- No text outside <FILE> blocks
- No JS comments inside .json files`,

    backendRules: `BACKEND RULES:
- Node.js + Express. require() and module.exports ONLY
- Modular routing in routes/ folder
- Async handlers: try/catch with meaningful errors
- Input validation on POST/PUT. Return 400: { success: false, error: "msg" }
- Response format: { success: true, data: {...} } or { success: false, error: "msg" }
- IDs: Date.now().toString(36) + Math.random().toString(36).slice(2)
- Auth (if needed): JWT in Authorization header, bcryptjs for passwords
- server.js: express, cors, path, dotenv, express.static('../frontend'), error handler LAST, port 3000`,

    frontendRules: `FRONTEND RULES:
- Semantic HTML5: nav, main, section, header, footer
- viewport meta, Inter font, style.css link, app.js defer
- CSS: :root variables, responsive @media(max-width:768px), hover/focus states, clean modern design
- JS: appState object, reusable API helper with auth headers, UI.showToast(), UI.showLoading()
- fetch() uses RELATIVE paths matching backend routes EXACTLY
- Event delegation for dynamic content
- Form: preventDefault → validate → loading → API call → error handle → toast
- CSS should be clean and modern, NOT bloated. Scale to project complexity.
- NEVER use React/Vue/Angular/JSX/TypeScript`
};

// ═══════════════════════════════════════════
// PHASE 1 — EXECUTION CONTEXT BUILDER
// ═══════════════════════════════════════════

function buildExecutionContext(tasks) {
    const meta = tasks._planMeta || {};
    const backendTasks = [];
    const frontendTasks = [];

    tasks.forEach(t => {
        if (t.filename.startsWith("frontend/")) {
            frontendTasks.push(t);
        } else {
            backendTasks.push(t);
        }
    });

    // Extract API contract from plan metadata or tasks
    const apiContract = (meta.api || []).map(a => `${a.method} ${a.path} → ${a.purpose}`);

    // Extract entities
    const entities = (meta.entities || []).map(e => `${e.name}: ${e.fields.join(", ")}`);

    // Architecture flags
    const arch = meta.architecture || {};

    return {
        backendTasks,
        frontendTasks,
        apiContract,
        entities,
        arch,
        projectType: meta.projectType || "web application",
        totalFiles: tasks.length
    };
}

// ═══════════════════════════════════════════
// PHASE 2 — BACKEND PROMPT BUILDER
// ═══════════════════════════════════════════

function buildBackendPrompt(ctx) {
    let taskList = "";
    let fileList = "";

    ctx.backendTasks.forEach(p => {
        let entry = `[FILE: ${p.filename}]\nTASK: ${p.task}`;
        if (p.dependsOn && p.dependsOn.length > 0) {
            entry += `\nIMPORTS: ${p.dependsOn.join(", ")}`;
        }
        taskList += entry + "\n\n";
        fileList += `- ${p.filename}\n`;
    });

    let contextBlock = "";
    if (ctx.entities.length > 0) {
        contextBlock += `\nENTITIES:\n${ctx.entities.join("\n")}\n`;
    }
    if (ctx.apiContract.length > 0) {
        contextBlock += `\nAPI CONTRACT:\n${ctx.apiContract.join("\n")}\n`;
    }
    if (ctx.arch.hasAuth) contextBlock += "\nAUTH: YES — JWT + bcryptjs\n";
    if (ctx.arch.hasDatabase) contextBlock += "\nDATABASE: YES — better-sqlite3\n";
    if (ctx.arch.hasRealtime) contextBlock += "\nREALTIME: YES — socket.io\n";

    return `You are SYNAPSE Engineer generating BACKEND files for: ${ctx.projectType}

${STANDARDS.backendRules}
${contextBlock}
${STANDARDS.outputFormat}

BACKEND FILES TO GENERATE:
${taskList}
FILE LIST:
${fileList}
Begin. First line: <FILE: ${ctx.backendTasks[0].filename}>`;
}

// ═══════════════════════════════════════════
// PHASE 3 — FRONTEND PROMPT BUILDER
// ═══════════════════════════════════════════

function buildFrontendPrompt(ctx, backendFiles) {
    // Extract actual mounted routes from generated server.js
    const serverFile = backendFiles.find(f => f.filename === "server.js");
    let mountedRoutes = "";

    if (serverFile) {
        const mountRegex = /app\.use\(['"]([^'"]+)['"],\s*require\(['"]([^'"]+)['"]\)/g;
        let m;
        const routes = [];
        while ((m = mountRegex.exec(serverFile.code)) !== null) {
            routes.push(m[1]);
        }
        if (routes.length > 0) {
            mountedRoutes = `\nACTUAL MOUNTED ROUTES (use these EXACT paths in fetch):\n${routes.join("\n")}\n`;
        }
    }

    // Extract route details from route files
    let routeDetails = "";
    backendFiles.forEach(f => {
        if (f.filename.startsWith("routes/")) {
            const methods = [];
            const routeRegex = /router\.(get|post|put|patch|delete)\(['"]([^'"]+)['"]/gi;
            let m;
            while ((m = routeRegex.exec(f.code)) !== null) {
                methods.push(`  ${m[1].toUpperCase()} ${m[2]}`);
            }
            if (methods.length > 0) {
                routeDetails += `${f.filename}:\n${methods.join("\n")}\n`;
            }
        }
    });

    if (routeDetails) {
        mountedRoutes += `\nROUTE HANDLERS:\n${routeDetails}`;
    }

    // Extract exported functions from utils/middleware for reference
    let exports = "";
    backendFiles.forEach(f => {
        if (f.filename.startsWith("utils/") || f.filename.startsWith("middleware/")) {
            const expMatch = f.code.match(/module\.exports\s*=\s*[{(]?([^;]+)/);
            if (expMatch) {
                exports += `${f.filename} exports: ${expMatch[1].trim().slice(0, 100)}\n`;
            }
        }
    });

    let taskList = "";
    let fileList = "";

    ctx.frontendTasks.forEach(p => {
        taskList += `[FILE: ${p.filename}]\nTASK: ${p.task}\n\n`;
        fileList += `- ${p.filename}\n`;
    });

    // API contract from plan metadata
    let apiBlock = "";
    if (ctx.apiContract.length > 0) {
        apiBlock = `\nPLANNED API CONTRACT:\n${ctx.apiContract.join("\n")}\n`;
    }

    return `You are SYNAPSE Engineer generating FRONTEND files for: ${ctx.projectType}

${STANDARDS.frontendRules}
${mountedRoutes}
${apiBlock}
CRITICAL: fetch() URLs MUST match the mounted routes above EXACTLY. Use relative paths only.

${STANDARDS.outputFormat}

FRONTEND FILES TO GENERATE:
${taskList}
FILE LIST:
${fileList}
Begin. First line: <FILE: ${ctx.frontendTasks[0].filename}>`;
}

// ═══════════════════════════════════════════
// PHASE 4 — SINGLE-PASS PROMPT (small projects)
// ═══════════════════════════════════════════

function buildFullPrompt(tasks, ctx) {
    let taskList = "";
    let fileList = "";

    tasks.forEach(p => {
        let entry = `[FILE: ${p.filename}]\nTASK: ${p.task}`;
        if (p.dependsOn && p.dependsOn.length > 0) {
            entry += `\nIMPORTS: ${p.dependsOn.join(", ")}`;
        }
        taskList += entry + "\n\n";
        fileList += `- ${p.filename}\n`;
    });

    let contextBlock = "";
    if (ctx.entities.length > 0) {
        contextBlock += `\nENTITIES:\n${ctx.entities.join("\n")}\n`;
    }
    if (ctx.apiContract.length > 0) {
        contextBlock += `\nAPI CONTRACT:\n${ctx.apiContract.join("\n")}\n`;
    }

    let archFlags = "";
    if (ctx.arch.hasAuth) archFlags += "AUTH: JWT+bcryptjs. ";
    if (ctx.arch.hasDatabase) archFlags += "DB: better-sqlite3. ";
    if (ctx.arch.hasRealtime) archFlags += "REALTIME: socket.io. ";

    return `You are SYNAPSE Engineer — generate complete production-ready code for: ${ctx.projectType}

INTERNAL REASONING (do before writing):
1. Map ALL API routes: method + path + request body + response shape
2. For each file: imports, exports, connections
3. Frontend fetch URLs MUST match backend routes EXACTLY

${STANDARDS.backendRules}

${STANDARDS.frontendRules}
${archFlags ? "\nARCHITECTURE: " + archFlags : ""}
${contextBlock}
${STANDARDS.outputFormat}

- CSS: clean, modern, responsive — scaled to project complexity
- JS: full state management, error handling, loading states, toast notifications
- NEVER generate unused utilities, CSS classes, or dead code
- NEVER add JS comments inside .json files

PROJECT PLAN:
${taskList}
FILES TO GENERATE:
${fileList}
Begin. First line: <FILE: ${tasks[0].filename}>`;
}

// ═══════════════════════════════════════════
// PHASE 5 — VALIDATION ENGINE
// ═══════════════════════════════════════════

function validateGeneratedFiles(files, tasks) {
    const issues = [];

    // 1. File completeness — every planned file must exist
    const generated = new Set(files.map(f => f.filename.toLowerCase()));
    tasks.forEach(t => {
        if (!generated.has(t.filename.toLowerCase())) {
            issues.push({ severity: "critical", file: t.filename, issue: "Planned file missing from output" });
        }
    });

    // 2. Empty/truncated files
    files.forEach(f => {
        if (!f.code || f.code.trim().length < 20) {
            issues.push({ severity: "critical", file: f.filename, issue: "Empty or truncated file" });
        }
    });

    // 3. Import validation — check require paths exist
    files.forEach(f => {
        if (!f.filename.endsWith(".js") || f.filename.startsWith("frontend/")) return;
        const requires = [...f.code.matchAll(/require\(['"]\.\/([^'"]+)['"]\)/g)];
        requires.forEach(m => {
            const reqPath = m[1].endsWith(".js") ? m[1] : m[1] + ".js";
            const resolved = resolveImportPath(f.filename, reqPath);
            if (!generated.has(resolved.toLowerCase()) && !isNodeBuiltin(reqPath)) {
                issues.push({ severity: "warning", file: f.filename, issue: `Imports non-existent: ./${m[1]}` });
            }
        });
    });

    // 4. Route mismatch — frontend fetch vs backend routes
    validateRoutes(files, issues);

    // 5. Frontend bindings — DOM IDs referenced in JS must exist in HTML
    validateFrontendBindings(files, issues);

    // 6. Placeholder detection
    detectPlaceholders(files, issues);

    // 7. JSON validity
    validateJSON(files, issues);

    // 8. Forbidden tech
    files.forEach(f => {
        if (/import React|from ['"]react|useState\(|useEffect\(|className=/.test(f.code)) {
            issues.push({ severity: "critical", file: f.filename, issue: "Contains React/JSX code" });
        }
    });

    // 9. Backend files must have module.exports (except server.js)
    files.forEach(f => {
        if (f.filename.endsWith(".js") && !f.filename.startsWith("frontend/") && f.filename !== "server.js") {
            if (!f.code.includes("module.exports")) {
                issues.push({ severity: "warning", file: f.filename, issue: "Missing module.exports" });
            }
        }
    });

    // 10. server.js checks
    const server = files.find(f => f.filename === "server.js");
    if (server) {
        if (!server.code.includes("express.static")) {
            issues.push({ severity: "critical", file: "server.js", issue: "Missing express.static" });
        }
        if (!server.code.includes(".listen(")) {
            issues.push({ severity: "critical", file: "server.js", issue: "Missing app.listen()" });
        }
        if (!server.code.includes("cors")) {
            issues.push({ severity: "warning", file: "server.js", issue: "Missing cors middleware" });
        }
    }

    return issues;
}

// ── Import path resolver ──

function resolveImportPath(fromFile, toPath) {
    const fromParts = fromFile.split("/");
    fromParts.pop(); // remove filename
    const toParts = toPath.split("/");

    const resolved = [...fromParts];
    toParts.forEach(part => {
        if (part === "..") resolved.pop();
        else if (part !== ".") resolved.push(part);
    });

    let result = resolved.join("/");
    if (!result.endsWith(".js")) result += ".js";
    return result;
}

function isNodeBuiltin(path) {
    const builtins = new Set(["path", "fs", "http", "https", "crypto", "os", "url", "stream", "events", "util", "querystring", "child_process"]);
    return builtins.has(path.split("/")[0]);
}

// ── Route validation ──

function validateRoutes(files, issues) {
    const frontendJS = files.find(f => f.filename === "frontend/app.js" || f.filename === "app.js");
    const serverFile = files.find(f => f.filename === "server.js");
    if (!frontendJS || !serverFile) return;

    // Check for hardcoded localhost
    if (/https?:\/\/localhost/.test(frontendJS.code)) {
        issues.push({ severity: "critical", file: frontendJS.filename, issue: "Hardcoded localhost in fetch URLs" });
    }
}

// ── Frontend binding validation ──

function validateFrontendBindings(files, issues) {
    const htmlFile = files.find(f => f.filename.includes("index.html"));
    const jsFile = files.find(f => f.filename === "frontend/app.js" || f.filename === "app.js");
    if (!htmlFile || !jsFile) return;

    // Extract IDs from HTML
    const htmlIds = new Set();
    const idRegex = /id=['"]([^'"]+)['"]/g;
    let m;
    while ((m = idRegex.exec(htmlFile.code)) !== null) {
        htmlIds.add(m[1]);
    }

    // Check JS getElementById calls
    const getByIdRegex = /getElementById\(['"]([^'"]+)['"]\)/g;
    while ((m = getByIdRegex.exec(jsFile.code)) !== null) {
        if (!htmlIds.has(m[1])) {
            issues.push({ severity: "warning", file: jsFile.filename, issue: `References missing DOM ID: #${m[1]}` });
        }
    }
}

// ── Placeholder detection ──

function detectPlaceholders(files, issues) {
    const patterns = [/\/\/ TODO/i, /\/\/ FIXME/i, /\/\/ implement/i, /\/\/ placeholder/i, /throw new Error\(['"]not implemented/i];
    files.forEach(f => {
        patterns.forEach(p => {
            if (p.test(f.code)) {
                issues.push({ severity: "critical", file: f.filename, issue: `Contains placeholder: ${p.source}` });
            }
        });
    });
}

// ── JSON validation ──

function validateJSON(files, issues) {
    files.forEach(f => {
        if (f.filename.endsWith(".json")) {
            try {
                JSON.parse(f.code);
            } catch (e) {
                issues.push({ severity: "critical", file: f.filename, issue: `Invalid JSON: ${e.message}` });
            }
        }
    });
}

// ═══════════════════════════════════════════
// PHASE 6 — AUTO-REPAIR ENGINE
// ═══════════════════════════════════════════

function buildRepairPrompt(brokenFiles, allFiles, issues) {
    const issueList = issues
        .filter(i => i.severity === "critical")
        .map(i => `[${i.file}] ${i.issue}`)
        .join("\n");

    // Only include broken files + files they depend on for context
    const contextFiles = allFiles
        .filter(f => {
            const isBroken = brokenFiles.some(b => b.filename === f.filename);
            const isServer = f.filename === "server.js";
            return isBroken || isServer;
        })
        .map(f => `<FILE: ${f.filename}>\n<CODE>\n${f.code}\n</CODE>\n</FILE>`)
        .join("\n\n");

    return `You are SYNAPSE Repair Agent. Fix ONLY the broken files below.

ISSUES TO FIX:
${issueList}

${STANDARDS.outputFormat}

- Output ONLY the fixed files, not all files
- Keep same filename paths
- Fix all issues listed above
- Do NOT change working logic — only fix the bugs

BROKEN FILES:
${contextFiles}

Begin. Fix each broken file.`;
}

async function repairBrokenFiles(allFiles, issues, attempt) {
    const criticalIssues = issues.filter(i => i.severity === "critical");
    if (criticalIssues.length === 0) return allFiles;

    const brokenFilenames = new Set(criticalIssues.map(i => i.file));
    const brokenFiles = allFiles.filter(f => brokenFilenames.has(f.filename));

    if (brokenFiles.length === 0) return allFiles;

    log.step("EXECUTOR", `Repair attempt ${attempt}/${MAX_REPAIR_ATTEMPTS} — fixing ${brokenFiles.length} files`);

    const prompt = buildRepairPrompt(brokenFiles, allFiles, criticalIssues);
    const raw = await callAI(prompt, { task: "execute" });

    if (!raw || raw.trim().length === 0) {
        log.warn("EXECUTOR", "Repair AI returned empty — keeping originals");
        return allFiles;
    }

    const fixedFiles = parseBatchOutput(raw);

    if (fixedFiles.length === 0) {
        log.warn("EXECUTOR", "Could not parse repair output — keeping originals");
        return allFiles;
    }

    // Merge: replace broken files with fixed versions, keep working files
    const fixedMap = new Map(fixedFiles.map(f => [f.filename.toLowerCase(), f]));
    const merged = allFiles.map(f => {
        const fix = fixedMap.get(f.filename.toLowerCase());
        return fix || f;
    });

    log.success("EXECUTOR", `Repaired ${fixedFiles.length} files: [${fixedFiles.map(f => f.filename).join(", ")}]`);
    return merged;
}

// ═══════════════════════════════════════════
// MAIN EXECUTOR — PHASED PIPELINE
// ═══════════════════════════════════════════

async function executeInPhases(tasks, ctx) {
    let allFiles = [];

    // PHASE 2: Backend generation
    log.step("EXECUTOR", `Phase 2 — Generating ${ctx.backendTasks.length} backend files...`);
    const backendPrompt = buildBackendPrompt(ctx);
    const backendRaw = await callAI(backendPrompt, { task: "execute" });

    if (!backendRaw || backendRaw.trim().length === 0) {
        log.error("EXECUTOR", "Backend generation returned empty");
        return [];
    }

    const backendFiles = parseBatchOutput(backendRaw);
    log.success("EXECUTOR", `Backend: ${backendFiles.length} files parsed`);

    if (backendFiles.length === 0) {
        log.error("EXECUTOR", "No backend files parsed");
        return [];
    }

    allFiles.push(...backendFiles);

    // PHASE 3+4: Frontend generation with backend context
    if (ctx.frontendTasks.length > 0) {
        log.step("EXECUTOR", `Phase 3+4 — Generating ${ctx.frontendTasks.length} frontend files with backend context...`);
        const frontendPrompt = buildFrontendPrompt(ctx, backendFiles);
        const frontendRaw = await callAI(frontendPrompt, { task: "execute" });

        if (!frontendRaw || frontendRaw.trim().length === 0) {
            log.warn("EXECUTOR", "Frontend generation returned empty");
        } else {
            const frontendFiles = parseBatchOutput(frontendRaw);
            log.success("EXECUTOR", `Frontend: ${frontendFiles.length} files parsed`);
            allFiles.push(...frontendFiles);
        }
    }

    return allFiles;
}

async function executeSinglePass(tasks, ctx) {
    log.step("EXECUTOR", `Single-pass — Generating all ${tasks.length} files...`);
    const prompt = buildFullPrompt(tasks, ctx);
    const raw = await callAI(prompt, { task: "execute" });

    if (!raw || raw.trim().length === 0) {
        log.error("EXECUTOR", "AI returned empty response");
        return [];
    }

    return parseBatchOutput(raw);
}

// ═══════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════

async function executorAgent(tasks) {
    log.step("EXECUTOR", `Started — ${tasks.length} tasks`);

    // Phase 1: Build execution context
    const ctx = buildExecutionContext(tasks);

    log.info("EXECUTOR", `Context: ${ctx.backendTasks.length} backend, ${ctx.frontendTasks.length} frontend, ${ctx.apiContract.length} API routes, ${ctx.entities.length} entities`);

    // Decision: phased vs single-pass
    // Phased for 8+ files (reduces hallucinations on large projects)
    // Single-pass for small projects (saves an API call)
    const usePhased = tasks.length >= 8 && ctx.backendTasks.length > 0 && ctx.frontendTasks.length > 0;

    let files;

    if (usePhased) {
        log.info("EXECUTOR", "Strategy: PHASED (backend → frontend)");
        files = await executeInPhases(tasks, ctx);
    } else {
        log.info("EXECUTOR", "Strategy: SINGLE-PASS");
        files = await executeSinglePass(tasks, ctx);
    }

    log.ai("EXECUTOR", `Generation complete: ${files.length} files`);

    if (!files.length) {
        log.error("EXECUTOR", "No files generated");
        return [];
    }

    // Phase 5: Validation
    log.step("EXECUTOR", "Phase 5 — Validating generated files...");
    let issues = validateGeneratedFiles(files, tasks);

    const criticalCount = issues.filter(i => i.severity === "critical").length;
    const warningCount = issues.filter(i => i.severity === "warning").length;

    if (issues.length > 0) {
        log.warn("EXECUTOR", `Validation: ${criticalCount} critical, ${warningCount} warnings`);
        issues.forEach(i => log.warn("EXECUTOR", `  [${i.severity}] ${i.file}: ${i.issue}`));
    } else {
        log.success("EXECUTOR", "Validation passed — no issues found");
    }

    // Phase 6: Auto-repair critical issues
    if (criticalCount > 0) {
        for (let attempt = 1; attempt <= MAX_REPAIR_ATTEMPTS; attempt++) {
            files = await repairBrokenFiles(files, issues, attempt);

            // Re-validate after repair
            issues = validateGeneratedFiles(files, tasks);
            const remainingCritical = issues.filter(i => i.severity === "critical").length;

            if (remainingCritical === 0) {
                log.success("EXECUTOR", `All critical issues resolved after ${attempt} repair(s)`);
                break;
            }

            if (attempt === MAX_REPAIR_ATTEMPTS) {
                log.warn("EXECUTOR", `${remainingCritical} critical issues remain after ${MAX_REPAIR_ATTEMPTS} repairs`);
            }
        }
    }

    // De-duplicate files (keep last occurrence which is the repaired version)
    const fileMap = new Map();
    files.forEach(f => fileMap.set(f.filename.toLowerCase(), f));
    files = [...fileMap.values()];

    log.success("EXECUTOR", `Final output: ${files.length} files → [${files.map(f => f.filename).join(", ")}]`);

    return files;
}

module.exports = executorAgent;