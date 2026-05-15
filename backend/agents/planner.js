// ─────────────────────────────────────────────
// SYNAPSE — Planner Agent (Production v2)
// Deterministic JSON-based planning with full
// entity extraction, API contracts, dependency
// ordering, and multi-layer validation
// ─────────────────────────────────────────────

const { callAI } = require("../services/aiRouter");
const log = require("../utils/logger");

// ── Allowed packages whitelist ──

const ALLOWED_PACKAGES = new Set([
    "express", "cors", "dotenv", "bcryptjs",
    "jsonwebtoken", "multer", "express-validator",
    "socket.io", "better-sqlite3"
]);

// ── Forbidden technology patterns ──

const FORBIDDEN_PATTERNS = [
    /react/i, /vue/i, /angular/i, /typescript/i,
    /\.tsx/i, /\.jsx/i, /mongodb/i, /mongoose/i,
    /prisma/i, /next\.js/i, /nextjs/i, /vite/i,
    /webpack/i, /django/i, /flask/i, /php/i
];

// ── Fixed frontend file set ──

const MANDATORY_FRONTEND = [
    "frontend/index.html",
    "frontend/style.css",
    "frontend/app.js"
];

// ── Dependency order weight map ──
// Lower weight = must come first in execution

const FILE_ORDER_WEIGHTS = {
    "utils/":       10,
    "config/":      15,
    "middleware/":   20,
    "services/":    30,
    "routes/":      40,
    "server.js":    50,
    "frontend/":    60
};

// ── Get execution weight for sorting ──

function getFileWeight(filename) {
    for (const [prefix, weight] of Object.entries(FILE_ORDER_WEIGHTS)) {
        if (filename.startsWith(prefix) || filename === prefix.replace("/", "")) {
            return weight;
        }
    }
    return 45; // default: between routes and server
}

// ── Parse JSON from AI output ──

function extractJSON(raw) {
    // Strip markdown code fences if AI wraps output
    let cleaned = raw
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

    // Find first { and last } to extract JSON object
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        return null;
    }

    cleaned = cleaned.slice(firstBrace, lastBrace + 1);

    // Remove trailing commas before } or ] (common AI mistake)
    cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

    try {
        return JSON.parse(cleaned);
    } catch (e) {
        log.warn("PLANNER", `JSON parse failed: ${e.message}`);
        return null;
    }
}

// ── Validate parsed plan structure ──

function validatePlanSchema(plan) {
    const issues = [];

    if (!plan.projectType || typeof plan.projectType !== "string") {
        issues.push("Missing or invalid projectType");
    }

    if (!plan.architecture || typeof plan.architecture !== "object") {
        issues.push("Missing architecture block");
    }

    if (!Array.isArray(plan.tasks) || plan.tasks.length === 0) {
        issues.push("Missing or empty tasks array");
    }

    if (plan.tasks) {
        plan.tasks.forEach((t, i) => {
            if (!t.file) issues.push(`Task ${i + 1} missing 'file' field`);
            if (!t.purpose) issues.push(`Task ${i + 1} missing 'purpose' field`);
            if (t.file && !/[\w\-/]+\.\w{2,5}/.test(t.file)) {
                issues.push(`Task ${i + 1} has invalid filename: "${t.file}"`);
            }
        });
    }

    return issues;
}

// ── Scan for forbidden technologies ──

function scanForbidden(plan) {
    const violations = [];
    const raw = JSON.stringify(plan).toLowerCase();

    FORBIDDEN_PATTERNS.forEach(pattern => {
        if (pattern.test(raw)) {
            violations.push(`Forbidden technology detected: ${pattern.source}`);
        }
    });

    if (plan.tasks) {
        plan.tasks.forEach(t => {
            if (t.file) {
                if (/\.tsx$|\.jsx$|\.ts$/.test(t.file)) {
                    violations.push(`Forbidden file extension: ${t.file}`);
                }
                if (/components\/|pages\/|src\//.test(t.file)) {
                    violations.push(`Forbidden directory pattern: ${t.file}`);
                }
            }
        });
    }

    return violations;
}

// ── Detect duplicate file targets ──

