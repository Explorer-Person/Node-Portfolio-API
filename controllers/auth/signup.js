const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { AdminModel, SessionModel } = require("#models");

/** Utility: consistent API shape */
const ok = (res, data = null, message = "OK", status = 200, meta = undefined) =>
    res.status(status).json({ ok: true, message, data, ...(meta ? { meta } : {}) });

const fail = (res, message = "Bad Request", status = 400, details = undefined) =>
    res.status(status).json({ ok: false, message, ...(details ? { details } : {}) });

// ---- config (keep same as your login controller) ----
const ACCESS_TTL_S = 15 * 60;                         // 15 minutes
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;      // 30 days
const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TTL_MS,
};

// ---- tiny helpers ----
const emailOk = (s = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const genRefresh = () => crypto.randomBytes(48).toString("base64url");
const hashToken = (t) => crypto.createHash("sha256").update(t).digest("hex");
const makeExpiry = (ms) => new Date(Date.now() + ms);
const signAccess = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL_S });

// keep your ok/fail helpers in scope

exports.createAdmin = async (req, res) => {
    try {
        const body = req.body || {};
        const username = String(body.username || "").trim();
        const email = String(body.email || "").trim().toLowerCase();
        const phone = String(body.phone || "").trim();
        const password = String(body.password || "");

        // 1) basic validations
        const errs = [];
        if (username.length < 3) errs.push("Username must be at least 3 chars.");
        if (!emailOk(email)) errs.push("Invalid email.");
        if (password.length < 8) errs.push("Password must be at least 8 chars.");
        if (errs.length) return fail(res, "Validation error", 422, { errors: errs });

        // 2) allow only one admin (your current rule) — faster check
        const already = await AdminModel.exists({});
        if (already) return fail(res, "Admin already exists", 409);

        // 3) hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // 4) build payload (String _id is required by your schema)
        const id = body.id ? String(body.id) : uuidv4();
        const payload = {
            _id: id,
            fk: "0",
            username,
            password: passwordHash,   // store HASH, not plain
            email,
            phone,
        };

        const doc = await AdminModel.create(payload);

        // 5) sanitize response
        const safe = {
            _id: doc._id,
            fk: doc.fk,
            username: doc.username,
            email: doc.email,
            phone: doc.phone,
            createdAt: doc.createdAt,
        };

        // 6) OPTIONAL: auto-login after signup
        const autoLogin = true; // toggle if you want
        if (autoLogin) {
            const sessionId = uuidv4();
            const refresh = genRefresh();
            const refreshHash = hashToken(refresh);
            const expiresAt = makeExpiry(REFRESH_TTL_MS);

            await SessionModel.create({
                admin: doc._id,               // String ref to Admin
                sessionId,
                refreshTokenHash: refreshHash,
                userAgent: req.headers["user-agent"] || "",
                ip: (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() || req.socket.remoteAddress || "",
                expiresAt,
            });

            const accessToken = signAccess({ sub: doc._id, sid: sessionId });
            res.cookie("rt", refresh, cookieOpts);
            return ok(res, { admin: safe, accessToken, accessTokenExpiresIn: ACCESS_TTL_S }, "Admin created & logged in", 201);
        }

        return ok(res, safe, "Admin created.", 201);
    } catch (err) {
        if (err?.code === 11000) {
            return fail(res, "Duplicate key error.", 409, { keyValue: err.keyValue });
        }
        return fail(res, err?.message || "Failed to create Admin.", 500);
    }
};
