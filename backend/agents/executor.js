const callLocalAI = require("../services/service");

function extractCodeAndExplanation(raw) {
    if (!raw) return { code: "", explanation: "" };

    // Extract code starting from first real code keyword
    const codeMatch = raw.match(/(const|import|function|export)[\s\S]*/);


    // Everything BEFORE code = explanation
    const index = raw.search(/(const|import|function|export)/);
    const code = index !== -1 ? raw.slice(index).trim() : "";
    const explanation = index !== -1 ? raw.slice(0, index).trim() : raw.trim();

    return { code, explanation };
}
function buildExecutorPrompt(plan, task, index, total) {
    return `
You are a code generation engine. You output raw source code only.

STRICT RULES:
- Output raw code only. No explanations. No markdown.
- Minimal comments allowed for clarity
- Do NOT write \`\`\` or code fences.
- Do NOT write sentences.
- Do NOT mix frontend/backend.
- If task contains "server", "route", "Express" → Node.js only.
- If task contains ".jsx" or "React" → React only.
- Write complete working code.
- No placeholders. No TODOs.
- Code must run without modification.

FULL PROJECT PLAN:
${plan.map((t, i) => `${i + 1}. ${t.task}`).join("\n")}

YOUR TASK (${index + 1} of ${total}):
${task}

ASSUMPTION: Other tasks handled separately.

Start directly with code.
If output is not pure code, return nothing.
`;
}

async function executorAgent(task, plan, prompt, index, total) {
    console.log("⚙️ Executing task:", task);

    const finalPrompt = buildExecutorPrompt(plan, task, index, total);

    const aiResponse = await callLocalAI(finalPrompt);

    const { code, explanation } = extractCodeAndExplanation(aiResponse);

    return { code, explanation };
}

module.exports = executorAgent;