require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./database/connection');

async function wipe() {
    console.log("Wiping database and files...");
    try {
        // Disable foreign key checks temporarily to wipe everything cleanly
        await db.query('SET FOREIGN_KEY_CHECKS = 0');
        await db.query('TRUNCATE TABLE chat_messages');
        await db.query('TRUNCATE TABLE debug_sessions');
        await db.query('TRUNCATE TABLE generated_files');
        await db.query('TRUNCATE TABLE pipeline_steps');
        await db.query('TRUNCATE TABLE projects');
        await db.query('SET FOREIGN_KEY_CHECKS = 1');
        
        // Clear memory.json
        const memPath = path.join(__dirname, 'utils', 'memory.json');
        if (fs.existsSync(memPath)) fs.writeFileSync(memPath, '[]');
        
        // Clear output folder
        const outPath = path.join(__dirname, 'output');
        if (fs.existsSync(outPath)) {
            fs.rmSync(outPath, { recursive: true, force: true });
        }
        
        console.log("✅ Wiped all projects, databases, and files successfully!");
    } catch (err) {
        console.error("Error wiping:", err);
    }
    process.exit(0);
}

wipe();