function detectDuplicates(tasks) {
    const seen = new Map();
    const dupes = [];

    tasks.forEach((t, i) => {
        const normalized = t.file.toLowerCase().replace(/\\/g, "/");
        if (seen.has(normalized)) {
            dupes.push(`Duplicate file "${t.file}" at steps ${seen.get(normalized) + 1} and ${i + 1}`);
        } else {
            seen.set(normalized, i);
        }
    });

    return dupes;
}

// ── Validate dependency ordering ──

function validateDependencyOrder(tasks) {
    const issues = [];
    const completedFiles = new Set();

    tasks.forEach(t => {
        if (t.dependsOn && Array.isArray(t.dependsOn)) {
            t.dependsOn.forEach(dep => {
                if (!completedFiles.has(dep)) {
                    issues.push(`"${t.file}" depends on "${dep}" but it hasn't been created yet`);
                }
            });
        }
        completedFiles.add(t.file);
    });

    return issues;
}

// ── Sort tasks by dependency weight ──

function sortByDependencyOrder(tasks) {
    return [...tasks].sort((a, b) => {
        const weightA = getFileWeight(a.file);
        const weightB = getFileWeight(b.file);
        if (weightA !== weightB) return weightA - weightB;
        return (a.step || 0) - (b.step || 0);
    });
}

// ── Auto-inject missing mandatory files ──

function injectMissing(plan) {
    const existingFiles = new Set(
        (plan.tasks || []).map(t => t.file.toLowerCase().replace(/\\/g, "/"))
    );

    const injected = [];

    // Ensure server.js exists
    if (!existingFiles.has("server.js")) {
        injected.push({
            step: 0,
            file: "server.js",
            purpose: "Express app — cors, json, static serving, route mounting, error handler, start on process.env.PORT || 3000",
            dependsOn: []
        });
    }

    // Ensure all mandatory frontend files exist
    MANDATORY_FRONTEND.forEach(f => {
        if (!existingFiles.has(f)) {
            const purposes = {
                "frontend/index.html": "Semantic HTML5 layout — nav, main dashboard, modals, toast container",
                "frontend/style.css": "CSS design system — variables, components, animations, responsive",
                "frontend/app.js": "Client state management, API layer, DOM rendering, event delegation"
            };
            injected.push({
                step: 0,
                file: f,
                purpose: purposes[f],
                dependsOn: []
            });
        }
    });

    if (injected.length > 0) {
        plan.tasks = [...(plan.tasks || []), ...injected];
        log.warn("PLANNER", `Auto-injected ${injected.length} missing files: ${injected.map(i => i.file).join(", ")}`);
    }

    return plan;
}

// ── Convert validated plan into executor-compatible task array ──

function toExecutorTasks(plan) {
    const sorted = sortByDependencyOrder(plan.tasks);

    return sorted.map((t, i) => {
        // Build a rich task description from structured data
        let taskDescription = `Create ${t.file}`;

        if (t.purpose) {
            taskDescription += ` — ${t.purpose}`;
        }

        // Append dependency hint for the executor
        if (t.dependsOn && t.dependsOn.length > 0) {
            taskDescription += ` [imports: ${t.dependsOn.join(", ")}]`;
        }

        return {
            step: i + 1,
            task: taskDescription,
            filename: t.file,
            purpose: t.purpose || "",
            dependsOn: t.dependsOn || []
        };
    });
}

// ── Build planner system prompt ──

