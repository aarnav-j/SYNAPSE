// ─────────────────────────────────────────────
// SYNAPSE — File Manager
// Saves generated code and docs to output folders
// backend/ for .js, frontend/ for .jsx, docs/ for .md
// ─────────────────────────────────────────────

const fs = require("fs");
const path = require("path");
const log = require("./logger");

const BASE = path.join(__dirname, "..", "output");

// ── Ensure parent directories exist ──

function ensureDir(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

// ── Resolve output path based on file extension and path ──

function resolvePath(projectName, filename) {
    const isFrontend = 
        filename.endsWith(".jsx") || 
        filename.endsWith(".css") || 
        filename.includes("components/") || 
        filename.includes("pages/") || 
        filename === "App.js" || 
        filename === "index.js" ||
        filename.includes("src/");

    if (isFrontend) {
        return path.join(BASE, projectName, "frontend", filename);
    }
    return path.join(BASE, projectName, "backend", filename);
}

// ── Save a generated code file ──

function saveFile(projectName, file) {
    const filePath = resolvePath(projectName, file.filename);

    ensureDir(filePath);

    fs.writeFileSync(filePath, file.code);

    log.save("FILE", `Saved → ${filePath}`);
}

// ── Save documentation for a file ──

function saveDocs(projectName, file) {
    const docPath = path.join(BASE, projectName, "docs", file.filename + ".md");

    ensureDir(docPath);

    const content = `# ${file.filename}\n\n${file.explanation}\n`;

    fs.writeFileSync(docPath, content);

    log.save("FILE", `Docs → ${docPath}`);
}

module.exports = { saveFile, saveDocs };