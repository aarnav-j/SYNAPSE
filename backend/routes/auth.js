// ─────────────────────────────────────────────
// SYNAPSE — Auth Routes (Register + Login)
// POST /auth/register — create new user
// POST /auth/login    — get JWT token
// ─────────────────────────────────────────────

const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../database/connection");
const log = require("../utils/logger");

const router = express.Router();

// ── POST /auth/register ──

router.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                error: "username, email, and password are all required"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: "Password must be at least 6 characters"
            });
        }

        // Check if user exists
        const existing = await db.getUserByEmail(email);

        if (existing) {
            return res.status(409).json({
                success: false,
                error: "A user with this email already exists"
            });
        }

        // Hash password and create user
        const passwordHash = await bcrypt.hash(password, 10);
        const userId = await db.createUser({ username, email, passwordHash });

        log.success("AUTH", `New user registered: ${username} (ID: ${userId})`);

        // Generate token immediately so they don't have to login separately
        const token = jwt.sign(
            { userId, username, email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            userId,
            token
        });

    } catch (err) {
        log.error("AUTH", `Registration failed: ${err.message}`);
        res.status(500).json({ success: false, error: "Registration failed" });
    }
});

// ── POST /auth/login ──

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: "email and password are required"
            });
        }

        // Find user
        const user = await db.getUserByEmail(email);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: "Invalid email or password"
            });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password_hash);

        if (!isValid) {
            return res.status(401).json({
                success: false,
                error: "Invalid email or password"
            });
        }

        // Update last login
        await db.updateLastLogin(user.id);

        // Generate token
        const token = jwt.sign(
            { userId: user.id, username: user.username, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        log.success("AUTH", `User logged in: ${user.username}`);

        res.json({
            success: true,
            message: "Login successful",
            userId: user.id,
            username: user.username,
            token
        });

    } catch (err) {
        log.error("AUTH", `Login failed: ${err.message}`);
        res.status(500).json({ success: false, error: "Login failed" });
    }
});

module.exports = router;