function buildPlannerPrompt(prompt) {
    return `You are SYNAPSE Planner — a senior software architect specialized in deterministic full-stack application planning.

Your job is ONLY to create a precise execution blueprint for the Executor Agent.

You do NOT generate code.
You do NOT explain architecture.
You ONLY define: file structure, API contracts, dependencies, execution order, shared entities.

STRICT TECH STACK:
Backend: Node.js, Express
Frontend: HTML, CSS, Vanilla JavaScript
Allowed packages: express, cors, dotenv, bcryptjs, jsonwebtoken, multer, express-validator, socket.io, better-sqlite3
FORBIDDEN: React, Vue, Angular, TypeScript, JSX, TSX, MongoDB, Mongoose, Prisma, Next.js, Vite, Webpack

PLANNING RULES:
1. ONE TASK = ONE FILE. Never combine multiple files.
2. USE EXACT FILENAMES with full path and extension. GOOD: routes/auth.js BAD: auth routes
3. EXECUTION ORDER MATTERS. Dependencies must appear before dependent files.
   Correct order: utils → config → middleware → services → routes → server.js → frontend
4. FRONTEND FILES ARE FIXED: frontend/index.html, frontend/style.css, frontend/app.js
   Never create components/, pages/, .jsx, .tsx
5. server.js must: configure express, register middleware, mount routes, serve frontend statically, include global error handler, start server on process.env.PORT || 3000
6. API CONTRACT RULES: Every route file must define HTTP methods, paths, purpose
7. SHARED LOGIC RULE: Reusable logic goes into utils/, services/, middleware/. Never duplicate logic across routes.
8. TOKEN OPTIMIZATION: Keep descriptions short and precise. Do NOT explain concepts.

OUTPUT FORMAT — Return ONLY valid JSON, no markdown, no explanations, no comments, no trailing commas:

{
  "projectType": "string describing the app type",
  "architecture": {
    "hasAuth": boolean,
    "hasDatabase": boolean,
    "hasRealtime": boolean
  },
  "entities": [
    {
      "name": "EntityName",
      "fields": ["id", "field1", "field2"]
    }
  ],
  "api": [
    {
      "method": "POST",
      "path": "/api/resource",
      "purpose": "Short purpose"
    }
  ],
  "tasks": [
    {
      "step": 1,
      "file": "utils/dataStore.js",
      "purpose": "In-memory CRUD helpers for all entities",
      "dependsOn": []
    }
  ]
}

QUALITY REQUIREMENTS:
- Include server.js and all 3 frontend files
- Include dependency order in tasks
- Include all API routes
- Include reusable utilities
- Support production-grade structure
- 7 to 12 tasks maximum
- Output ONLY valid JSON

Project Request:
${prompt}`;
}

// ── Fallback: parse numbered list (backward compat) ──

function parseNumberedList(raw) {
    log.warn("PLANNER", "Falling back to numbered-list parser...");

    return raw
        .split("\n")
        .map(l => l.trim())
        .filter(l => /^\d+\.\s/.test(l))
        .map(l => l.replace(/^\d+\.\s/, ""))
        .filter(l => l.length > 5 && l.length < 300)
        .map((task, i) => {
            const filenameMatch = task.match(/[\w\-/]+\.\w{2,5}/);
            return {
                step: i + 1,
                task,
                filename: filenameMatch ? filenameMatch[0] : `file_${i + 1}.js`,
                purpose: task,
                dependsOn: []
            };
        });
}

// ── Main Planner Function ──

