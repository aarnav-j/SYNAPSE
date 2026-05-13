const db = require("./database/connection");
const fs = require("fs");

async function check() {
    const memory = JSON.parse(fs.readFileSync("./output/memory.json", "utf-8"));
    const runs = memory.runs;
    const lastRun = runs[runs.length - 1];
    
    console.log("Last Run ID:", lastRun.id);
    console.log("Tasks planned:");
    lastRun.tasks.forEach(t => console.log(t.task));
    
    console.log("Files generated:");
    lastRun.files.forEach(f => console.log(f.filename));

    process.exit(0);
}
check();
