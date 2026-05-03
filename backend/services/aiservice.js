// ─────────────────────────────────────────────
// SYNAPSE — AI Service (Gemini API Wrapper)
// Single entry point for all LLM calls
// Model: gemini-2.5-flash (free, fast, accurate)
// ─────────────────────────────────────────────

const { GoogleGenAI } = require("@google/genai");
const log = require("../utils/logger");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// ── Delay helper for exponential backoff ──

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Main AI call with retry + backoff ──

async function callAI(prompt, retries = 2) {
    try {
        log.ai("AI", "Sending request to Gemini...");

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.2,
                topP: 0.9,
                maxOutputTokens: 8192
            }
        });

        log.success("AI", "Response received");

        return response.text;

    } catch (error) {
        log.error("AI", `Gemini error: ${error.message}`);

        if (retries > 0) {
            const waitTime = (3 - retries) * 1500;

            log.warn("AI", `Retrying in ${waitTime / 1000}s... (${retries} retries left)`);

            await delay(waitTime);

            return callAI(prompt, retries - 1);
        }

        log.error("AI", "All retries exhausted — returning empty");

        return "";
    }
}

module.exports = callAI;