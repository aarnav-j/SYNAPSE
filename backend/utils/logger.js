// ─────────────────────────────────────────────
// SYNAPSE — Structured Logger
// Centralized logging with timestamps + levels
// ─────────────────────────────────────────────

function getTimestamp() {
    const now = new Date();

    const hours = String(now.getHours()).padStart(2, "0");
    const mins = String(now.getMinutes()).padStart(2, "0");
    const secs = String(now.getSeconds()).padStart(2, "0");

    return `${hours}:${mins}:${secs}`;
}

function formatMessage(emoji, source, message) {
    return `[${getTimestamp()}] ${emoji} ${source} → ${message}`;
}

// ── Log Levels ──

function info(source, message) {
    console.log(formatMessage("📌", source, message));
}

function success(source, message) {
    console.log(formatMessage("✅", source, message));
}

function warn(source, message) {
    console.warn(formatMessage("⚠️", source, message));
}

function error(source, message) {
    console.error(formatMessage("❌", source, message));
}

function step(source, message) {
    console.log(formatMessage("⚙️", source, message));
}

function save(source, message) {
    console.log(formatMessage("💾", source, message));
}

function ai(source, message) {
    console.log(formatMessage("🤖", source, message));
}

module.exports = { info, success, warn, error, step, save, ai };
