// ─────────────────────────────────────────────
// SYNAPSE — JWT Auth Middleware
// Verifies Bearer token and attaches user to req
// ─────────────────────────────────────────────

const jwt = require("jsonwebtoken");
const log = require("../utils/logger");

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            error: "Access denied. No token provided. Send: Authorization: Bearer <token>"
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { userId, username, email }
        next();
    } catch (err) {
        log.warn("AUTH", `Invalid token: ${err.message}`);
        return res.status(401).json({
            success: false,
            error: "Invalid or expired token. Please login again."
        });
    }
}

module.exports = authMiddleware;
