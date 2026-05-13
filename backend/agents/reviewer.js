// ─────────────────────────────────────────────
// SYNAPSE — Reviewer Agent (Production v2)
// 6-stage validation pipeline + targeted AI repair
// Token-efficient: AI only for critical failures
// ─────────────────────────────────────────────

const { callAI } = require("../services/aiRouter");
const { parseBatchOutput } = require("../utils/parser");
const log = require("../utils/logger");

const MAX_REPAIR_ATTEMPTS = 1;
const SEVERITY = { CRITICAL: "critical", WARNING: "warning", INFO: "info" };

// ═══════════════════════════════════════════
// STAGE 1 — FILE STRUCTURE VALIDATION
// ═══════════════════════════════════════════

function validateStructure(tasks, files, issues) {
    if (files.length === 0) {
        issues.push({ severity: SEVERITY.CRITICAL, file: "*", msg: "No files generated" });
        return;
    }

    // Empty / truncated files
    files.forEach(f => {
        if (!f.code || f.code.trim().length < 20) {
            issues.push({ severity: SEVERITY.CRITICAL, file: f.filename, msg: "Empty or truncated file" });
        }
    });

    // Missing planned files
    const generated = new Set(files.map(f => f.filename.toLowerCase()));
    tasks.forEach(t => {
        const fn = t.filename ? t.filename.toLowerCase() : null;
        if (fn && !generated.has(fn)) {
            issues.push({ severity: SEVERITY.CRITICAL, file: t.filename, msg: "Planned file missing from output" });
        }
    });

    // Duplicate filenames
    const seen = new Set();
    files.forEach(f => {
        const key = f.filename.toLowerCase();
        if (seen.has(key)) {
            issues.push({ severity: SEVERITY.WARNING, file: f.filename, msg: "Duplicate filename" });
        }
        seen.add(key);
    });

    // server.js must exist
    if (!generated.has("server.js")) {
        issues.push({ severity: SEVERITY.CRITICAL, file: "server.js", msg: "server.js missing" });
    }
}

// ═══════════════════════════════════════════
// STAGE 2 — STATIC CODE ANALYSIS
// ═══════════════════════════════════════════

function validateImports(files, issues) {
    const generated = new Set(files.map(f => f.filename.toLowerCase()));

    files.forEach(f => {
        if (!f.filename.endsWith(".js") || f.filename.startsWith("frontend/")) return;
        const reqs = [...f.code.matchAll(/require\(['"]\.\/([^'"]+)['"]\)/g)];
        reqs.forEach(m => {
            const reqPath = m[1].endsWith(".js") ? m[1] : m[1] + ".js";
            const resolved = resolveImport(f.filename, reqPath);
            if (!generated.has(resolved.toLowerCase()) && !isBuiltin(m[1])) {
                issues.push({ severity: SEVERITY.CRITICAL, file: f.filename, msg: `Broken import: ./${m[1]}` });
            }
        });
    });
}

function validateExports(files, issues) {
    files.forEach(f => {
        if (!f.filename.endsWith(".js") || f.filename.startsWith("frontend/")) return;
        const isEntry = f.filename === "server.js" || f.filename === "index.js";
        if (!isEntry && !f.code.includes("module.exports")) {
            issues.push({ severity: SEVERITY.WARNING, file: f.filename, msg: "Missing module.exports" });
        }
    });
}

