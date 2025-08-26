// middlewares/requireAdminAuth.js
const jwt = require("jsonwebtoken");
const { SessionModel } = require("#models");

/**
 * Options:
 * - matchUserAgent: boolean (default false) -> compare req UA with session.userAgent
 * - matchIp: boolean (default false)       -> compare req IP with session.ip
 * - touchLastUsed: boolean (default true)  -> update lastUsedAt periodically
 * - touchIntervalMs: number (default 300000 = 5min)
 */
module.exports = function requireAdminAuth(opts = {}) {
    return async function (req, res, next) {
        try {
            let token = null;
            const h = req.headers.authorization || "";
            console.log("Auth header:", h);
            if (h.startsWith("Bearer ")) token = h.slice(7);
            if (!token && req.cookies?.at) token = req.cookies.at;  // ⬅️ cookie fallback

            if (!token) return res.status(401).json({ ok: false, message: "Unauthorized: missing token" });

            let payload;
            try { payload = jwt.verify(token, process.env.JWT_SECRET); }
            catch { return res.status(401).json({ ok: false, message: "Unauthorized: invalid/expired token" }); }

            const adminId = String(payload.sub || "");
            const sessionId = String(payload.sid || "");
            if (!adminId || !sessionId) return res.status(401).json({ ok: false, message: "Unauthorized: malformed token" });

            const sess = await SessionModel.findOne({
                admin: adminId,
                sessionId,
                revokedAt: null,
                expiresAt: { $gt: new Date() },
            }).lean();
            if (!sess) return res.status(401).json({ ok: false, message: "Unauthorized: session invalid" });

            req.auth = { adminId, sessionId, token: payload };
            return next();
        } catch (err) {
            return res.status(500).json({ ok: false, message: "Auth middleware error", details: err?.message });
        }
    };
};
