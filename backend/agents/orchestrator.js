// ─────────────────────────────────────────────
// SYNAPSE — Orchestrator (Pipeline Controller)
// Finite State Machine controlling the full flow
// PLANNING → QUEUING → (Worker: EXECUTING → REVIEWING → COMPLETED)
// ─────────────────────────────────────────────

const plannerAgent = require("./planner");
const { queueTasks } = require("../utils/queue");
const { saveRun } = require("../utils/memory");
const log = require("../utils/logger");

// ── State Constants ──

const STATES = {
    CREATED: "CREATED",
    PLANNING: "PLANNING",
    QUEUED: "QUEUED",
    FAILED: "FAILED"
};

// ── Main Orchestrator ──

async function run(prompt) {
    let state = STATES.CREATED;
    let tasks = [];
    
    // Generate a clean project name from the prompt (e.g. "Build a todo app" -> "build_a_todo_app")
    const projectName = prompt
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 30); // Max 30 chars

    log.info("ORCHESTRATOR", `Received prompt: "${prompt}" -> Project: "${projectName}"`);

    try {
        // ── Step 1: PLANNING ──

        state = STATES.PLANNING;
        log.step("ORCHESTRATOR", "State → PLANNING");

        tasks = await plannerAgent(prompt);

        if (!tasks || tasks.length === 0) {
            throw new Error("Planner returned no tasks");
        }

        log.success("ORCHESTRATOR", `Planner produced ${tasks.length} tasks`);

        // ── Step 2: QUEUING ──

        state = STATES.QUEUED;
        log.step("ORCHESTRATOR", "State → QUEUING");

        // Save initial memory state
        const runId = saveRun({
            prompt,
            projectName,
            tasks,
            status: "WAITING",
            files: []
        });

        // Add to Redis queue
        await queueTasks(prompt, projectName, tasks, runId);

        log.success("ORCHESTRATOR", `Job added to queue! (run: ${runId})`);

        return {
            success: true,
            state,
            runId,
            projectName,
            tasksCount: tasks.length,
            message: "Tasks planned and queued for execution. Check /history endpoint for status.",
            tasks: tasks.map(t => t.task)
        };

    } catch (err) {
        state = STATES.FAILED;
        log.error("ORCHESTRATOR", `State → FAILED at ${state}: ${err.message}`);

        saveRun({
            prompt,
            projectName,
            tasks,
            status: STATES.FAILED,
            files: [],
            errors: [err.message]
        });

        return {
            success: false,
            state,
            error: err.message,
            tasksCount: tasks.length
        };
    }
}

module.exports = { run };
