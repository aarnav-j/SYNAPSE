// ─────────────────────────────────────────────
// SYNAPSE — Batch Output Parser (Hardened)
// Parses <FILE> tagged output from executor/reviewer
// Handles multiple format variations from the AI
// Strips markdown backticks, explanation leaks, etc.
// ─────────────────────────────────────────────

function parseBatchOutput(raw) {
    if (!raw || raw.trim().length === 0) return [];

    // Pre-clean: remove markdown code fences the AI might wrap around blocks
    let cleaned = raw
        .replace(/```[\w]*\n?/g, "")  // Remove ```js, ```html, etc.
        .replace(/```/g, "");          // Remove closing ```

    const results = [];

    // Helper to clean code based on file type
    function cleanCode(filename, code) {
        if (filename.endsWith('.json')) {
            // Remove JS-style comments (// ...) and block comments (/* ... */) from JSON
            return code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
        }
        return code;
    }

    // ── Primary regex: full <FILE> <EXPLANATION> <CODE> format ──
    const fullRegex = /<FILE:\s*([\w\   -./]+\.(\w{1,5}))\s*>\s*<EXPLANATION>([\s\S]*?)<\/EXPLANATION>\s*<CODE>([\s\S]*?)<\/CODE>\s*<\/FILE>/gi;

    let match;

    while ((match = fullRegex.exec(cleaned)) !== null) {
        const code = match[4].trim();
        const filename = match[1].trim();

        // Skip node_modules and other junk
        if (filename.includes("node_modules") || filename.includes("package-lock")) continue;

        if (code.length > 0) {
            results.push({
                filename: filename,
                explanation: match[3].trim(),
                code: cleanCode(filename, code)
            });
        }
    }

    if (results.length > 0) return results;

    // ── Fallback regex: <FILE> <CODE> (allows explanatory text before/after CODE) ──
    const codeOnlyRegex = /<FILE:\s*([\w\-./]+\.(\w{1,5}))\s*>[\s\S]*?<CODE>([\s\S]*?)<\/CODE>[\s\S]*?<\/FILE>/gi;

    while ((match = codeOnlyRegex.exec(cleaned)) !== null) {
        const code = match[3].trim();
        const filename = match[1].trim();

        if (filename.includes("node_modules") || filename.includes("package-lock")) continue;

        if (code.length > 0) {
            results.push({
                filename: filename,
                explanation: "",
                code: cleanCode(filename, code)
            });
        }
    }

    if (results.length > 0) return results;

    // ── Last resort: <FILE> with any content between tags ──
    const looseRegex = /<FILE:\s*([\w\-./]+\.(\w{1,5}))\s*>([\s\S]*?)<\/FILE>/gi;

    while ((match = looseRegex.exec(cleaned)) !== null) {
        let content = match[3].trim();
        const filename = match[1].trim();

        if (filename.includes("node_modules") || filename.includes("package-lock")) continue;

        // Strip explanation tags if present
        content = content.replace(/<EXPLANATION>[\s\S]*?<\/EXPLANATION>/gi, "").trim();
        content = content.replace(/<\/?CODE>/gi, "").trim();

        if (content.length > 10) {
            results.push({
                filename: filename,
                explanation: "",
                code: cleanCode(filename, content)
            });
        }
    }

    return results;
}

module.exports = { parseBatchOutput };