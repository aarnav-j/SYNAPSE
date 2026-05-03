// ─────────────────────────────────────────────
// SYNAPSE — Memory System
// JSON-file-based run history (no DB needed yet)
// Stores: prompt, tasks, files, status per run
// ─────────────────────────────────────────────

const fs = require("fs");
const path = require("path");
const log = require("./logger");

const MEMORY_DIR = path.join(__dirname, "..", "memory");

// ── Ensure memory directory exists ──

function ensureMemoryDir() {
    if (!fs.existsSync(MEMORY_DIR)) {
        fs.mkdirSync(MEMORY_DIR, { recursive: true });
    }
}

function getISTTime() {
    return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

// ── Generate a unique run ID ──

function generateRunId() {
    const now = new Date();
    
    // Convert to IST for the run ID to match local time visually
    const istOptions = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    const formatter = new Intl.DateTimeFormat('en-IN', istOptions);
    const parts = formatter.formatToParts(now);
    
    const p = {};
    parts.forEach(part => p[part.type] = part.value);
    
    const date = `${p.year}${p.month}${p.day}`;
    const time = `${p.hour}${p.minute}${p.second}`;
    const rand = Math.random().toString(36).slice(2, 6);

    return `run_${date}_${time}_${rand}`;
}

// ── Save a complete project run ──

function saveRun(data) {
    ensureMemoryDir();

    const runId = data.id || generateRunId();

    const record = {
        id: runId,
        prompt: data.prompt || "",
        tasks: data.tasks || [],
        files: (data.files || []).map(f => ({
            filename: f.filename,
            explanation: f.explanation
        })),
        status: data.status || "unknown",
        errors: data.errors || [],
        timestamp: getISTTime()
    };

    const filePath = path.join(MEMORY_DIR, `${runId}.json`);

    fs.writeFileSync(filePath, JSON.stringify(record, null, 2));

    log.save("MEMORY", `Run saved → ${runId}`);

    return runId;
}

// ── Get the most recent run ──

function getLastRun() {
    ensureMemoryDir();

    const files = fs.readdirSync(MEMORY_DIR)
        .filter(f => f.endsWith(".json"))
        .sort()
        .reverse();

    if (files.length === 0) return null;

    const content = fs.readFileSync(path.join(MEMORY_DIR, files[0]), "utf-8");

    return JSON.parse(content);
}

// ── Get all runs (summary only) ──

function getAllRuns() {
    ensureMemoryDir();

    const files = fs.readdirSync(MEMORY_DIR)
        .filter(f => f.endsWith(".json"))
        .sort()
        .reverse();

    return files.map(f => {
        const content = fs.readFileSync(path.join(MEMORY_DIR, f), "utf-8");
        const run = JSON.parse(content);

        return {
            id: run.id,
            prompt: run.prompt,
            status: run.status,
            filesCount: run.files.length,
            timestamp: run.timestamp
        };
    });
}

// ── Get a specific run by ID ──

function getRunById(id) {
    ensureMemoryDir();

    const filePath = path.join(MEMORY_DIR, `${id}.json`);

    if (!fs.existsSync(filePath)) return null;

    const content = fs.readFileSync(filePath, "utf-8");

    return JSON.parse(content);
}

module.exports = { saveRun, getLastRun, getAllRuns, getRunById };
