// ─────────────────────────────────────────────
// SYNAPSE — AI Router (Enhanced Multi-LLM Orchestrator)
// Routes AI calls to the right provider with token tracking
//   Gemini → Planning + Vision (most capable)
//   Groq   → Primary for execution/review/debug (fast)
//   NIM    → Fallback (when Groq fails)
// Token-efficient: passes task type for budget allocation
// ─────────────────────────────────────────────

const callGemini = require("./aiservice");
const callGroq = require("./groqService");
const callNIM = require("./nimService");
const log = require("../utils/logger");

// ── Routing Table ──
// Each task type has a primary, fallback1, and fallback2 provider

const ROUTES = {
    plan:     { primary: "gemini",  fallback1: "groq",  fallback2: null    },
    execute:  { primary: "groq",    fallback1: "nim",   fallback2: "gemini" },
    review:   { primary: "groq",    fallback1: "gemini", fallback2: null    },
    debug:    { primary: "groq",    fallback1: "nim",   fallback2: "gemini" },
    readme:   { primary: "groq",    fallback1: "nim",   fallback2: null    },
    generate: { primary: "groq",    fallback1: "nim",   fallback2: "gemini" }
};

// ── Provider Map ──

const PROVIDERS = {
    gemini: callGemini,
    groq:   callGroq,
    nim:    callNIM
};

// ── Token Usage Tracker ──
// Tracks cumulative token usage per session for monitoring

const tokenTracker = {
    totalCalls: 0,
    byTask: {},
    log(task) {
        this.totalCalls++;
        this.byTask[task] = (this.byTask[task] || 0) + 1;
    },
    getSummary() {
        return `Total API calls: ${this.totalCalls} | By task: ${JSON.stringify(this.byTask)}`;
    }
};

// ── Call a specific provider ──

async function callProvider(providerName, prompt, options) {
    const fn = PROVIDERS[providerName];

    if (!fn) {
        log.error("ROUTER", `Unknown provider: ${providerName}`);
        return "";
    }

    return await fn(prompt, options);
}

// ── Main Router Function ──
// Usage: callAI(prompt, { task: "execute" })

async function callAI(prompt, options = {}) {
    const task = options.task || "execute";
    const route = { ...ROUTES[task] } || { ...ROUTES.execute };

    // Track this call
    tokenTracker.log(task);

    if (options.image) {
        // If image is present, ONLY Gemini supports vision in our stack
        route.primary = "gemini";
        route.fallback1 = null;
        route.fallback2 = null;
    }

    log.info("ROUTER", `Task: "${task}" → Primary: ${route.primary} | ${tokenTracker.getSummary()}`);

    // Try primary
    let result = await callProvider(route.primary, prompt, options);

    if (result && result.trim().length > 0) {
        return result;
    }

    // Try fallback 1
    if (route.fallback1) {
        log.warn("ROUTER", `Primary (${route.primary}) failed → trying fallback: ${route.fallback1}`);
        result = await callProvider(route.fallback1, prompt, options);

        if (result && result.trim().length > 0) {
            return result;
        }
    }

    // Try fallback 2
    if (route.fallback2) {
        log.warn("ROUTER", `Fallback1 (${route.fallback1}) failed → trying fallback2: ${route.fallback2}`);
        result = await callProvider(route.fallback2, prompt, options);

        if (result && result.trim().length > 0) {
            return result;
        }
    }

    log.error("ROUTER", "All providers exhausted — returning empty");
    return "";
}

module.exports = { callAI };