async function plannerAgent(prompt) {
    log.step("PLANNER", "Started...");

    const plannerPrompt = buildPlannerPrompt(prompt);

    const raw = await callAI(plannerPrompt, { task: "plan" });

    log.ai("PLANNER", "Raw output received");

    // ── Guard: empty response ──

    if (!raw || raw.trim().length === 0) {
        log.error("PLANNER", "AI returned empty response");
        return getFallbackPlan();
    }

    // ── Attempt JSON parse ──

    let plan = extractJSON(raw);
    let tasks;

    if (plan && plan.tasks && plan.tasks.length > 0) {
        log.success("PLANNER", "Structured JSON plan parsed successfully");

        // ── Validation pipeline ──

        // 1. Schema validation
        const schemaIssues = validatePlanSchema(plan);
        if (schemaIssues.length > 0) {
            log.warn("PLANNER", `Schema issues: ${schemaIssues.join("; ")}`);
        }

        // 2. Forbidden tech scan
        const forbiddenViolations = scanForbidden(plan);
        if (forbiddenViolations.length > 0) {
            log.warn("PLANNER", `Forbidden tech detected: ${forbiddenViolations.join("; ")}`);
            // Remove tasks with forbidden file extensions
            plan.tasks = plan.tasks.filter(t => {
                return !/\.(tsx|jsx|ts)$/.test(t.file) && !/components\/|pages\/|src\//.test(t.file);
            });
        }

        // 3. Duplicate detection
        const duplicates = detectDuplicates(plan.tasks);
        if (duplicates.length > 0) {
            log.warn("PLANNER", `Duplicates found: ${duplicates.join("; ")}`);
            // De-duplicate: keep first occurrence
            const seen = new Set();
            plan.tasks = plan.tasks.filter(t => {
                const key = t.file.toLowerCase().replace(/\\/g, "/");
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        }

        // 4. Auto-inject missing mandatory files
        plan = injectMissing(plan);

        // 5. Validate & fix dependency ordering
        const depIssues = validateDependencyOrder(plan.tasks);
        if (depIssues.length > 0) {
            log.warn("PLANNER", `Dependency order issues (auto-fixing): ${depIssues.join("; ")}`);
        }

        // 6. Convert to executor-compatible format
        tasks = toExecutorTasks(plan);

        // Attach plan metadata for downstream agents
        tasks._planMeta = {
            projectType: plan.projectType || "unknown",
            architecture: plan.architecture || {},
            entities: plan.entities || [],
            api: plan.api || []
        };

    } else {
        // ── Fallback: try numbered list format ──
        log.warn("PLANNER", "JSON parse failed — attempting numbered list fallback");

        tasks = parseNumberedList(raw);

        if (!tasks.length) {
            log.warn("PLANNER", "All parsing failed — using emergency fallback plan");
            return getFallbackPlan();
        }

        // Validate and inject missing files for fallback path too
        const taskContent = tasks.map(t => t.task).join(" ");

        if (!taskContent.includes("server.js")) {
            tasks.push({
                step: tasks.length + 1,
                task: "Create server.js mounting all routes, cors, express.json, static frontend serving from ../frontend, error handler last, start on process.env.PORT || 3000",
                filename: "server.js",
                purpose: "Express app entry point",
                dependsOn: []
            });
        }

        MANDATORY_FRONTEND.forEach(f => {
            const basename = f.split("/").pop();
            if (!taskContent.includes(basename)) {
                const purposes = {
                    "index.html": "Semantic HTML5 layout — nav, main dashboard, modals, toast container",
                    "style.css": "CSS design system — variables, components, animations, responsive",
                    "app.js": "Client state management, API layer, DOM rendering, event delegation"
                };
                tasks.push({
                    step: tasks.length + 1,
                    task: `Create ${f} — ${purposes[basename]}`,
                    filename: f,
                    purpose: purposes[basename],
                    dependsOn: []
                });
            }
        });
    }

    log.success("PLANNER", `Final plan: ${tasks.length} tasks → [${tasks.map(t => t.filename).join(", ")}]`);

    return tasks;
}

// ── Emergency fallback plan ──

function getFallbackPlan() {
    log.warn("PLANNER", "Using emergency fallback plan");

    return [
        { step: 1, task: "Create utils/dataStore.js — in-memory data arrays with generateId and CRUD helpers", filename: "utils/dataStore.js", purpose: "In-memory data store", dependsOn: [] },
        { step: 2, task: "Create middleware/errorHandler.js — global Express error handler", filename: "middleware/errorHandler.js", purpose: "Error handling middleware", dependsOn: [] },
        { step: 3, task: "Create server.js — Express app, cors, json, static serving, route mounting, error handler, start on process.env.PORT || 3000", filename: "server.js", purpose: "Express entry point", dependsOn: [] },
        { step: 4, task: "Create frontend/index.html — semantic HTML5 layout with nav, main area, modals, toast container", filename: "frontend/index.html", purpose: "HTML layout", dependsOn: [] },
        { step: 5, task: "Create frontend/style.css — CSS variables, components, animations, responsive design", filename: "frontend/style.css", purpose: "Styling", dependsOn: [] },
        { step: 6, task: "Create frontend/app.js — state management, API layer, DOM rendering, event delegation, toasts", filename: "frontend/app.js", purpose: "Client logic", dependsOn: [] }
    ];
}

module.exports = plannerAgent;