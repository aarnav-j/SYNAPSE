// ─────────────────────────────────────────────
// SYNAPSE — Native Node.js Queue System
// Replaces BullMQ/Redis for easier local deployment
// ─────────────────────────────────────────────

const executorAgent = require("../agents/executor");
const reviewerAgent = require("../agents/reviewer");
const { saveFile, saveDocs, resolveFileType, createPackageJsons } = require("./fileManager");
const { saveRun, getRunById } = require("./memory");
const db = require("../database/connection");
const log = require("./logger");

// ── Native Queue Class ──

class NativeQueue {
    constructor() {
        this.jobs = [];
        this.isProcessing = false;
        this.jobIdCounter = 1;
    }

    async add(name, data) {
        const job = { id: this.jobIdCounter++, name, data };
        this.jobs.push(job);
        
        // Start processing if not already running
        if (!this.isProcessing) {
            this.processNext();
        }
    }

    async processNext() {
        if (this.jobs.length === 0) {
            this.isProcessing = false;
            return;
        }

        this.isProcessing = true;
        const job = this.jobs.shift();

        try {
            await processJob(job);
        } catch (err) {
            log.error("WORKER", `Job ${job.id} failed: ${err.message}`);
        }

        // Process next job in queue
        this.processNext();
    }
}

const taskQueue = new NativeQueue();

// ── Add Job to Queue ──

async function queueTasks(prompt, projectName, tasks, runId, userId, projectDbId) {
    log.info("QUEUE", `Adding job to queue for run: ${runId} (Project: ${projectName})`);

    await taskQueue.add("process-project", {
        prompt,
        projectName,
        tasks,
        runId,
        userId,
        projectDbId
    });
}

// ── Worker Processor ──

async function processJob(job) {
    const { prompt, projectName, tasks, runId, userId, projectDbId } = job.data;

    log.step("WORKER", `Picked up job ${job.id} for run: ${runId} (Project: ${projectName})`);

    let files = [];
    let errors = [];

    try {
        // ── Step 1: EXECUTING ──
        log.step("WORKER", "State → EXECUTING");
        const execStart = Date.now();

        if (projectDbId) {
            try { await db.updateProjectStatus(runId, "EXECUTING"); } catch (_) {}
        }

        files = await executorAgent(tasks);

        if (!files || files.length === 0) {
            throw new Error("Executor returned no files");
        }

        if (projectDbId) {
            try {
                await db.logPipelineStep({
                    projectId: projectDbId,
                    stepName: "EXECUTING",
                    stepStatus: "COMPLETED",
                    inputData: { tasksCount: tasks.length },
                    outputData: { filesCount: files.length, filenames: files.map(f => f.filename) },
                    durationMs: Date.now() - execStart
                });
            } catch (_) {}
        }

        // ── Step 2: REVIEWING ──
        log.step("WORKER", "State → REVIEWING");
        const reviewStart = Date.now();

        if (projectDbId) {
            try { await db.updateProjectStatus(runId, "REVIEWING"); } catch (_) {}
        }

        const reviewResult = await reviewerAgent(tasks, files);
        files = reviewResult.files;

        if (reviewResult.issues.length > 0) {
            errors = reviewResult.issues;
        }

        if (projectDbId) {
            try {
                await db.logPipelineStep({
                    projectId: projectDbId,
                    stepName: "REVIEWING",
                    stepStatus: "COMPLETED",
                    inputData: { issuesFound: reviewResult.issues.length },
                    outputData: { fixedFilesCount: files.length, issues: reviewResult.issues },
                    durationMs: Date.now() - reviewStart
                });
            } catch (_) {}
        }

        // ── Step 3: SAVING ──
        log.step("WORKER", "State → SAVING");
        const saveStart = Date.now();

        if (projectDbId) {
            try { await db.updateProjectStatus(runId, "SAVING"); } catch (_) {}
        }

        for (const file of files) {
            saveFile(projectName, file);
            saveDocs(projectName, file);

            if (projectDbId) {
                try {
                    const fileType = resolveFileType(file.filename);
                    await db.saveGeneratedFile({
                        projectId: projectDbId,
                        filename: file.filename,
                        fileType,
                        code: file.code,
                        explanation: file.explanation || ""
                    });
                } catch (err) {
                    log.warn("DB", `Failed to save file ${file.filename}: ${err.message}`);
                }
            }
        }

        // Auto-generate package.json for frontend and backend
        try {
            createPackageJsons(projectName, files);
            log.save("FILE", `Generated package.json files for ${projectName}`);
        } catch (err) {
            log.warn("FILE", `Failed to generate package.jsons: ${err.message}`);
        }

        // Fallback JSON Memory Update
        const run = getRunById(runId);
        if (run) {
            run.status = "COMPLETED";
            run.files = files;
            run.errors = errors;
            saveRun(run);
        }

        if (projectDbId) {
            try {
                await db.updateProjectStatus(runId, "COMPLETED");
                await db.logPipelineStep({
                    projectId: projectDbId,
                    stepName: "SAVING",
                    stepStatus: "COMPLETED",
                    inputData: { filesToSave: files.length },
                    outputData: { filesSaved: files.length },
                    durationMs: Date.now() - saveStart
                });
            } catch (_) {}
        }

        log.success("WORKER", `Job ${job.id} completed successfully!`);

    } catch (error) {
        log.error("WORKER", `Job ${job.id} failed: ${error.message}`);
        
        const run = getRunById(runId);
        if (run) {
            run.status = "FAILED";
            run.errors.push(error.message);
            saveRun(run);
        }

        if (projectDbId) {
            try { await db.updateProjectStatus(runId, "FAILED"); } catch (_) {}
        }
    }
}

module.exports = { queueTasks };
