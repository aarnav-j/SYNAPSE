// ─────────────────────────────────────────────
// SYNAPSE — Orchestrator (Pipeline Controller)
// Finite State Machine controlling the full flow
// PLANNING → QUEUING → (Worker: EXECUTING → REVIEWING → COMPLETED)
// Now writes every step to MySQL database
// ─────────────────────────────────────────────

const plannerAgent = require("./planner");
const { queueTasks } = require("../utils/queue");
const { saveRun } = require("../utils/memory");
const db = require("../database/connection");
const log = require("../utils/logger");

// ── State Constants ──

const STATES = {
    CREATED: "CREATED",
    PLANNING: "PLANNING",
    QUEUED: "QUEUED",
    FAILED: "FAILED"
};

// ── Main Orchestrator ──

async function run(prompt, userId) {
    let state = STATES.CREATED;
    let tasks = [];
    let projectDbId = null;

    // Generate a clean project name from the prompt
    const projectName = prompt
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 30);

    log.info("ORCHESTRATOR", `Received prompt: "${prompt}" → Project: "${projectName}"`);

    try {
        // ── Step 1: PLANNING ──

        state = STATES.PLANNING;
        log.step("ORCHESTRATOR", "State → PLANNING");

        const planStart = Date.now();

        tasks = await plannerAgent(prompt);

        if (!tasks || tasks.length === 0) {
            throw new Error("Planner returned no tasks");
        }

        log.success("ORCHESTRATOR", `Planner produced ${tasks.length} tasks`);

        // ── Step 2: QUEUING ──

        state = STATES.QUEUED;
        log.step("ORCHESTRATOR", "State → QUEUING");

        // Save to JSON memory (backward compatible)
        const runId = saveRun({
            prompt,
            projectName,
            tasks,
            status: "WAITING",
            files: []
        });

        // Save to MySQL database
        const outputPath = `output/${projectName}`;

        try {
            projectDbId = await db.createProject({
                userId,
                runId,
                projectName,
                prompt,
                status: "WAITING",
                outputPath
            });

            // Log the PLANNING step
            await db.logPipelineStep({
                projectId: projectDbId,
                stepName: "PLANNING",
                stepStatus: "COMPLETED",
                inputData: { prompt },
                outputData: { tasksCount: tasks.length, tasks: tasks.map(t => t.task) },
                durationMs: Date.now() - planStart
            });

            log.success("DATABASE", `Project saved to DB (ID: ${projectDbId})`);
        } catch (dbErr) {
            log.warn("DATABASE", `DB write failed (non-fatal): ${dbErr.message}`);
            // Pipeline continues even if DB fails — JSON memory is the fallback
        }

        // Add to Redis queue — pass DB project ID along
        await queueTasks(prompt, projectName, tasks, runId, userId, projectDbId);

        log.success("ORCHESTRATOR", `Job added to queue! (run: ${runId})`);

        return {
            success: true,
            state,
            runId,
            projectName,
            projectDbId,
            tasksCount: tasks.length,
            message: "Tasks planned and queued for execution. Check /history endpoint for status.",
            tasks: tasks.map(t => t.task)
        };

    } catch (err) {
        state = STATES.FAILED;
        log.error("ORCHESTRATOR", `State → FAILED: ${err.message}`);

        saveRun({
            prompt,
            projectName,
            tasks,
            status: STATES.FAILED,
            files: [],
            errors: [err.message]
        });

        // Also update DB if project was created
        if (projectDbId) {
            try {
                await db.updateProjectStatus(null, "FAILED");
            } catch (_) { /* silent */ }
        }

        return {
            success: false,
            state,
            error: err.message,
            tasksCount: tasks.length
        };
    }
}

module.exports = { run };
