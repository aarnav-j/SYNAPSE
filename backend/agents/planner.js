// ─────────────────────────────────────────────
// SYNAPSE — Planner Agent
// Breaks user prompt into structured coding tasks
// Each task = exactly one file with filename
// ─────────────────────────────────────────────

const callAI = require("../services/aiservice");
const log = require("../utils/logger");

// ── Parse numbered list into task objects ──

function parsePlannerOutput(raw) {
    log.step("PLANNER", "Parsing output...");

    const tasks = raw
        .split("\n")
        .map(l => l.trim())
        .filter(l => /^\d+\.\s/.test(l))
        .map(l => l.replace(/^\d+\.\s/, ""))
        .filter(l => l.length > 5 && l.length < 150)
        .map((task, i) => ({
            step: i + 1,
            task
        }));

    log.success("PLANNER", `Parsed ${tasks.length} tasks`);

    return tasks;
}

// ── Main Planner Function ──

async function plannerAgent(prompt) {
    log.step("PLANNER", "Started...");

    const plannerPrompt = `
You are a code task planner. Output ONLY a numbered list of coding tasks.

TECH STACK (STRICT — never deviate):
- Backend: Node.js with Express only
- Frontend: React with .jsx files only
- NEVER use: PHP, Python, Laravel, Django, Flask, Java, TypeScript

FILE RULES (never break):
- Each task must produce EXACTLY one file
- Backend files MUST use .js extension
- Frontend (React) files MUST use .jsx extension (e.g. App.jsx, index.jsx). NEVER use .js for React.
- Each task must include the exact filename with extension
- Each task must be 12 words or fewer
- Output 6 to 8 tasks total — enough to cover a full working project
- Tasks must cover: entry point, routes, middleware, data layer, and UI components

FORMAT RULES (never break):
- Every line starts with: number, period, space → "1. "
- No explanations. No headers. No blank lines. No comments.
- No bullet points, dashes, asterisks, or "Step" prefix
- No design tasks, no testing tasks, no install tasks

BAD OUTPUT (never produce this):
- Set up the project
- Design the UI
// Step 1
* Install packages
1. Create backend (missing filename)
1. Create server.js and routes.js (two files — not allowed)

GOOD OUTPUT (always produce this):
1. Create server.js with Express app listening on port 3000
2. Create routes/videos.js with GET and POST route handlers
3. Create middleware/upload.js with multer disk storage config
4. Create models/videoModel.js with in-memory video data store
5. Create App.jsx fetching /videos and rendering video list
6. Create components/VideoPlayer.jsx rendering HTML5 video element
7. Create components/UploadForm.jsx with file input and POST handler
8. Create index.jsx as React entry point rendering App into root div

Now output the task list for this project. Follow ALL rules above exactly.
Project: ${prompt}
`;

    const raw = await callAI(plannerPrompt);

    log.ai("PLANNER", "Raw output received");

    if (!raw || raw.trim().length === 0) {
        log.error("PLANNER", "AI returned empty response");
        return [{ step: 1, task: "Create server.js with Express app on port 3000" }];
    }

    const tasks = parsePlannerOutput(raw);

    if (!tasks.length) {
        log.warn("PLANNER", "Parsing failed — using fallback task");

        return [
            { step: 1, task: "Create server.js with Express app on port 3000" }
        ];
    }

    return tasks;
}

module.exports = plannerAgent;