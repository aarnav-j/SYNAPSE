// ─────────────────────────────────────────────
// SYNAPSE — Batch Output Parser
// Parses <FILE> tagged output from executor/reviewer
// Handles multiple format variations from the AI
// ─────────────────────────────────────────────

function parseBatchOutput(raw) {
    if (!raw || raw.trim().length === 0) return [];

    const results = [];

    // ── Primary regex: full <FILE> <EXPLANATION> <CODE> format ──

    const fullRegex = /<FILE:\s*([\w\-./]+\.(js|jsx))\s*>\s*<EXPLANATION>([\s\S]*?)<\/EXPLANATION>\s*<CODE>([\s\S]*?)<\/CODE>\s*<\/FILE>/gi;

    let match;

    while ((match = fullRegex.exec(raw)) !== null) {
        const code = match[4].trim();

        if (code.length > 0) {
            results.push({
                filename: match[1].trim(),
                explanation: match[3].trim(),
                code: code
            });
        }
    }

    if (results.length > 0) return results;

    // ── Fallback regex: <FILE> <CODE> only (no explanation) ──

    const codeOnlyRegex = /<FILE:\s*([\w\-./]+\.(js|jsx))\s*>\s*<CODE>([\s\S]*?)<\/CODE>\s*<\/FILE>/gi;

    while ((match = codeOnlyRegex.exec(raw)) !== null) {
        const code = match[3].trim();

        if (code.length > 0) {
            results.push({
                filename: match[1].trim(),
                explanation: "",
                code: code
            });
        }
    }

    if (results.length > 0) return results;

    // ── Last resort: <FILE> with any content between tags ──

    const looseRegex = /<FILE:\s*([\w\-./]+\.(js|jsx))\s*>([\s\S]*?)<\/FILE>/gi;

    while ((match = looseRegex.exec(raw)) !== null) {
        let content = match[3].trim();

        // Strip explanation tags if present
        content = content.replace(/<EXPLANATION>[\s\S]*?<\/EXPLANATION>/gi, "").trim();
        content = content.replace(/<\/?CODE>/gi, "").trim();

        if (content.length > 10) {
            results.push({
                filename: match[1].trim(),
                explanation: "",
                code: content
            });
        }
    }

    return results;
}

module.exports = { parseBatchOutput };