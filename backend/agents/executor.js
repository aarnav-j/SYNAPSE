// ─────────────────────────────────────────────
// SYNAPSE — Executor Agent (Batch Mode)
// Generates all project files in a single AI call
// Uses <FILE> tag format for machine parsing
// ─────────────────────────────────────────────

const { callAI } = require("../services/aiRouter");
const { parseBatchOutput } = require("../utils/parser");
const log = require("../utils/logger");

// ── Build Batch Prompt ──

function buildBatchExecutorPrompt(plan) {
    log.step("EXECUTOR", "Building batch prompt...");

    let taskList = "";
    let fileList = "";

    plan.forEach((p) => {
        taskList += `[FILE: ${p.filename}]\nTASK: ${p.task}\n\n`;
        fileList += `- ${p.filename}\n`;
    });

    return `
You are a code generation engine. You generate complete source code for multiple files in one response.

RULES:
1. STRICT QUALITY: Output MUST be perfectly working code. Absolutely NO syntax errors, NO logical errors, NO missing variables, NO missing routes, and NO missing files.
2. NO PLACEHOLDERS: Do NOT use placeholders, "TODO", or "insert code here". Implement every single line of logic perfectly.
3. Use Node.js + Express for backend files (.js).
4. Use Vanilla HTML, CSS, and JavaScript for frontend files (.html, .css, .js). DO NOT USE REACT.
5. In your Express \`server.js\`, you MUST serve the frontend folder statically using: \`app.use(express.static(require('path').join(__dirname, '../frontend')));\`
   For that you have to import path module at the beginning of server.js as: \`const path = require('path');\`
6. The frontend JavaScript must use \`fetch('/api/...')\` or \`fetch('/...')\` depending on how the backend routes are defined. Ensure the frontend fetch URLs EXACTLY match the backend Express routes.
7. Wrap each file in exactly this format:

OUTPUT FORMAT (follow exactly — this is machine-parsed):

<FILE: filename.ext>
<EXPLANATION>
Short explanation of what this file does
</EXPLANATION>
<CODE>
full working code here
</CODE>
</FILE>

CRITICAL FORMAT RULES:
- Start EVERY file block with <FILE: filename> on its own line
- End EVERY file block with </FILE> on its own line
- filename must exactly match the task's specified filename
- Output ALL files listed. Do not skip any.
- Output files in the same order as the task list.
- Do NOT write anything outside <FILE> blocks. No preamble. No summary.
- Do NOT use markdown, backticks, or code fences anywhere.

CODE QUALITY RULES:
- Every file must be complete and runnable without modification
- No TODOs or placeholders
- All backend imports must be valid (e.g. express, cors) and assume they are in package.json
- Backend files (.js) MUST use require() and module.exports.
- Frontend files MUST be standard HTML, CSS, and Vanilla JS.
- Do NOT mix up filenames. Double check you are writing the correct code for the correct <FILE: name> tag.
- Include proper error handling in all files
- Use consistent coding style across all files

FULL PROJECT PLAN:
${taskList}

FILES TO GENERATE:
${fileList}

Begin output now.
First line must be: <FILE: ${plan[0].filename}>
`;
}

// ── Main Executor Function ──

async function executorAgent(tasks) {
    log.step("EXECUTOR", `Started (BATCH MODE) — ${tasks.length} tasks`);

    const prompt = buildBatchExecutorPrompt(tasks);

    log.ai("EXECUTOR", "Sending batch request to AI...");

    const raw = await callAI(prompt, { task: "execute" });

    if (!raw || raw.trim().length === 0) {
        log.error("EXECUTOR", "AI returned empty response");
        return [];
    }

    log.ai("EXECUTOR", `Response received (${raw.length} chars)`);

    const files = parseBatchOutput(raw);

    log.success("EXECUTOR", `Parsed ${files.length} files: [${files.map(f => f.filename).join(", ")}]`);

    if (!files.length) {
        log.error("EXECUTOR", "No files parsed — output format might be wrong");
    }

    return files;
}

module.exports = executorAgent;