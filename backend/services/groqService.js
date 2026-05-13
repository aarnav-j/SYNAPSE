// ─────────────────────────────────────────────
// SYNAPSE — Groq Service (Multi-Key Rotation)
// Model: llama-3.3-70b-versatile
// Features:
//   - Multiple API key rotation (bypasses 12k TPM limit)
//   - Auto-switches key on rate limit (413/429)
//   - Task-aware token budgets restored to full
//   - Cooldown tracking per key
// ─────────────────────────────────────────────

const Groq = require("groq-sdk");
const log = require("../utils/logger");

// ── Load all available API keys ──
// Supports: GROQ_API_KEY, GROQ_API_KEY_2, GROQ_API_KEY_3, etc.

function loadApiKeys() {
    const keys = [];
    const seen = new Set();

    // Collect all GROQ_API_KEY variants from env
    const envKeys = [
        process.env.GROQ_API_KEY,
        process.env.GROQ_API_KEY_2,
        process.env.GROQ_API_KEY_3,
        process.env.GROQ_API_KEY_4,
        process.env.GROQ_API_KEY_5
    ];

    envKeys.forEach(key => {
        if (key && key.trim().length > 10 && !seen.has(key)) {
            seen.add(key);
            keys.push({
                apiKey: key.trim(),
                cooldownUntil: 0  // timestamp when this key becomes available again
            });
        }
    });

    if (keys.length === 0) {
        log.error("GROQ", "No GROQ API keys found in .env!");
    } else {
        log.info("GROQ", `Loaded ${keys.length} unique API key(s) for rotation`);
    }

    return keys;
}

const apiKeys = loadApiKeys();
let currentKeyIndex = 0;

// ── Get the next available key ──
// Skips keys that are in cooldown

function getNextKey() {
    const now = Date.now();
    const totalKeys = apiKeys.length;

    // Try each key starting from current index
    for (let i = 0; i < totalKeys; i++) {
        const idx = (currentKeyIndex + i) % totalKeys;
        const key = apiKeys[idx];

        if (now >= key.cooldownUntil) {
            currentKeyIndex = (idx + 1) % totalKeys; // advance for next call
            return { index: idx, apiKey: key.apiKey };
        }
    }

    // All keys in cooldown — find the one that recovers soonest
    let soonestIdx = 0;
    let soonestTime = Infinity;
    apiKeys.forEach((k, i) => {
        if (k.cooldownUntil < soonestTime) {
            soonestTime = k.cooldownUntil;
            soonestIdx = i;
        }
    });

    const waitMs = soonestTime - now;
    log.warn("GROQ", `All keys in cooldown — shortest wait: ${Math.ceil(waitMs / 1000)}s (key ${soonestIdx + 1})`);
    currentKeyIndex = (soonestIdx + 1) % totalKeys;
    return { index: soonestIdx, apiKey: apiKeys[soonestIdx].apiKey, waitMs };
}

// ── Put a key in cooldown ──

function cooldownKey(index, durationMs) {
    if (apiKeys[index]) {
        apiKeys[index].cooldownUntil = Date.now() + durationMs;
        log.warn("GROQ", `Key ${index + 1} in cooldown for ${Math.ceil(durationMs / 1000)}s`);
    }
}

// ── Task-aware token budgets (RESTORED to full) ──

const TOKEN_BUDGETS = {
    plan:     2000,    // Plan output is short
    execute:  8000,    // Full code generation needs maximum tokens
    review:   8000,    // Review rewrites all files
    debug:    8000,    // Debug needs room for file rewrites
    readme:   3000,    // README is a few paragraphs
    generate: 8000     // General generation
};

// ── Delay helper ──

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Main Groq call with key rotation + retry ──

async function callGroq(prompt, options = {}, retries = 2) {
    const task = options?.task || "generate";
    const maxTokens = TOKEN_BUDGETS[task] || 4000;

    if (apiKeys.length === 0) {
        log.error("GROQ", "No API keys available");
        return "";
    }

    // Get next available key
    const keyInfo = getNextKey();

    // If all keys are in cooldown, wait for the soonest one
    if (keyInfo.waitMs && keyInfo.waitMs > 0) {
        const waitTime = Math.min(keyInfo.waitMs + 500, 65000); // cap at 65s
        log.warn("GROQ", `Waiting ${Math.ceil(waitTime / 1000)}s for key cooldown...`);
        await delay(waitTime);
    }

    const client = new Groq({ apiKey: keyInfo.apiKey });

    try {
        log.ai("GROQ", `Sending request (task: ${task}, budget: ${maxTokens} tokens, key: ${keyInfo.index + 1}/${apiKeys.length})...`);

        const response = await client.chat.completions.create({
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
            max_tokens: maxTokens,
            top_p: 0.9
        });

        const text = response.choices[0]?.message?.content || "";
        const usage = response.usage || {};

        log.success("GROQ", `Response: ${text.length} chars | Tokens: ${usage.prompt_tokens || "?"} in → ${usage.completion_tokens || "?"} out (total: ${usage.total_tokens || "?"}) | Key: ${keyInfo.index + 1}`);

        return text;

    } catch (error) {
        const status = error.status || error.statusCode || 0;
        log.error("GROQ", `Groq error (key ${keyInfo.index + 1}): ${status} ${error.message}`);

        // Rate limit (429) or request too large (413) — rotate key
        if (status === 429 || status === 413) {
            // Put this key in cooldown (60s for TPM reset)
            cooldownKey(keyInfo.index, 60000);

            // Try the next key immediately if we have more keys
            const availableKeys = apiKeys.filter(k => Date.now() >= k.cooldownUntil);

            if (availableKeys.length > 0) {
                log.info("GROQ", `Rotating to next available key (${availableKeys.length} keys available)...`);
                return callGroq(prompt, options, retries);
            }

            // All keys exhausted — wait and retry with the soonest key
            if (retries > 0) {
                const nextKey = getNextKey();
                const waitTime = nextKey.waitMs ? Math.min(nextKey.waitMs + 500, 65000) : 5000;
                log.warn("GROQ", `All keys rate-limited — waiting ${Math.ceil(waitTime / 1000)}s... (${retries} retries left)`);
                await delay(waitTime);
                return callGroq(prompt, options, retries - 1);
            }

            log.error("GROQ", "All keys exhausted and retries depleted — returning empty");
            return "";
        }

        // Other errors — standard retry
        if (retries > 0) {
            const waitTime = (3 - retries) * 1500;
            log.warn("GROQ", `Retrying in ${waitTime / 1000}s... (${retries} retries left)`);
            await delay(waitTime);
            return callGroq(prompt, options, retries - 1);
        }

        log.error("GROQ", "All retries exhausted — returning empty");
        return "";
    }
}

module.exports = callGroq;
