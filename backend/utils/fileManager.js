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
    let type = resolveFileType(filename);
    
    // Strip frontend/ or backend/ prefix if the AI included it
    let cleanFilename = filename;
    if (filename.startsWith("frontend/")) cleanFilename = filename.replace("frontend/", "");
    if (filename.startsWith("backend/")) cleanFilename = filename.replace("backend/", "");
    if (filename.startsWith("docs/")) cleanFilename = filename.replace("docs/", "");

    return path.join(BASE, projectName, type, cleanFilename);
}

// ── Save a generated code file ──

function saveFile(projectName, file) {
    // Never save node_modules or package-lock files
    if (file.filename.includes("node_modules") || file.filename.includes("package-lock")) return;

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

// ── Determine file type for database storage ──

function resolveFileType(filename) {
    if (filename.endsWith(".md") || filename.startsWith("docs/")) return "docs";
    if (filename.startsWith("frontend/") || filename.endsWith(".html") || filename.endsWith(".css") || filename.includes("frontend")) {
        return "frontend";
    }
    return "backend";
}
// ── Generate package.json for Frontend and Backend ──

function createPackageJsons(projectName, files) {
    const backendDeps = new Set(["express", "cors", "dotenv"]);
    let hasFrontend = false;

    // Scan for dependencies and frontend existence
    files.forEach(f => {
        const type = resolveFileType(f.filename);
        if (type === "frontend") hasFrontend = true;
        if (type === "backend" && f.code) {
            const requires = f.code.match(/require\(['"]([^./][^'"]*)['"]\)/g) || [];
            requires.forEach(r => {
                const mod = r.match(/require\(['"]([^'"]+)['"]\)/);
                if (mod && mod[1] && !mod[1].startsWith(".") && !mod[1].startsWith("node:")) {
                    backendDeps.add(mod[1]);
                }
            });
        }
    });

    // 1. Write Backend package.json
    const backendDir = path.join(BASE, projectName, "backend");
    ensureDir(path.join(backendDir, "package.json"));
    
    const backendDepObj = {};
    backendDeps.forEach(d => { backendDepObj[d] = "latest"; });

    const backendPkg = {
        name: `${projectName}-backend`,
        version: "1.0.0",
        main: "server.js",
        scripts: { start: "node server.js", dev: "nodemon server.js" },
        dependencies: backendDepObj
    };
    const pkgJsonString = JSON.stringify(backendPkg, null, 2);
    fs.writeFileSync(path.join(backendDir, "package.json"), pkgJsonString);

    // Return the generated file so queue can save it to DB
    return {
        filename: "backend/package.json",
        explanation: "Auto-generated package.json with dependencies scanned from source code.",
        code: pkgJsonString
    };
}

module.exports = { saveFile, saveDocs, resolveFileType, createPackageJsons };