// ─────────────────────────────────────────────
// SYNAPSE — Express Server (Thin API Layer)
// All logic lives in the orchestrator
// This file only handles HTTP routing
// ─────────────────────────────────────────────

require("dotenv").config();

const express = require("express");
const { startRedis } = require("./utils/redis-server");
const log = require("./utils/logger");

const app = express();
app.use(express.json());

// Initialize Redis and Queue, then start server
startRedis().then(() => {
    const orchestrator = require("./agents/orchestrator");
    const { getAllRuns, getRunById } = require("./utils/memory");

    // ── POST /prompt — Run the full pipeline ──
    app.post("/prompt", async (req, res) => {
    log.info("SERVER", "Request received on /prompt");

    const { prompt } = req.body;

    if (!prompt || prompt.trim().length === 0) {
        return res.status(400).json({
            success: false,
            error: "Prompt is required"
        });
    }

    const result = await orchestrator.run(prompt.trim());

    if (result.success) {
        res.json(result);
    } else {
        res.status(500).json(result);
    }
});

// ── GET /history — View all past runs ──

app.get("/history", (req, res) => {
    log.info("SERVER", "Request received on /history");

    const runs = getAllRuns();

    res.json({
        total: runs.length,
        runs
    });
});

// ── GET /history/:id — View a specific run ──

app.get("/history/:id", (req, res) => {
    log.info("SERVER", `Request received for run: ${req.params.id}`);

    const run = getRunById(req.params.id);

    if (!run) {
        return res.status(404).json({ error: "Run not found" });
    }

    res.json(run);
});

    // ── GET /status — Health check ──
    app.get("/status", (req, res) => {
        res.json({
            status: "running",
            system: "SYNAPSE",
            version: "2.0.0",
            uptime: Math.floor(process.uptime()) + "s"
        });
    });

    // ── Start server ──
    app.listen(3005, () => {
        log.success("SERVER", "SYNAPSE running on http://localhost:3005");
        log.info("SERVER", "Endpoints: POST /prompt | GET /history | GET /status");
    });
}).catch(err => {
    log.error("SERVER", "Failed to start Redis, aborting startup");
    process.exit(1);
});