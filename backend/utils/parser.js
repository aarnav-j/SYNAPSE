function extractCode(raw) {
    if (!raw) return "";

    const match = raw.match(/(const|import|function|export)[\s\S]*/);
    return match ? match[0].trim() : "";
}

function extractExplanation(raw) {
    if (!raw) return "";

    const index = raw.search(/(const|import|function|export)/);

    if (index === -1) return raw.trim();

    return raw.slice(0, index).trim();
}

module.exports = {
    extractCode,
    extractExplanation
};