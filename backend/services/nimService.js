// ─────────────────────────────────────────────
// SYNAPSE — NVIDIA NIM Service (Fallback LLM)
// OpenAI-compatible API pointed at NVIDIA's endpoint
// Model: meta/llama-3.1-8b-instruct
// Token-efficient: task-aware budgets
// ─────────────────────────────────────────────

const OpenAI = require("openai");
const log = require("../utils/logger");

const nim = new OpenAI({
    apiKey: process.env.NVIDIA_NIM_API_KEY,
    baseURL: "https://integrate.api.nvidia.com/v1"
});

// ── Task-aware token budgets ──
const TOKEN_BUDGETS = {
    plan:     2000,
    execute:  4096,    // NIM model has lower limit
    review:   4096,
    debug:    4096,
    readme:   3000,
    generate: 4096
};

// ── Delay helper ──

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Main NIM call with retry ──

async function callNIM(prompt, options = {}, retries = 1) {
    const task = options?.task || "generate";
    const maxTokens = TOKEN_BUDGETS[task] || 3000;

    try {
        log.ai("NIM", `Sending request (task: ${task}, budget: ${maxTokens} tokens)...`);

        const response = await nim.chat.completions.create({
            model: "meta/llama-3.1-8b-instruct",
            messages: [
                {
                    role: "system",
                    content: "You are a senior full-stack developer. Follow all instructions precisely. Output only what is asked — no extra commentary."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: maxTokens,
            top_p: 0.9
        });

        const text = response.choices[0]?.message?.content || "";
        const usage = response.usage || {};

        log.success("NIM", `Response: ${text.length} chars | Tokens: ${usage.prompt_tokens || "?"} in → ${usage.completion_tokens || "?"} out`);

        return text;

    } catch (error) {
        log.error("NIM", `NIM error: ${error.message}`);

        if (retries > 0) {
            const waitTime = 2000;
            log.warn("NIM", `Retrying in ${waitTime / 1000}s... (${retries} retries left)`);
            await delay(waitTime);
            return callNIM(prompt, options, retries - 1);
        }

        log.error("NIM", "All retries exhausted — returning empty");
        return "";
    }
}

module.exports = callNIM;
