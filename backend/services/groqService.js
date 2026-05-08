// ─────────────────────────────────────────────
// SYNAPSE — Groq Service (Primary LLM)
// Handles 80-90% of all AI calls
// Model: llama-3.3-70b-versatile (fast + capable)
// ─────────────────────────────────────────────

const Groq = require("groq-sdk");
const log = require("../utils/logger");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// ── Delay helper ──

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Main Groq call with retry ──

async function callGroq(prompt, retries = 2) {
    try {
        log.ai("GROQ", "Sending request to Groq (LLaMA 3.3 70B)...");

        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
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
            temperature: 0.2,
            max_tokens: 4000,
            top_p: 0.9
        });

        const text = response.choices[0]?.message?.content || "";

        log.success("GROQ", `Response received (${text.length} chars)`);

        return text;

    } catch (error) {
        log.error("GROQ", `Groq error: ${error.message}`);

        if (retries > 0) {
            const waitTime = (3 - retries) * 1500;
            log.warn("GROQ", `Retrying in ${waitTime / 1000}s... (${retries} retries left)`);
            await delay(waitTime);
            return callGroq(prompt, retries - 1);
        }

        log.error("GROQ", "All retries exhausted — returning empty");
        return "";
    }
}

module.exports = callGroq;
