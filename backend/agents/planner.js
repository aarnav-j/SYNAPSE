const callLocalAI = require("../services/service");

function parsePlannerOutput(raw) {
    return raw
        .split("\n")
        .map(line => line.trim())
        .filter(line => /^\d+[\.\)]\s+\S/.test(line))
        .map(line => line.replace(/^\d+[\.\)]\s+/, "").trim())
        .filter(line => line.length > 5 && line.length < 120)
        .filter(line => !line.startsWith("//") && !line.startsWith("#"))
        .slice(0, 5)
        .map((task, index) => ({
            step: index + 1,
            task
        }));
}
function normalizeTasks(tasks, prompt) {
    return tasks.map(t => {
        let task = t.task;

        if (prompt.toLowerCase().includes("chat")) {
            task = task.replace(/video/gi, "message");
            task = task.replace(/VideoPlayer/gi, "ChatBox");
        }

        if (prompt.toLowerCase().includes("ecommerce")) {
            task = task.replace(/video/gi, "product");
            task = task.replace(/VideoPlayer/gi, "ProductCard");
        }

        return {
            ...t,
            task
        };
    });
}

async function plannerAgent(prompt) {
    console.log("🧠 Planner started...");

    const basePlan = [
        "Setup project structure",
        "Create backend server",
        "Create frontend UI",
        "Implement core feature",
        "Testing and deployment"
    ];

    const plannerPrompt = `
You are a code task planner. Your only job is to output a numbered list of coding tasks.

TECH STACK RULES (STRICT):
- Use ONLY Node.js (Express) for backend
- Use ONLY React (.jsx) for frontend
- NEVER use PHP, Laravel, Python, Django, Flask, Java, or any other language/framework

RULES (never break these):
- Output ONLY a numbered list. Nothing else.
- Each line must start with a number, a period, and a space: "1. "
- Maximum 5 tasks.
- Each task must name a specific file or function to implement.
- Each task must be 10 words or fewer.
- Do NOT write explanations, comments, headers, or blank lines.
- Do NOT use bullet points, dashes, or asterisks.
- Do NOT write "Step", "Task", "//", "#", or any prefix other than the number.
- Do NOT include design tasks, planning tasks, or testing tasks.
- Tasks must be purely about writing code that can be executed.

BAD OUTPUT (never do this):
- Set up the project
- Design the UI layout
// Step 1: Create server
* Install dependencies
BAD OUTPUT:
- Laravel
- Python backend
- Generic steps

GOOD OUTPUT (always do this):
1. Create server.js with Express and listen on port 3000
2. Add GET /videos route returning JSON array in server.js
3. Add POST /upload route with multer middleware in server.js
4. Create VideoPlayer.jsx rendering an HTML5 video tag
5. Create App.jsx fetching /videos and rendering VideoPlayer list

Now output the task list for this project:
${prompt}
`;


    const aiResponse = await callLocalAI(plannerPrompt);

    console.log("🤖 Raw AI response:", aiResponse);

    const parsedTasks = parsePlannerOutput(aiResponse);
    const finalTasks = normalizeTasks(parsedTasks, prompt);

    if (finalTasks.length === 0) {
        return {
            basePlan,
            coreFeaturePlan: [
                { step: 1, task: "Create server.js Express app listening on port 3000" }
            ]
        };
    }

    return {
        basePlan,
        coreFeaturePlan: finalTasks
    };
}

module.exports = plannerAgent;