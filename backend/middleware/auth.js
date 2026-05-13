// ─────────────────────────────────────────────
// SYNAPSE — JWT Auth Middleware
// Verifies Bearer token and attaches user to req
// ─────────────────────────────────────────────

const jwt = require("jsonwebtoken");
const log = require("../utils/logger");

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
    } else if (req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            error: "Access denied. No token provided. Send: Authorization: Bearer <token>"
        });
    }

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
