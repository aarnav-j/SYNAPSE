// ─────────────────────────────────────────────
// SYNAPSE — MySQL Database Connection
// Uses mysql2/promise for async/await support
// Connection pool for performance
// ─────────────────────────────────────────────

const mysql = require("mysql2/promise");
const log = require("../utils/logger");

let pool = null;

// ── Create Connection Pool ──

function createPool() {
    if (pool) return pool;

    pool = mysql.createPool({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "synapse",
        port: parseInt(process.env.DB_PORT) || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        timezone: "+05:30" // IST
    });

    return pool;
}

// ── Test Connection ──

async function testConnection() {
    try {
        const db = createPool();
        const [rows] = await db.query("SELECT 1 AS connected");

        if (rows[0].connected === 1) {
            log.success("DATABASE", "MySQL connected successfully");
            return true;
        }
    } catch (err) {
        log.error("DATABASE", `MySQL connection failed: ${err.message}`);
        log.warn("DATABASE", "Make sure MySQL is running and credentials in .env are correct");
        return false;
    }
}

// ── Query Helper ──

async function query(sql, params = []) {
    const db = createPool();
    const [results] = await db.execute(sql, params);
    return results;
}

// ── Transaction Helper ──

async function transaction(callback) {
    const db = createPool();
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();
        const result = await callback(conn);
        await conn.commit();
        return result;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

// ── Project Operations ──

async function createProject({ userId, runId, projectName, prompt, status, outputPath }) {
    const result = await query(
        `INSERT INTO projects (user_id, run_id, project_name, prompt, status, output_path)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, runId, projectName, prompt, status || "WAITING", outputPath || null]
    );
    return result.insertId;
}

async function updateProjectStatus(runId, status) {
    await query(
        `UPDATE projects SET status = ?, updated_at = NOW() WHERE run_id = ?`,
        [status, runId]
    );
}

async function getProjectByRunId(runId) {
    const rows = await query(`SELECT * FROM projects WHERE run_id = ?`, [runId]);
    return rows[0] || null;
}

async function getProjectsByUserId(userId) {
    return await query(
        `SELECT id, run_id, project_name, prompt, status, output_path, created_at, updated_at
         FROM projects WHERE user_id = ? ORDER BY created_at DESC`,
        [userId]
    );
}

// ── Pipeline Step Operations ──

async function logPipelineStep({ projectId, stepName, stepStatus, inputData, outputData, errorMessage, durationMs }) {
    const result = await query(
        `INSERT INTO pipeline_steps (project_id, step_name, step_status, input_data, output_data, error_message, duration_ms, started_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
        [
            projectId,
            stepName,
            stepStatus || "STARTED",
            inputData ? JSON.stringify(inputData) : null,
            outputData ? JSON.stringify(outputData) : null,
            errorMessage || null,
            durationMs || 0,
            stepStatus === "COMPLETED" || stepStatus === "FAILED" ? new Date() : null
        ]
    );
    return result.insertId;
}

async function getStepsByProjectId(projectId) {
    return await query(
        `SELECT * FROM pipeline_steps WHERE project_id = ? ORDER BY started_at ASC`,
        [projectId]
    );
}

// ── Generated File Operations ──

async function saveGeneratedFile({ projectId, filename, fileType, code, explanation }) {
    const result = await query(
        `INSERT INTO generated_files (project_id, filename, file_type, code, explanation)
         VALUES (?, ?, ?, ?, ?)`,
        [projectId, filename, fileType || "backend", code, explanation || null]
    );
    return result.insertId;
}

async function getFilesByProjectId(projectId) {
    return await query(
        `SELECT id, filename as file_path, file_type, explanation, code as content, created_at FROM generated_files WHERE project_id = ? ORDER BY filename`,
        [projectId]
    );
}

async function getFileCode(fileId) {
    const rows = await query(`SELECT * FROM generated_files WHERE id = ?`, [fileId]);
    return rows[0] || null;
}

// ── Debug Session Operations ──

async function createDebugSession(projectId) {
    const result = await query(
        `INSERT INTO debug_sessions (project_id, status) VALUES (?, 'active')`,
        [projectId]
    );
    return result.insertId;
}

async function getDebugSessionsByProjectId(projectId) {
    return await query(
        `SELECT * FROM debug_sessions WHERE project_id = ? ORDER BY created_at DESC`,
        [projectId]
    );
}

async function updateDebugSessionStatus(sessionId, status) {
    await query(
        `UPDATE debug_sessions SET status = ?, updated_at = NOW() WHERE id = ?`,
        [status, sessionId]
    );
}

// ── Chat Message Operations ──

async function addChatMessage({ debugSessionId, role, content, codeContext }) {
    const result = await query(
        `INSERT INTO chat_messages (debug_session_id, role, content, code_context)
         VALUES (?, ?, ?, ?)`,
        [debugSessionId, role, content, codeContext || null]
    );
    return result.insertId;
}

async function getChatHistory(debugSessionId) {
    return await query(
        `SELECT * FROM chat_messages WHERE debug_session_id = ? ORDER BY created_at ASC`,
        [debugSessionId]
    );
}

// ── User Operations ──

async function createUser({ username, email, passwordHash }) {
    const result = await query(
        `INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`,
        [username, email, passwordHash]
    );
    return result.insertId;
}

async function getUserByEmail(email) {
    const rows = await query(`SELECT * FROM users WHERE email = ?`, [email]);
    return rows[0] || null;
}

async function getUserById(id) {
    const rows = await query(`SELECT id, username, email, created_at, last_login FROM users WHERE id = ?`, [id]);
    return rows[0] || null;
}

async function updateLastLogin(userId) {
    await query(`UPDATE users SET last_login = NOW() WHERE id = ?`, [userId]);
}

module.exports = {
    testConnection,
    query,
    transaction,
    // Users
    createUser,
    getUserByEmail,
    getUserById,
    updateLastLogin,
    // Projects
    createProject,
    updateProjectStatus,
    getProjectByRunId,
    getProjectsByUserId,
    // Pipeline Steps
    logPipelineStep,
    getStepsByProjectId,
    // Generated Files
    saveGeneratedFile,
    getFilesByProjectId,
    getFileCode,
    // Debug Sessions
    createDebugSession,
    getDebugSessionsByProjectId,
    updateDebugSessionStatus,
    // Chat Messages
    addChatMessage,
    getChatHistory
};