function validateRoutes(files, issues) {
    const server = files.find(f => f.filename === "server.js");
    if (!server) return;

    if (!server.code.includes("express.static")) {
        issues.push({ severity: SEVERITY.CRITICAL, file: "server.js", msg: "Missing express.static" });
    }
    if (!/express\.json\s*\(/.test(server.code)) {
        issues.push({ severity: SEVERITY.CRITICAL, file: "server.js", msg: "Missing express.json()" });
    }
    if (!server.code.includes("cors")) {
        issues.push({ severity: SEVERITY.WARNING, file: "server.js", msg: "Missing cors middleware" });
    }
    if (!server.code.includes(".listen(")) {
        issues.push({ severity: SEVERITY.CRITICAL, file: "server.js", msg: "Missing app.listen()" });
    }

    // Check route files have router
    files.forEach(f => {
        if (f.filename.startsWith("routes/") && f.filename.endsWith(".js")) {
            if (!f.code.includes("express.Router") && !f.code.includes("Router()")) {
                issues.push({ severity: SEVERITY.WARNING, file: f.filename, msg: "Route file missing express.Router()" });
            }
        }
    });
}

function validateAsyncSafety(files, issues) {
    files.forEach(f => {
        if (!f.filename.startsWith("routes/") || !f.filename.endsWith(".js")) return;
        if (f.code.includes("async") && !f.code.includes("try")) {
            issues.push({ severity: SEVERITY.CRITICAL, file: f.filename, msg: "Async handlers without try/catch" });
        }
    });
}

function validateHTML(files, issues) {
    const html = files.find(f => f.filename.includes("index.html"));
    if (!html) return;

    if (!html.code.includes("viewport")) {
        issues.push({ severity: SEVERITY.WARNING, file: html.filename, msg: "Missing viewport meta" });
    }
    if (!html.code.includes("style.css")) {
        issues.push({ severity: SEVERITY.CRITICAL, file: html.filename, msg: "Missing style.css link" });
    }
    if (!html.code.includes("app.js")) {
        issues.push({ severity: SEVERITY.CRITICAL, file: html.filename, msg: "Missing app.js script" });
    }
}

function validateCSS(files, issues) {
    const css = files.find(f => f.filename.includes("style.css"));
    if (!css) return;

    if (!css.code.includes(":root")) {
        issues.push({ severity: SEVERITY.WARNING, file: css.filename, msg: "Missing :root CSS variables" });
    }
    if (!css.code.includes("@media")) {
        issues.push({ severity: SEVERITY.WARNING, file: css.filename, msg: "Missing responsive breakpoints" });
    }
}

function validateJSON(files, issues) {
    files.forEach(f => {
        if (!f.filename.endsWith(".json")) return;
        try {
            JSON.parse(f.code);
        } catch (e) {
            issues.push({ severity: SEVERITY.CRITICAL, file: f.filename, msg: `Invalid JSON: ${e.message}` });
        }
    });
}

// ═══════════════════════════════════════════
// STAGE 3 — ARCHITECTURE CONSISTENCY
// ═══════════════════════════════════════════

function detectFrontendBackendMismatch(files, issues) {
    const frontJS = files.find(f => f.filename === "frontend/app.js" || f.filename === "app.js");
    const server = files.find(f => f.filename === "server.js");
    if (!frontJS || !server) return;

    // Hardcoded localhost
    if (/https?:\/\/localhost/.test(frontJS.code)) {
        issues.push({ severity: SEVERITY.CRITICAL, file: frontJS.filename, msg: "Hardcoded localhost in fetch URLs" });
    }

    // Extract mounted API paths from server.js
    const mountRegex = /app\.use\(['"]([^'"]+)['"]/g;
    const apiPaths = [];
    let m;
    while ((m = mountRegex.exec(server.code)) !== null) {
        const p = m[1];
        if (!p.includes("static") && !p.includes("json") && !p.includes("cors") && !p.includes("cookie")) {
            apiPaths.push(p);
        }
    }

    // Extract fetch URLs from frontend
    const fetchRegex = /fetch\s*\(\s*[`'"](\/[^`'"]*)[`'"]/g;
    const fetchUrls = [];
    while ((m = fetchRegex.exec(frontJS.code)) !== null) {
        fetchUrls.push(m[1]);
    }

    // Also check template literal fetches
    const tplFetchRegex = /fetch\s*\(\s*`([^`]*)`/g;
    while ((m = tplFetchRegex.exec(frontJS.code)) !== null) {
        const url = m[1].replace(/\$\{[^}]+\}/g, ":param");
        if (url.startsWith("/")) fetchUrls.push(url);
    }

    // Check if fetch URLs have a matching API mount prefix
    if (apiPaths.length > 0 && fetchUrls.length > 0) {
        fetchUrls.forEach(url => {
            const hasMatch = apiPaths.some(ap => url.startsWith(ap));
            if (!hasMatch && url.startsWith("/api")) {
                issues.push({ severity: SEVERITY.WARNING, file: frontJS.filename, msg: `Fetch URL may not match backend: ${url}` });
            }
        });
    }
}

function validateResponseFormats(files, issues) {
    files.forEach(f => {
        if (!f.filename.startsWith("routes/") || !f.filename.endsWith(".js")) return;
        // Check POST/PUT routes have input validation
        const hasMutations = /router\.(post|put|patch)\s*\(/.test(f.code);
        if (hasMutations) {
            const hasValidation = /if\s*\(!/.test(f.code) || /!.*\.trim\(\)/.test(f.code) || /express-validator/.test(f.code) || /\.body\./.test(f.code);
            if (!hasValidation) {
                issues.push({ severity: SEVERITY.WARNING, file: f.filename, msg: "POST/PUT handlers may lack input validation" });
            }
        }
    });
}

function validateAuthFlow(files, issues) {
    const server = files.find(f => f.filename === "server.js");
    const authMiddleware = files.find(f => f.filename.includes("middleware/auth"));
    if (!authMiddleware) return;

    // Check auth middleware exports something
    if (!authMiddleware.code.includes("module.exports")) {
        issues.push({ severity: SEVERITY.CRITICAL, file: authMiddleware.filename, msg: "Auth middleware missing module.exports" });
    }

    // Check JWT usage consistency
    const usesJWT = files.some(f => f.code.includes("jsonwebtoken"));
    if (usesJWT) {
        const hasSecret = files.some(f => f.code.includes("JWT_SECRET") || f.code.includes("jwt_secret") || f.code.includes("process.env.SECRET"));
        if (!hasSecret) {
            issues.push({ severity: SEVERITY.WARNING, file: "auth", msg: "JWT used but no secret env variable found" });
        }
    }
}

// ═══════════════════════════════════════════
// STAGE 4 — PLACEHOLDER & HALLUCINATION
// ═══════════════════════════════════════════

function detectPlaceholders(files, issues) {
    const patterns = [
        { regex: /\/\/ TODO/i, label: "TODO comment" },
        { regex: /\/\/ FIXME/i, label: "FIXME comment" },
        { regex: /\/\/ implement/i, label: "Unimplemented marker" },
        { regex: /\/\/ placeholder/i, label: "Placeholder marker" },
        { regex: /throw new Error\(['"]not implemented/i, label: "Not-implemented throw" },
        { regex: /\/\/ add .* here/i, label: "Incomplete stub" }
    ];

    files.forEach(f => {
        patterns.forEach(p => {
            if (p.regex.test(f.code)) {
                issues.push({ severity: SEVERITY.CRITICAL, file: f.filename, msg: `Placeholder: ${p.label}` });
            }
        });
    });
}

function detectHallucinations(files, issues) {
    files.forEach(f => {
        // React/Vue/Angular contamination
        if (/import React|from ['"]react|useState\(|useEffect\(|className=/.test(f.code)) {
            issues.push({ severity: SEVERITY.CRITICAL, file: f.filename, msg: "React/JSX contamination" });
        }
        if (/from ['"]vue|createApp\(/.test(f.code) && !f.filename.includes("frontend/")) {
            issues.push({ severity: SEVERITY.CRITICAL, file: f.filename, msg: "Vue contamination" });
        }
        // TypeScript
        if (/:\s*(string|number|boolean|void)\s*[;=,)]/.test(f.code) && f.filename.endsWith(".js")) {
            issues.push({ severity: SEVERITY.WARNING, file: f.filename, msg: "Possible TypeScript syntax in .js file" });
        }
    });
}

function detectDeadCode(files, issues) {
    files.forEach(f => {
        if (!f.filename.endsWith(".js") || f.filename.startsWith("frontend/")) return;
        // Functions defined but never called in same file (lightweight check)
        const funcDefs = [...f.code.matchAll(/function\s+(\w+)\s*\(/g)].map(m => m[1]);
        funcDefs.forEach(fn => {
            if (fn === "module" || fn === "exports") return;
            const usages = f.code.split(fn).length - 1;
            // If only appears once (the definition), likely dead code
            if (usages === 1 && !f.code.includes(`module.exports`) ) {
                // Only flag if function is not exported
                const exportBlock = f.code.match(/module\.exports\s*=\s*\{([^}]+)\}/);
                if (exportBlock && !exportBlock[1].includes(fn)) {
                    issues.push({ severity: SEVERITY.INFO, file: f.filename, msg: `Possibly unused function: ${fn}` });
                }
            }
        });
    });
}

// ═══════════════════════════════════════════
// STAGE 5 — RUNTIME RISK ANALYSIS
// ═══════════════════════════════════════════

function detectRuntimeRisks(files, issues) {
    files.forEach(f => {
        if (!f.filename.endsWith(".js")) return;

        // Missing await on async calls in route handlers
        if (f.filename.startsWith("routes/")) {
            const asyncCalls = [...f.code.matchAll(/(?<!await\s)(bcrypt\.hash|bcrypt\.compare|jwt\.sign|jwt\.verify)\(/g)];
            asyncCalls.forEach(m => {
                if (m[1].includes("bcrypt")) {
                    issues.push({ severity: SEVERITY.WARNING, file: f.filename, msg: `Possibly missing await on ${m[1]}` });
                }
            });
        }

        // Frontend: querySelector on potentially null elements
        if (f.filename.startsWith("frontend/") && f.filename.endsWith(".js")) {
            const qsMatches = [...f.code.matchAll(/(?:querySelector|getElementById)\s*\([^)]+\)\s*\./g)];
            // This is a lightweight heuristic — just flag if many direct chains without null checks
            if (qsMatches.length > 10) {
                const hasNullChecks = (f.code.match(/if\s*\(\s*\w+\s*\)/g) || []).length;
                if (hasNullChecks < qsMatches.length / 3) {
                    issues.push({ severity: SEVERITY.INFO, file: f.filename, msg: "Many DOM queries without null checks" });
                }
            }
        }
    });
}

function validateFrontendBindings(files, issues) {
    const html = files.find(f => f.filename.includes("index.html"));
    const js = files.find(f => f.filename === "frontend/app.js" || f.filename === "app.js");
    if (!html || !js) return;

    // Extract IDs from HTML
    const htmlIds = new Set();
    let m;
    const idRegex = /id=['"]([^'"]+)['"]/g;
    while ((m = idRegex.exec(html.code)) !== null) htmlIds.add(m[1]);

    // Check JS getElementById references
    const refRegex = /getElementById\(['"]([^'"]+)['"]\)/g;
    while ((m = refRegex.exec(js.code)) !== null) {
        if (!htmlIds.has(m[1])) {
            issues.push({ severity: SEVERITY.WARNING, file: js.filename, msg: `References missing DOM ID: #${m[1]}` });
        }
    }
}

function validateDependencies(files, issues) {
    const allowed = new Set([
        "express", "cors", "dotenv", "bcryptjs", "jsonwebtoken",
        "multer", "express-validator", "socket.io", "better-sqlite3",
        "path", "fs", "http", "https", "crypto", "os", "url", "stream",
        "events", "util", "querystring", "child_process"
    ]);

    files.forEach(f => {
        if (!f.filename.endsWith(".js") || f.filename.startsWith("frontend/")) return;
        const reqs = [...f.code.matchAll(/require\(['"]([^./][^'"]*)['"]\)/g)];
        reqs.forEach(m => {
            const pkg = m[1].split("/")[0];
            if (!allowed.has(pkg)) {
                issues.push({ severity: SEVERITY.WARNING, file: f.filename, msg: `Possibly hallucinated dependency: ${pkg}` });
            }
        });
    });
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function resolveImport(fromFile, toPath) {
    const parts = fromFile.split("/");
    parts.pop();
    toPath.split("/").forEach(seg => {
        if (seg === "..") parts.pop();
        else if (seg !== ".") parts.push(seg);
    });
    let result = parts.join("/");
    if (!result.endsWith(".js")) result += ".js";
    return result;
}

function isBuiltin(p) {
    const builtins = new Set(["path", "fs", "http", "https", "crypto", "os", "url", "stream", "events", "util"]);
    return builtins.has(p.split("/")[0]);
}

// ═══════════════════════════════════════════
// STAGE 6 — TARGETED AI REPAIR
// ═══════════════════════════════════════════

function buildRepairPrompt(brokenFiles, allFiles, criticalIssues) {
    const issueList = criticalIssues.map(i => `[${i.file}] ${i.msg}`).join("\n");

    // Send only broken files + server.js for context
    const filesToSend = [];
    const brokenNames = new Set(brokenFiles.map(f => f.filename));

    allFiles.forEach(f => {
        if (brokenNames.has(f.filename) || f.filename === "server.js") {
            filesToSend.push(f);
        }
    });

    const fileBlocks = filesToSend.map(f =>
        `<FILE: ${f.filename}>\n<CODE>\n${f.code}\n</CODE>\n</FILE>`
    ).join("\n\n");

    return `You are SYNAPSE Repair Agent. Fix ONLY the issues listed below.

CRITICAL ISSUES:
${issueList}

RULES:
- Fix every issue listed
- Output ONLY the fixed files using <FILE>/<CODE> tags
- Do NOT output unchanged files
- Every <CODE> block = valid source code only
- No markdown, no backticks, no explanations outside tags
- No TODOs, no placeholders
- No JS comments inside .json files

OUTPUT FORMAT:
<FILE: filename.ext>
<EXPLANATION>
What was fixed.
</EXPLANATION>
<CODE>
fixed source code
</CODE>
</FILE>

FILES TO REPAIR:
${fileBlocks}

Begin repairs now.`;
}

function verifyCodeQuality(fixedFiles) {
    return fixedFiles.every(f => {
        const first = f.code.split("\n")[0].trim();
        return /^(const |let |var |import |require|function |\/\/|\/\*|export |'use |"use |<!DOCTYPE|<html|\*|@|:root|body|\.|#|\{)/.test(first);
    });
}

// ═══════════════════════════════════════════
// MAIN REVIEW PIPELINE
// ═══════════════════════════════════════════

async function reviewerAgent(tasks, files) {
    log.step("REVIEWER", "Starting 6-stage validation pipeline...");
    const issues = [];

    // Stage 1: Structure
    log.step("REVIEWER", "Stage 1 — File structure validation");
    validateStructure(tasks, files, issues);
    const s1Critical = issues.filter(i => i.severity === SEVERITY.CRITICAL).length;
    if (s1Critical > 0) log.warn("REVIEWER", `Stage 1: ${s1Critical} critical structure issues`);

    // Stage 2: Static analysis
    log.step("REVIEWER", "Stage 2 — Static code analysis");
    validateImports(files, issues);
    validateExports(files, issues);
    validateRoutes(files, issues);
    validateAsyncSafety(files, issues);
    validateHTML(files, issues);
    validateCSS(files, issues);
    validateJSON(files, issues);

    // Stage 3: Architecture consistency
    log.step("REVIEWER", "Stage 3 — Architecture consistency");
    detectFrontendBackendMismatch(files, issues);
    validateResponseFormats(files, issues);
    validateAuthFlow(files, issues);

    // Stage 4: Placeholders & hallucinations
    log.step("REVIEWER", "Stage 4 — Placeholder & hallucination detection");
    detectPlaceholders(files, issues);
    detectHallucinations(files, issues);
    detectDeadCode(files, issues);

    // Stage 5: Runtime risks
    log.step("REVIEWER", "Stage 5 — Runtime risk analysis");
    detectRuntimeRisks(files, issues);
    validateFrontendBindings(files, issues);
    validateDependencies(files, issues);

    // Classify results
    const critical = issues.filter(i => i.severity === SEVERITY.CRITICAL);
    const warnings = issues.filter(i => i.severity === SEVERITY.WARNING);
    const infos = issues.filter(i => i.severity === SEVERITY.INFO);

    log.info("REVIEWER", `Results: ${critical.length} critical, ${warnings.length} warnings, ${infos.length} info`);

    if (issues.length === 0) {
        log.success("REVIEWER", "All validation stages passed — code is clean (no AI call needed)");
        return { files, reviewed: true, issues: [] };
    }

    // Log all issues
    critical.forEach(i => log.error("REVIEWER", `  [CRITICAL] ${i.file}: ${i.msg}`));
    warnings.forEach(i => log.warn("REVIEWER", `  [WARNING] ${i.file}: ${i.msg}`));

    // TOKEN SAVING: Only call AI for critical issues
    if (critical.length === 0) {
        log.info("REVIEWER", "No critical issues — skipping AI repair to save tokens");
        return { files, reviewed: true, issues: warnings.map(i => `${i.file}: ${i.msg}`) };
    }

    // Stage 6: Targeted AI repair
    log.step("REVIEWER", `Stage 6 — AI repair for ${critical.length} critical issues`);

    const brokenFilenames = new Set(critical.map(i => i.file));
    const brokenFiles = files.filter(f => brokenFilenames.has(f.filename));

    if (brokenFiles.length === 0) {
        log.warn("REVIEWER", "Could not isolate broken files — keeping originals");
        return { files, reviewed: true, issues: issues.map(i => `[${i.severity}] ${i.file}: ${i.msg}`) };
    }

    log.info("REVIEWER", `Sending ${brokenFiles.length}/${files.length} files for repair (saving ${files.length - brokenFiles.length} clean files)`);

    let repairedFiles = files;

    for (let attempt = 1; attempt <= MAX_REPAIR_ATTEMPTS; attempt++) {
        log.step("REVIEWER", `Repair attempt ${attempt}/${MAX_REPAIR_ATTEMPTS}...`);

        const prompt = buildRepairPrompt(brokenFiles, repairedFiles, critical);
        const raw = await callAI(prompt, { task: "review" });

        if (!raw || raw.trim().length === 0) {
            log.error("REVIEWER", "AI returned empty — keeping originals");
            break;
        }

        const fixedFiles = parseBatchOutput(raw);

        if (fixedFiles.length === 0) {
            log.error("REVIEWER", "Could not parse repair output — keeping originals");
            break;
        }

        // Verify AI returned real code
        if (!verifyCodeQuality(fixedFiles)) {
            log.warn("REVIEWER", "AI returned non-code content — keeping originals");
            break;
        }

        // Merge: replace only repaired files, keep working ones
        const fixedMap = new Map(fixedFiles.map(f => [f.filename.toLowerCase(), f]));
        repairedFiles = repairedFiles.map(f => {
            const fix = fixedMap.get(f.filename.toLowerCase());
            return fix || f;
        });

        log.success("REVIEWER", `Repaired ${fixedFiles.length} files: [${fixedFiles.map(f => f.filename).join(", ")}]`);
    }

    // Final issue list for downstream
    const allIssueStrings = issues.map(i => `[${i.severity}] ${i.file}: ${i.msg}`);

    log.success("REVIEWER", `Review complete — ${files.length} files processed`);

    return { files: repairedFiles, reviewed: true, issues: allIssueStrings };
}

module.exports = reviewerAgent;
