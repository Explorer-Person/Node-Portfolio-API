// controllers/_authUtils.js
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const ACCESS_TTL_S = 15 * 60;                    // 15 minutes
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const PROD = process.env.NODE_ENV === "production";
const siteMode = PROD ? "none" : "lax"; // cross-site in prod if using different domain for client
const BASE_COOKIE = {
    httpOnly: true,
    secure: PROD,          // true in prod (HTTPS)
    sameSite: siteMode,       // if truly cross-site, use: "none" + secure:true + HTTPS
    path: "/",
};

// ❗ separate opts per cookie
const ACCESS_COOKIE_OPTS = { ...BASE_COOKIE, maxAge: ACCESS_TTL_S * 1000 };
const REFRESH_COOKIE_OPTS = { ...BASE_COOKIE, maxAge: REFRESH_TTL_MS };

function genRefreshToken() {
    return crypto.randomBytes(48).toString("base64url");
}
function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}
function makeExpiry(msFromNow) {
    return new Date(Date.now() + msFromNow);
}
function signAccessJWT(payload) {
    // payload: { sub: adminId(string), sid: sessionId(string) }
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL_S });
}

// Helpers to keep controllers tiny & consistent
function setAuthCookies(res, accessToken, refreshToken) {
    console.log("Setting auth cookies", { accessToken, refreshToken });
    if (refreshToken) res.cookie("rt", refreshToken, REFRESH_COOKIE_OPTS);
    if (accessToken) res.cookie("at", accessToken, ACCESS_COOKIE_OPTS);
}
function clearAuthCookies(res) {
    console.log("Clearing auth cookies");
    res.cookie("rt", "", { ...BASE_COOKIE, maxAge: 0 });
    res.cookie("at", "", { ...BASE_COOKIE, maxAge: 0 });
}

module.exports = {
    ACCESS_TTL_S,
    REFRESH_TTL_MS,
    ACCESS_COOKIE_OPTS,
    REFRESH_COOKIE_OPTS,
    genRefreshToken,
    hashToken,
    makeExpiry,
    signAccessJWT,
    setAuthCookies,
    clearAuthCookies,
};
