const fs = require("fs");
const path = require("path");

const BASE_DIR = path.join(__dirname, "..", "output");

function ensureDir(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function resolveFilePath(task) {
    const lower = task.toLowerCase();

    if (lower.includes("server") || lower.includes("route")) {
        return path.join(BASE_DIR, "backend", "server.js");
    }

    if (task.includes("App.jsx")) {
        return path.join(BASE_DIR, "frontend", "App.jsx");
    }

    if (task.includes("VideoPlayer")) {
        return path.join(BASE_DIR, "frontend", "VideoPlayer.jsx");
    }

    return path.join(BASE_DIR, "misc", "misc.js");
}

function resolveDocPath(task) {
    const name = task.replace(/\s+/g, "_").slice(0, 30);
    return path.join(BASE_DIR, "docs", `${name}.md`);
}

function saveCode(task, code) {
    const filePath = resolveFilePath(task);

    ensureDir(filePath);

    fs.writeFileSync(filePath, code);

    console.log("💾 Saved code →", filePath);
}

function saveDocs(task, explanation) {
    if (!explanation) return;

    const docPath = resolveDocPath(task);

    ensureDir(docPath);

    const content = `# ${task}\n\n${explanation}\n\n---\n`;

    fs.appendFileSync(docPath, content);

    console.log("📝 Saved docs →", docPath);
}

module.exports = {
    saveCode,
    saveDocs
};