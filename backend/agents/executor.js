// ─────────────────────────────────────────────
// SYNAPSE — Executor Agent (Batch Mode)
// Generates all project files in a single AI call
// Uses <FILE> tag format for machine parsing
// ─────────────────────────────────────────────

const callAI = require("../services/aiservice");
const { parseBatchOutput } = require("../utils/parser");
const log = require("../utils/logger");

// ── Extract filename from task text ──

function extractFilename(task) {
    const match = task.match(/[\w/]+\.(js|jsx)/i);
    return match ? match[0] : "unknown.js";
}

// ── Build the batch prompt for all tasks ──

function buildBatchExecutorPrompt(plan) {
    log.step("EXECUTOR", "Building batch prompt...");

    const taskList = plan.map((t, i) => `${i + 1}. ${t.task}`).join("\n");
    const fileList = plan.map((t, i) => `${i + 1}. ${extractFilename(t.task)}`).join("\n");

    return `
You are a code generation engine. You generate complete source code for multiple files in one response.

TECH STACK:
- Backend files (.js without .jsx): Node.js and Express only
- Frontend files (.jsx): React functional components only
- No TypeScript. No PHP. No Python. No class components.

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
- Backend files (.js) MUST use require() and module.exports. NEVER put React code in a .js file!
- React files (.jsx) MUST use import/export functional components with hooks. NEVER put backend logic in a .jsx file!
- Do NOT mix up filenames. Double check you are writing the correct code for the correct <FILE> tag.
- Include proper error handling in all files
- Use consistent coding style across all files

FULL PROJECT PLAN:
${taskList}

FILES TO GENERATE:
${fileList}

Begin output now.
First line must be: <FILE: ${extractFilename(plan[0].task)}>
`;
}

// ── Main Executor Function ──

async function executorAgent(tasks) {
    log.step("EXECUTOR", `Started (BATCH MODE) — ${tasks.length} tasks`);

    const prompt = buildBatchExecutorPrompt(tasks);

    log.ai("EXECUTOR", "Sending batch request to AI...");

    const raw = await callAI(prompt);

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