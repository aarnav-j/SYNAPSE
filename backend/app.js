require("dotenv").config();
const express = require("express");
const app = express();
const plannerAgent = require("./agents/planner");
const executorAgent = require("./agents/executor");


const { saveCode, saveDocs } = require("./utils/fileManager");

app.use(express.json());

app.post("/prompt", async (req, res) => {
    console.log("🔥 Request received");

    const { prompt } = req.body;

    try {
        const plan = await plannerAgent(prompt);

        const tasks = plan.coreFeaturePlan;

        if (!tasks || tasks.length === 0) {
            return res.json({
                success: false,
                error: "No tasks generated"
            });
        }

        const results = [];

        // 🔥 SEQUENTIAL EXECUTION (IMPORTANT)
        for (let i = 0; i < tasks.length; i++) {
            const taskObj = tasks[i];

            const result = await executorAgent(
                taskObj.task,
                tasks,
                prompt,
                i,
                tasks.length
            );
            // 💾 SAVE CODE TO FILE
            saveCode(taskObj.task, result.code);

            // 📝 SAVE EXPLANATION
            saveDocs(taskObj.task, result.explanation);

            results.push({
                step: taskObj.step,
                task: taskObj.task,
                code: result.code,
                explanation: result.explanation
            });
        }

        res.json({
            success: true,
            basePlan: plan.basePlan,
            execution: results,
            message: "Files generated in /output folder"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: "Something went wrong"
        });
    }
});

app.listen(3005, () => {
    console.log("🚀 Server running on port 3005");
});