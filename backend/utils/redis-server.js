// ─────────────────────────────────────────────
// SYNAPSE — Redis Server Manager
// Automatically spins up an in-memory Redis instance
// if a local Redis server isn't running.
// ─────────────────────────────────────────────

const { RedisMemoryServer } = require("redis-memory-server");
const log = require("./logger");

let redisServer = null;

async function startRedis() {
    log.info("REDIS", "Starting local Redis server...");
    try {
        redisServer = new RedisMemoryServer({
            instance: { port: 6379 } // Force default port for easy connection
        });
        
        const host = await redisServer.getHost();
        const port = await redisServer.getPort();
        
        log.success("REDIS", `Started successfully on redis://${host}:${port}`);
        return { host, port };
    } catch (err) {
        log.error("REDIS", `Failed to start in-memory Redis: ${err.message}`);
        // If it fails, maybe a real Redis is already running on 6379
        return { host: "127.0.0.1", port: 6379 };
    }
}

async function stopRedis() {
    if (redisServer) {
        await redisServer.stop();
        log.info("REDIS", "Stopped local Redis server");
    }
}

module.exports = { startRedis, stopRedis };
