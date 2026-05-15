// ─────────────────────────────────────────────
// SYNAPSE — Process Manager
// Manages child processes for generated projects
// spawn / stop / restart per project
// ─────────────────────────────────────────────

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const log = require("../utils/logger");
const EventEmitter = require("events");
const net = require("net");

// ── Process Registry ──
// Key: projectName, Value: { process, status, port, logs }

const registry = {};
const emitter = new EventEmitter();

// ── Get project output directory ──

function getProjectDir(projectName) {
    return path.join(__dirname, "..", "output", projectName);
}

// ── Check if node_modules exist ──

function hasNodeModules(projectDir) {
    return fs.existsSync(path.join(projectDir, "backend", "node_modules"));
}

// ── Install dependencies ──

function installDeps(projectName) {
    return new Promise((resolve, reject) => {
        const projectDir = getProjectDir(projectName);
        const backendDir = path.join(projectDir, "backend");

        if (!fs.existsSync(path.join(backendDir, "package.json"))) {
            log.warn("RUNTIME", `No package.json found for ${projectName}. Skipping npm install.`);
            return resolve();
        }

        if (hasNodeModules(backendDir)) {
            log.info("RUNTIME", `node_modules already exist for ${projectName}. Skipping install.`);
            return resolve();
        }

        log.step("RUNTIME", `Installing dependencies for ${projectName}...`);

        const entry = getOrCreateEntry(projectName);
        addLog(projectName, "system", `[SYNAPSE] Installing dependencies...`);

        const proc = spawn("npm", ["install"], {
            cwd: backendDir,
            shell: true,
            env: { ...process.env }
        });

        proc.stdout.on("data", (data) => {
            const line = data.toString().trim();
            if (line) addLog(projectName, "stdout", line);
        });

        proc.stderr.on("data", (data) => {
            const line = data.toString().trim();
            if (line) addLog(projectName, "stderr", line);
        });

        proc.on("close", (code) => {
            if (code === 0) {
                log.success("RUNTIME", `Dependencies installed for ${projectName}`);
                addLog(projectName, "system", `[SYNAPSE] Dependencies installed successfully.`);
                resolve();
            } else {
                log.error("RUNTIME", `npm install failed for ${projectName} (exit code: ${code})`);
                addLog(projectName, "system", `[SYNAPSE] npm install failed (exit code: ${code})`);
                reject(new Error(`npm install failed with code ${code}`));
            }
        });

        proc.on("error", (err) => {
            log.error("RUNTIME", `npm install error: ${err.message}`);
            reject(err);
        });
    });
}

// ── Create or get registry entry ──

function getOrCreateEntry(projectName) {
    if (!registry[projectName]) {
        registry[projectName] = {
            process: null,
            status: "stopped", // stopped | installing | running | crashed | stopping
            port: null,
            logs: [],
            startedAt: null,
            pid: null
        };
    }
    return registry[projectName];
}

// ── Add log to buffer + emit to SSE listeners ──

function addLog(projectName, type, message) {
    const entry = getOrCreateEntry(projectName);
    
    // Map type to level and category
    let level, category;
    switch(type) {
        case "stdout":
            level = "INFO";
            category = "OUTPUT";
            break;
        case "stderr":
            level = "ERROR";
            category = "ERROR";
            break;
        case "system":
        default:
            level = "INFO";
            category = "SYSTEM";
            break;
    }
    
    const logEntry = {
        type,       // stdout | stderr | system
        level,      // INFO | ERROR | WARN
        category,   // OUTPUT | ERROR | SYSTEM
        message,
        timestamp: new Date().toISOString()
    };
    
    entry.logs.push(logEntry);
    
    // Keep last 500 lines only
    if (entry.logs.length > 500) {
        entry.logs = entry.logs.slice(-500);
    }
    
    // Emit to any SSE listeners
    emitter.emit(`log:${projectName}`, logEntry);
}

// ── Run a project ──

