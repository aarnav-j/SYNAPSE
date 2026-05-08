// ─────────────────────────────────────────────
// SYNAPSE — NVIDIA NIM Service (Fallback LLM)
// OpenAI-compatible API pointed at NVIDIA's endpoint
// Model: meta/llama-3.1-8b-instruct
// Used when Groq is unavailable
// ─────────────────────────────────────────────

const OpenAI = require("openai");
const log = require("../utils/logger");

const nim = new OpenAI({
    apiKey: process.env.NVIDIA_NIM_API_KEY,
    baseURL: "https://integrate.api.nvidia.com/v1"
});

// ── Delay helper ──

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Main NIM call with retry ──

async function callNIM(prompt, retries = 1) {
    try {
        log.ai("NIM", "Sending request to NVIDIA NIM (LLaMA 3.1 8B)...");

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
            max_tokens: 4096,
            top_p: 0.9
        });

        const text = response.choices[0]?.message?.content || "";

        log.success("NIM", `Response received (${text.length} chars)`);

        return text;

    } catch (error) {
        log.error("NIM", `NIM error: ${error.message}`);

        if (retries > 0) {
            const waitTime = 2000;
            log.warn("NIM", `Retrying in ${waitTime / 1000}s... (${retries} retries left)`);
            await delay(waitTime);
            return callNIM(prompt, retries - 1);
        }

        log.error("NIM", "All retries exhausted — returning empty");
        return "";
    }
}

module.exports = callNIM;
