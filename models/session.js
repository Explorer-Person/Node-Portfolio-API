// models/Session.js (CommonJS)
const mongoose = require("mongoose");

const SessionSchema = new mongoose.Schema({
    admin: { type: String, ref: "Admin", index: true, required: true }, // String ref to Admin._id
    sessionId: { type: String, index: true, required: true },
    refreshTokenHash: { type: String, required: true },                 // store only hash
    userAgent: { type: String, default: "" },
    ip: { type: String, default: "" },
    lastUsedAt: { type: Date, default: () => new Date() },
    expiresAt: { type: Date, required: true },                          // TTL field
    revokedAt: { type: Date, default: null },
    meta: { type: Object, default: {} },
}, { timestamps: true });

// TTL index: auto-delete when expiresAt < now
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Session", SessionSchema);