async function runProject(projectName) {
    log.step("RUNTIME", `Starting project: ${projectName}`);

    const entry = getOrCreateEntry(projectName);
    
    // Prevent duplicate runs
    if (entry.status === "running" && entry.process) {
        log.warn("RUNTIME", `Project ${projectName} is already running (PID: ${entry.pid})`);
        return { success: false, error: "Project is already running", pid: entry.pid };
    }

    const projectDir = getProjectDir(projectName);
    const backendDir = path.join(projectDir, "backend");

    // Validate project structure
    if (!fs.existsSync(backendDir)) {
        log.error("RUNTIME", `Backend directory not found: ${backendDir}`);
        return { success: false, error: "Backend directory not found" };
    }

    // Detect entry point
    let entryFile = "server.js";
    if (!fs.existsSync(path.join(backendDir, "server.js"))) {
        if (fs.existsSync(path.join(backendDir, "index.js"))) entryFile = "index.js";
        else if (fs.existsSync(path.join(backendDir, "app.js"))) entryFile = "app.js";
        else {
            log.error("RUNTIME", `No entry file (server.js/index.js/app.js) found in ${backendDir}`);
            return { success: false, error: "No entry file found (server.js, index.js, or app.js)" };
        }
    }

    // Install deps if needed
    entry.status = "installing";
    entry.logs = [];
    addLog(projectName, "system", `[SYNAPSE] Preparing to run project...`);

    try {
        await installDeps(projectName);
    } catch (err) {
        entry.status = "crashed";
        return { success: false, error: `Dependency installation failed: ${err.message}` };
    }

    // Spawn the project process
    addLog(projectName, "system", `[SYNAPSE] Starting: node ${entryFile}`);
    entry.status = "running";
    entry.startedAt = new Date().toISOString();

    const getFreePort = () => new Promise((resolve, reject) => {
        const srv = net.createServer();
        srv.listen(0, () => {
            const port = srv.address().port;
            srv.close((err) => {
                if (err) reject(err);
                else resolve(port);
            });
        });
        srv.on('error', reject);
    });

    let assignedPort;
    try {
        assignedPort = await getFreePort();
    } catch (err) {
        log.error("RUNTIME", `Failed to find free port for ${projectName}: ${err.message}`);
        return { success: false, error: "Failed to allocate port" };
    }

    const proc = spawn("node", [entryFile], {
        cwd: backendDir,
        shell: false,
        env: { ...process.env, PORT: assignedPort.toString() }
    });

    entry.process = proc;
    entry.pid = proc.pid;
    entry.port = assignedPort;

    log.success("RUNTIME", `Project ${projectName} started (PID: ${proc.pid})`);
    addLog(projectName, "system", `[SYNAPSE] App is running at: http://localhost:${assignedPort}`);

    proc.stdout.on("data", (data) => {
        const lines = data.toString().split("\n").filter(l => l.trim());
        lines.forEach(line => {
            addLog(projectName, "stdout", line);
            log.info("RUNTIME:OUT", `[${projectName}] ${line}`);
        });
    });

    proc.stderr.on("data", (data) => {
        const lines = data.toString().split("\n").filter(l => l.trim());
        lines.forEach(line => {
            addLog(projectName, "stderr", line);
            log.warn("RUNTIME:ERR", `[${projectName}] ${line}`);

            // Emit error event for auto-detection
            emitter.emit(`error:${projectName}`, line);
        });
    });

    proc.on("close", (code) => {
        log.info("RUNTIME", `Project ${projectName} exited with code ${code}`);
        addLog(projectName, "system", `[SYNAPSE] Process exited (code: ${code})`);
        
        entry.status = code === 0 ? "stopped" : "crashed";
        entry.process = null;
        entry.pid = null;

        emitter.emit(`status:${projectName}`, entry.status);
    });

    proc.on("error", (err) => {
        log.error("RUNTIME", `Process error for ${projectName}: ${err.message}`);
        addLog(projectName, "system", `[SYNAPSE] Process error: ${err.message}`);
        entry.status = "crashed";
        entry.process = null;
        entry.pid = null;
    });

    return { success: true, pid: proc.pid, port: assignedPort, entryFile };
}

// ── Stop a project ──

function stopProject(projectName) {
    log.step("RUNTIME", `Stopping project: ${projectName}`);

    const entry = registry[projectName];
    if (!entry || !entry.process) {
        log.warn("RUNTIME", `Project ${projectName} is not running`);
        return { success: false, error: "Project is not running" };
    }

    entry.status = "stopping";
    addLog(projectName, "system", `[SYNAPSE] Stopping project...`);

    try {
        // On Windows, we need to kill the process tree
        if (process.platform === "win32") {
            spawn("taskkill", ["/pid", entry.pid, "/f", "/t"], { shell: true });
        } else {
            entry.process.kill("SIGTERM");
        }
        
        entry.status = "stopped";
        entry.process = null;
        entry.pid = null;

        log.success("RUNTIME", `Project ${projectName} stopped`);
        addLog(projectName, "system", `[SYNAPSE] Project stopped.`);

        return { success: true };
    } catch (err) {
        log.error("RUNTIME", `Failed to stop ${projectName}: ${err.message}`);
        return { success: false, error: err.message };
    }
}

// ── Restart a project ──

async function restartProject(projectName) {
    log.step("RUNTIME", `Restarting project: ${projectName}`);
    addLog(projectName, "system", `[SYNAPSE] Restarting project...`);
    
    stopProject(projectName);
    
    // Small delay to let the port free up
    await new Promise(r => setTimeout(r, 1000));
    
    return await runProject(projectName);
}

// ── Get status ──

function getStatus(projectName) {
    const entry = registry[projectName];
    if (!entry) {
        return { status: "stopped", pid: null, port: null, logs: [] };
    }
    return {
        status: entry.status,
        pid: entry.pid,
        port: entry.port,
        startedAt: entry.startedAt,
        logsCount: entry.logs.length
    };
}

// ── Get logs ──

function getLogs(projectName) {
    const entry = registry[projectName];
    return entry ? entry.logs : [];
}

module.exports = {
    runProject,
    stopProject,
    restartProject,
    getStatus,
    getLogs,
    emitter,
    addLog
};
