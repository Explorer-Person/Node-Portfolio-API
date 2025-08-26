// controllers/adminAuthController.js
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { AdminModel, SessionModel } = require("#models");

const {
    REFRESH_TTL_MS, genRefreshToken, hashToken, makeExpiry,
    signAccessJWT, setAuthCookies, clearAuthCookies
} = require("#utils/_authUtils"); // or inline these helpers

/** Utility: consistent API shape */
const ok = (res, data = null, message = "OK", status = 200, meta = undefined) =>
    res.status(status).json({ ok: true, message, data, ...(meta ? { meta } : {}) });

const fail = (res, message = "Bad Request", status = 400, details = undefined) =>
    res.status(status).json({ ok: false, message, ...(details ? { details } : {}) });

// NOTE: make sure you have cookie-parser enabled in app.js
// const cookieParser = require("cookie-parser"); app.use(cookieParser());

exports.adminLogin = async (req, res) => {
    try {
        const body = req.body || {};
        const { email, password } = body;

        console.log("Login attempt:", { email, password });

        const admin = await AdminModel.findOne({ email }).lean();
        if (!admin) return fail(res, "Invalid credentials", 401);

        // If you stored plain text passwords (not recommended), change this to (password === admin.password)
        const pwOk = await bcrypt.compare(password || "", admin.password || "");
        if (!pwOk) return fail(res, "Invalid credentials", 401);

        const sessionId = uuidv4();
        const refresh = genRefreshToken();
        const refreshHash = hashToken(refresh);
        const expiresAt = makeExpiry(REFRESH_TTL_MS);

        await SessionModel.create({
            admin: admin._id, sessionId,
            refreshTokenHash: refreshHash,
            userAgent: req.headers["user-agent"] || "",
            ip: (req.headers["x-forwarded-for"] || "").toString().split(",")[0] || req.socket.remoteAddress || "",
            expiresAt,
        });

        const access = signAccessJWT({ sub: admin._id, sid: sessionId });

        // ⬇️ critical: set BOTH cookies with the right TTLs
        setAuthCookies(res, access, refresh);

        const { password: _omit, ...safe } = admin;
        console.log("BACKEND Set-Cookie:", res.getHeader("Set-Cookie"));
        return ok(res, { admin: safe }, "Login successful");

    } catch (err) {
        return fail(res, err.message || "login error");
    }
};

exports.adminLogout = async (req, res) => {
    const raw = req.cookies?.rt;
    if (raw) await SessionModel.updateOne(
        { refreshTokenHash: hashToken(raw), revokedAt: null },
        { $set: { revokedAt: new Date() } }
    );
    clearAuthCookies(res);
    return ok(res, null, "Logged out");
};

exports.refresh = async (req, res) => {
    const raw = req.cookies?.rt;
    if (!raw) return fail(res, "Missing refresh token", 401);

    const sess = await SessionModel.findOne({
        refreshTokenHash: hashToken(raw),
        revokedAt: null,
        expiresAt: { $gt: new Date() },
    });
    if (!sess) return fail(res, "Invalid session", 401);

    const newRefresh = genRefreshToken();
    sess.refreshTokenHash = hashToken(newRefresh);
    sess.expiresAt = makeExpiry(REFRESH_TTL_MS);
    sess.lastUsedAt = new Date();
    await sess.save();

    const newAccess = signAccessJWT({ sub: sess.admin, sid: sess.sessionId });

    // ⬇️ update cookies
    setAuthCookies(res, newAccess, newRefresh);
    return ok(res, null, "Rotated");
};