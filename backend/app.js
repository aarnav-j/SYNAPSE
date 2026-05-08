// ─────────────────────────────────────────────
// SYNAPSE — Express Server (API Layer)
// Connects: Redis → MySQL → Express → Routes
// Auth protected endpoints for pipeline & history
// ─────────────────────────────────────────────

require("dotenv").config();

const express = require("express");
const path = require("path");
const db = require("./database/connection");
const authMiddleware = require("./middleware/auth");
const authRoutes = require("./routes/auth");
const debuggerAgent = require("./agents/debugger");
const { exportProject } = require("./utils/exporter");
const log = require("./utils/logger");
const runtime = require("./runtime/processManager");
const fs = require("fs");

const app = express();
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
});
app.use(express.json({ limit: "10mb" })); // increased for base64 images
app.use(express.text()); // Allow raw text bodies for debugging logs

// Handle malformed JSON safely so the server doesn't crash
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        log.error("SERVER", `Malformed JSON received: ${err.message}`);
        return res.status(400).json({ error: "Invalid JSON format. If you are pasting an error, please ensure it is properly escaped, or send it as raw text (Content-Type: text/plain)." });
    }
    next();
});

// ── Boot Sequence: Redis → MySQL → Express ──

async function boot() {
    // Step 1: Test MySQL connection
    const dbConnected = await db.testConnection();

    if (!dbConnected) {
        log.error("SERVER", "MySQL is not connected. Auth & DB features will be unavailable.");
        log.warn("SERVER", "Pipeline will still work using JSON memory fallback.");
    }

    // Step 3: Load agents (after Redis is ready)
    const orchestrator = require("./agents/orchestrator");
    const { getAllRuns, getRunById } = require("./utils/memory");

    // ── Public Routes (no auth needed) ──

    app.use("/auth", authRoutes);

    app.get("/status", (req, res) => {
        res.json({
            status: "running",
            system: "SYNAPSE",
            version: "3.0.0",
            database: dbConnected ? "connected" : "disconnected",
            uptime: Math.floor(process.uptime()) + "s"
        });
    });

    // ── Routes (Auth temporarily disabled for manual testing) ──

    // POST /prompt — Run the full pipeline
    app.post("/prompt", async (req, res) => {
        log.info("SERVER", `Request received on /prompt (Auth Disabled)`);

        const { prompt } = req.body;

        if (!prompt || prompt.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: "Prompt is required"
            });
        }

        const result = await orchestrator.run(prompt.trim(), 1); // hardcoded userId = 1

        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    });

    // GET /history — View all past runs (user-specific from DB, fallback to JSON)
    app.get("/history", async (req, res) => {
        log.info("SERVER", `History requested (Auth Disabled)`);

        try {
            // Try DB first (user-specific, using hardcoded userId 1)
            const projects = await db.getProjectsByUserId(1);

            if (projects && projects.length > 0) {
                return res.json({
                    source: "database",
                    total: projects.length,
                    runs: projects
                });
            }
        } catch (_) {
            // DB failed, fall through to JSON
        }

        // Fallback to JSON memory
        const runs = getAllRuns();
        res.json({
            source: "memory",
            total: runs.length,
            runs
        });
    });

    // GET /history/:id — View a specific run (try DB first, then JSON)
    app.get("/history/:id", async (req, res) => {
        log.info("SERVER", `Run details requested: ${req.params.id}`);

        try {
            // Try DB first
            const project = await db.getProjectByRunId(req.params.id);

            if (project) {
                // Also fetch pipeline steps and generated files
                const steps = await db.getStepsByProjectId(project.id);
                const files = await db.getFilesByProjectId(project.id);

                return res.json({
                    source: "database",
                    project,
                    pipelineSteps: steps,
                    generatedFiles: files
                });
            }
        } catch (_) {
            // DB failed, fall through to JSON
        }

        // Fallback to JSON
        const run = getRunById(req.params.id);

        if (!run) {
            return res.status(404).json({ error: "Run not found" });
        }

        res.json({ source: "memory", ...run });
    });

    // GET /projects/:projectId/files — Get all generated files for a project
    app.get("/projects/:projectId/files", async (req, res) => {
        try {
            let files = [];
            
            // Try fetching from DB. This might throw if projectId is a UUID from JSON memory.
            try {
                files = await db.getFilesByProjectId(req.params.projectId);
            } catch (dbErr) {
                log.warn("SERVER", `DB fetch failed for project ${req.params.projectId}, falling back to local files.`);
            }
            
            // Fallback: If DB has no files, scan the local output folder
            if (!files || files.length === 0) {
                log.info("SERVER", `No files in DB for project ${req.params.projectId}. Scanning file system...`);
                
                let projectName = null;
                // Try DB first
                const projRows = await db.query(`SELECT project_name FROM projects WHERE id = ?`, [req.params.projectId]);
                if (projRows && projRows.length > 0) projectName = projRows[0].project_name;
                
                // Try memory fallback
                if (!projectName) {
                    const run = getRunById(req.params.projectId);
                    if (run) projectName = run.project_name;
                }
                
                if (projectName) {
                    const outputDir = path.join(__dirname, "output", projectName);
                    const fs = require("fs");
                    
                    if (fs.existsSync(outputDir)) {
                        const localFiles = [];
                        const scanDir = (dir, type) => {
                            if (!fs.existsSync(dir)) return;
                            const items = fs.readdirSync(dir);
                            for (const item of items) {
                                const fullPath = path.join(dir, item);
                                if (fs.statSync(fullPath).isDirectory()) {
                                    scanDir(fullPath, type);
                                } else {
                                    const content = fs.readFileSync(fullPath, "utf-8");
                                    localFiles.push({
                                        id: `local-${item}`,
                                        file_type: type,
                                        file_path: fullPath.replace(outputDir, "").replace(/^[\\\/]/, ""),
                                        content: content
                                    });
                                }
                            }
                        };
                        
                        scanDir(path.join(outputDir, "frontend"), "frontend");
                        scanDir(path.join(outputDir, "backend"), "backend");
                        
                        files = localFiles;
                    }
                }
            }
            
            res.json({ total: files.length, files });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // GET /projects/:projectId/files/:fileId — Get actual code of a specific file
    app.get("/projects/:projectId/files/:fileId", async (req, res) => {
        try {
            const file = await db.getFileCode(req.params.fileId);

            if (!file) {
                return res.status(404).json({ error: "File not found" });
            }

            res.json(file);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // GET /projects/:projectId/steps — Get all pipeline steps for a project
    app.get("/projects/:projectId/steps", async (req, res) => {
        try {
            const steps = await db.getStepsByProjectId(req.params.projectId);
            res.json({ total: steps.length, steps });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ── Delete Route ──

    // DELETE /projects/:projectId — Delete a project and all its files
    app.delete("/projects/:projectId", async (req, res) => {
        try {
            log.info("SERVER", `Deleting project ${req.params.projectId}`);
            
            let projectName = null;
            const projRows = await db.query(`SELECT project_name FROM projects WHERE id = ?`, [req.params.projectId]);
            if (projRows && projRows.length > 0) projectName = projRows[0].project_name;

            // Delete from DB
            await db.query(`DELETE FROM chat_messages WHERE debug_session_id IN (SELECT id FROM debug_sessions WHERE project_id = ?)`, [req.params.projectId]);
            await db.query(`DELETE FROM debug_sessions WHERE project_id = ?`, [req.params.projectId]);
            await db.query(`DELETE FROM generated_files WHERE project_id = ?`, [req.params.projectId]);
            await db.query(`DELETE FROM pipeline_steps WHERE project_id = ?`, [req.params.projectId]);
            await db.query(`DELETE FROM projects WHERE id = ?`, [req.params.projectId]);

            // Delete from file system
            if (projectName) {
                const outputDir = path.join(__dirname, "output", projectName);
                const fs = require("fs");
                if (fs.existsSync(outputDir)) {
                    fs.rmSync(outputDir, { recursive: true, force: true });
                }
            }

            res.json({ success: true, message: "Project deleted successfully" });
        } catch (err) {
            log.error("SERVER", `Failed to delete project: ${err.message}`);
            res.status(500).json({ error: err.message });
        }
    });

    // ── Debug Routes ──

    // POST /debug/:projectId — Start a new debug session
    app.post("/debug/:projectId", async (req, res) => {
        try {
            const sessionId = await db.createDebugSession(req.params.projectId);

            log.info("DEBUG", `New debug session started (ID: ${sessionId}) for project ${req.params.projectId}`);

            res.status(201).json({
                success: true,
                sessionId,
                message: "Debug session started. Send messages to /debug/chat/:sessionId"
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /debug/chat/:sessionId — Send a message in a debug session (AI-POWERED)
    app.post("/debug/chat/:sessionId", async (req, res) => {
        try {
            // Support both JSON body and Raw Text body
            let message = req.body?.message || req.body;
            let codeContext = req.body?.codeContext || null;
            let image = req.body?.image || null;

            if (typeof req.body === "string" && req.body.trim().length > 0) {
                message = req.body;
            }

            if (!message || (typeof message === "object" && Object.keys(message).length === 0)) {
                return res.status(400).json({ error: "message is required" });
            }

            // Get the session to find the project ID
            const sessions = await db.query(
                `SELECT project_id FROM debug_sessions WHERE id = ?`,
                [req.params.sessionId]
            );

            if (!sessions || sessions.length === 0) {
                return res.status(404).json({ error: "Debug session not found" });
            }

            // Call the debugging agent
            const result = await debuggerAgent({
                projectId: sessions[0].project_id,
                sessionId: req.params.sessionId,
                userMessage: message,
                codeContext: codeContext || null,
                image: image
            });

            // Get updated chat history
            const history = await db.getChatHistory(req.params.sessionId);

            res.json({
                success: true,
                response: result.response,
                filesUpdated: result.filesUpdated,
                messagesCount: history.length,
                history
            });
        } catch (err) {
            log.error("DEBUG", `Debug chat failed: ${err.message}`);
            res.status(500).json({ error: err.message });
        }
    });

    // GET /debug/chat/:sessionId — Get chat history for a debug session
    app.get("/debug/chat/:sessionId", async (req, res) => {
        try {
            const history = await db.getChatHistory(req.params.sessionId);
            res.json({ total: history.length, history });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ── Export Routes ──

    // POST /export/:projectId — Export project as ZIP with README
    app.post("/export/:projectId", async (req, res) => {
        try {
            log.info("EXPORT", `Export requested for project ${req.params.projectId}`);

            const result = await exportProject(req.params.projectId);

            res.json({
                success: true,
                projectName: result.projectName,
                filesCount: result.filesCount,
                readmeGenerated: result.readmeGenerated,
                downloadPath: result.zipPath,
                message: "Project exported successfully! Download the ZIP from the path above."
            });
        } catch (err) {
            log.error("EXPORT", `Export failed: ${err.message}`);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // GET /export/download/:projectId — Download the ZIP file directly
    app.get("/export/download/:projectId", authMiddleware, async (req, res) => {
        try {
            const projects = await db.query(
                `SELECT project_name FROM projects WHERE id = ?`,
                [req.params.projectId]
            );

            if (!projects || projects.length === 0) {
                return res.status(404).json({ error: "Project not found" });
            }

            const zipPath = path.join(__dirname, "output", projects[0].project_name, "export", `${projects[0].project_name}.zip`);

            if (!require("fs").existsSync(zipPath)) {
                return res.status(404).json({ error: "Export not found. Run POST /export/:projectId first." });
            }

            res.download(zipPath);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ── File Save API (Editable Editor) ──

    // PUT /projects/:projectId/files/save — Save edited file content to disk and DB
    app.put("/projects/:projectId/files/save", async (req, res) => {
        try {
            const { filePath, content } = req.body;
            log.info("EDITOR", `Saving file: ${filePath} for project ${req.params.projectId}`);

            if (!filePath || content === undefined) {
                return res.status(400).json({ error: "filePath and content are required" });
            }

            // Get project name
            let projectName = null;
            const projRows = await db.query(`SELECT project_name FROM projects WHERE id = ?`, [req.params.projectId]);
            if (projRows && projRows.length > 0) projectName = projRows[0].project_name;

            if (!projectName) {
                return res.status(404).json({ error: "Project not found" });
            }

            // Write to disk
            const outputDir = path.join(__dirname, "output", projectName);
            const fullPath = path.join(outputDir, filePath);
            
            // Ensure parent directory exists
            const dir = path.dirname(fullPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            
            fs.writeFileSync(fullPath, content, "utf-8");
            log.save("EDITOR", `File written to disk: ${fullPath}`);

            // Update in DB if exists
            try {
                const existing = await db.query(
                    `SELECT id FROM generated_files WHERE project_id = ? AND filename = ?`,
                    [req.params.projectId, filePath]
                );
                if (existing && existing.length > 0) {
                    await db.query(
                        `UPDATE generated_files SET code = ?, created_at = NOW() WHERE id = ?`,
                        [content, existing[0].id]
                    );
                    log.save("EDITOR", `File updated in DB: ${filePath}`);
                }
            } catch (dbErr) {
                log.warn("EDITOR", `DB update failed (non-critical): ${dbErr.message}`);
            }

            res.json({ success: true, message: `File saved: ${filePath}` });
        } catch (err) {
            log.error("EDITOR", `Save failed: ${err.message}`);
            res.status(500).json({ error: err.message });
        }
    });

    // ── Runtime Routes ──

    // POST /runtime/run/:projectId — Run a generated project
    app.post("/runtime/run/:projectId", async (req, res) => {
        try {
            log.info("RUNTIME", `Run requested for project ${req.params.projectId}`);

            let projectName = null;
            const projRows = await db.query(`SELECT project_name FROM projects WHERE id = ?`, [req.params.projectId]);
            if (projRows && projRows.length > 0) projectName = projRows[0].project_name;

            if (!projectName) {
                return res.status(404).json({ error: "Project not found" });
            }

            const result = await runtime.runProject(projectName);
            res.json(result);
        } catch (err) {
            log.error("RUNTIME", `Run failed: ${err.message}`);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // POST /runtime/stop/:projectId — Stop a running project
    app.post("/runtime/stop/:projectId", async (req, res) => {
        try {
            log.info("RUNTIME", `Stop requested for project ${req.params.projectId}`);

            let projectName = null;
            const projRows = await db.query(`SELECT project_name FROM projects WHERE id = ?`, [req.params.projectId]);
            if (projRows && projRows.length > 0) projectName = projRows[0].project_name;

            if (!projectName) {
                return res.status(404).json({ error: "Project not found" });
            }

            const result = runtime.stopProject(projectName);
            res.json(result);
        } catch (err) {
            log.error("RUNTIME", `Stop failed: ${err.message}`);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // POST /runtime/restart/:projectId — Restart a project
    app.post("/runtime/restart/:projectId", async (req, res) => {
        try {
            log.info("RUNTIME", `Restart requested for project ${req.params.projectId}`);

            let projectName = null;
            const projRows = await db.query(`SELECT project_name FROM projects WHERE id = ?`, [req.params.projectId]);
            if (projRows && projRows.length > 0) projectName = projRows[0].project_name;

            if (!projectName) {
                return res.status(404).json({ error: "Project not found" });
            }

            const result = await runtime.restartProject(projectName);
            res.json(result);
        } catch (err) {
            log.error("RUNTIME", `Restart failed: ${err.message}`);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // GET /runtime/status/:projectId — Get runtime status
    app.get("/runtime/status/:projectId", async (req, res) => {
        try {
            let projectName = null;
            const projRows = await db.query(`SELECT project_name FROM projects WHERE id = ?`, [req.params.projectId]);
            if (projRows && projRows.length > 0) projectName = projRows[0].project_name;

            if (!projectName) {
                return res.status(404).json({ error: "Project not found" });
            }

            const status = runtime.getStatus(projectName);
            res.json(status);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // GET /runtime/logs/:projectId — SSE stream of runtime logs
    app.get("/runtime/logs/:projectId", async (req, res) => {
        log.info("RUNTIME", `SSE log stream opened for project ${req.params.projectId}`);

        let projectName = null;
        try {
            const projRows = await db.query(`SELECT project_name FROM projects WHERE id = ?`, [req.params.projectId]);
            if (projRows && projRows.length > 0) projectName = projRows[0].project_name;
        } catch (_) {}

        if (!projectName) {
            return res.status(404).json({ error: "Project not found" });
        }

        // SSE headers
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*"
        });

        // Send existing logs first
        const existingLogs = runtime.getLogs(projectName);
        existingLogs.forEach(logEntry => {
            res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
        });

        // Listen for new logs
        const onLog = (logEntry) => {
            res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
        };

        const onStatus = (status) => {
            res.write(`event: status\ndata: ${JSON.stringify({ status })}\n\n`);
        };

        const onError = (errorLine) => {
            res.write(`event: runtime_error\ndata: ${JSON.stringify({ error: errorLine })}\n\n`);
        };

        runtime.emitter.on(`log:${projectName}`, onLog);
        runtime.emitter.on(`status:${projectName}`, onStatus);
        runtime.emitter.on(`error:${projectName}`, onError);

        // Cleanup on client disconnect
        req.on("close", () => {
            log.info("RUNTIME", `SSE log stream closed for ${projectName}`);
            runtime.emitter.off(`log:${projectName}`, onLog);
            runtime.emitter.off(`status:${projectName}`, onStatus);
            runtime.emitter.off(`error:${projectName}`, onError);
        });
    });

    // ── Start server ──

    app.listen(3005, () => {
        log.success("SERVER", "SYNAPSE running on http://localhost:3005");
        log.info("SERVER", "Public:    POST /auth/register | POST /auth/login | GET /status");
        log.info("SERVER", "Protected: POST /prompt | GET /history | GET /projects/:id/files");
        log.info("SERVER", "Debug:     POST /debug/:projectId | POST /debug/chat/:sessionId");
        log.info("SERVER", "Export:    POST /export/:projectId | GET /export/download/:projectId");
        log.info("SERVER", "Runtime:   POST /runtime/run|stop|restart/:projectId | GET /runtime/logs/:projectId");
        log.info("SERVER", "Editor:    PUT /projects/:projectId/files/save");
    });
}

// ── Run boot sequence ──

boot().catch(err => {
    log.error("SERVER", `Boot failed: ${err.message}`);
    process.exit(1);
});