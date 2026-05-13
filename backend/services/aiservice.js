// ─────────────────────────────────────────────
// SYNAPSE — AI Service (Gemini API Wrapper)
// Single entry point for all LLM calls
// Model: gemini-2.5-flash (free, fast, accurate)
// ─────────────────────────────────────────────

const { GoogleGenAI } = require("@google/genai");
const log = require("../utils/logger");

// ── Key Pool Setup ──
const GEMINI_KEYS = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3
].filter(Boolean);

let currentKeyIndex = 0;

function getAIInstance() {
    return new GoogleGenAI({
        apiKey: GEMINI_KEYS[currentKeyIndex]
    });
}

// ── Delay helper for exponential backoff ──

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Main AI call with retry + backoff ──

async function callAI(prompt, options = {}, retries = 2) {
    try {
        const ai = getAIInstance();
        log.ai("AI", `Sending request to Gemini (Key index: ${currentKeyIndex})...`);

        let contentsParam;

        if (options.image) {
            log.ai("AI", "Image payload detected, using vision capabilities...");
            const base64Data = options.image.split(',')[1] || options.image;
            const mimeType = options.image.match(/data:(.*?);base64/)?.[1] || "image/png";

            contentsParam = [
                prompt,
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: mimeType
                    }
                }
            ];
        } else {
            contentsParam = prompt;
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contentsParam,
            config: {
                temperature: 0.2,
                topP: 0.9,
                maxOutputTokens: 65536
            }
        });

        log.success("AI", `Response received (${response.text?.length || 0} chars)`);

        return response.text;

    } catch (error) {
        log.error("AI", `Gemini error: ${error.message}`);
        
        // Handle Rate Limit or Quota Issues
        if (error.status === 429 || error.message.includes("429") || error.message.includes("quota")) {
            log.warn("AI", `Rate limit hit! Rotating to next Gemini key...`);
            currentKeyIndex = (currentKeyIndex + 1) % GEMINI_KEYS.length;
        }

        if (retries > 0) {
            const waitTime = (3 - retries) * 1500;

            log.warn("AI", `Retrying in ${waitTime / 1000}s... (${retries} retries left)`);

            await delay(waitTime);

            return callAI(prompt, options, retries - 1);
        }

        log.error("AI", "All retries exhausted — returning empty");

        return "";
    }
}

module.exports = callAI;