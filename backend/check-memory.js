const fs = require("fs");
const path = require("path");

function checkMemory() {
    const memDir = path.join(__dirname, "memory");
    const files = fs.readdirSync(memDir).sort().reverse();
    if (files.length === 0) return console.log("No memory files found");
    
    const lastRun = JSON.parse(fs.readFileSync(path.join(memDir, files[0]), "utf-8"));
    console.log("Run ID:", lastRun.id);
    console.log("Status:", lastRun.status);
    console.log("\nTasks:");
    lastRun.tasks.forEach(t => console.log(t.task));
    
    console.log("\nFiles Generated:");
    lastRun.files.forEach(f => console.log(f.filename));
    
    process.exit(0);
}
checkMemory();
