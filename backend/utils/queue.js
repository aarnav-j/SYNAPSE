// ─────────────────────────────────────────────
// SYNAPSE — Redis Queue System (BullMQ)
// Manages task execution asynchronously
// ─────────────────────────────────────────────

const { Queue, Worker } = require("bullmq");
const IORedis = require("ioredis");
const executorAgent = require("../agents/executor");
const reviewerAgent = require("../agents/reviewer");
const { saveFile, saveDocs } = require("./fileManager");
const { saveRun, getRunById } = require("./memory");
const log = require("./logger");

// ── Redis Connection ──

const connection = new IORedis({
    host: "127.0.0.1",
    port: 6379,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
        if (times > 3) {
            log.error("QUEUE", "Cannot connect to Redis. Is it running?");
            return null; // Stop retrying
        }
        return Math.min(times * 500, 2000);
    }
});

// ── Initialize Queue ──

const taskQueue = new Queue("synapse-tasks", { connection });

// ── Add Job to Queue ──

async function queueTasks(prompt, projectName, tasks, runId) {
    log.info("QUEUE", `Adding job to queue for run: ${runId} (Project: ${projectName})`);
    
    await taskQueue.add("process-project", {
        prompt,
        projectName,
        tasks,
        runId
    });
}

// ── Worker (Processes Jobs) ──

const worker = new Worker("synapse-tasks", async (job) => {
    const { prompt, projectName, tasks, runId } = job.data;
    
    log.step("WORKER", `Picked up job ${job.id} for run: ${runId} (Project: ${projectName})`);
    
    let files = [];
    let errors = [];
    
    try {
        // Step 1: EXECUTING
        log.step("WORKER", "State → EXECUTING");
        files = await executorAgent(tasks);
        
        if (!files || files.length === 0) {
            throw new Error("Executor returned no files");
        }
        
        // Step 2: REVIEWING
        log.step("WORKER", "State → REVIEWING");
        const reviewResult = await reviewerAgent(tasks, files);
        
        files = reviewResult.files;
        if (reviewResult.issues.length > 0) {
            errors = reviewResult.issues;
        }
        
        // Step 3: SAVING
        log.step("WORKER", "State → SAVING");
        files.forEach(file => {
            saveFile(projectName, file);
            saveDocs(projectName, file);
        });
        
        // Step 4: Update Memory
        saveRun({
            id: runId, // Override to use the same runId
            prompt,
            projectName,
            tasks,
            files,
            status: "COMPLETED",
            errors
        });
        
        log.success("WORKER", `Job ${job.id} completed successfully!`);
        
    } catch (error) {
        log.error("WORKER", `Job ${job.id} failed: ${error.message}`);
        
        saveRun({
            id: runId,
            prompt,
            projectName,
            tasks,
            files: [],
            status: "FAILED",
            errors: [error.message, ...errors]
        });
        
        throw error;
    }
}, { connection });

worker.on("failed", (job, err) => {
    log.error("QUEUE", `Job ${job.id} failed entirely: ${err.message}`);
});

module.exports = { queueTasks, taskQueue };
