// controllers/admin/socialsController.js
const mongoose = require("mongoose");
const { SocialsModel } = require("#models");
const { toCloudinaryIfLocal, deleteFromCloudinary } = require("../../utils/cloudinary");

/** Utilities */
const ok = (res, data = null, message = "OK", status = 200, meta = undefined) =>
    res.status(status).json({ ok: true, message, data, ...(meta ? { meta } : {}) });

const fail = (res, message = "Bad Request", status = 400, details = undefined) =>
    res.status(status).json({ ok: false, message, ...(details ? { details } : {}) });

/** Allow-listed fields */
const pickSocialFields = (body = {}) => {
    const out = {};
    if (body.id !== undefined) out.id = Number(body.id);
    if (body.platform !== undefined) out.platform = String(body.platform);   // e.g., "GitHub", "LinkedIn"
    if (body.url !== undefined) out.url = String(body.url);
    if (body.username !== undefined) out.username = String(body.username);
    if (body.order !== undefined) out.order = Number(body.order);
    if (body.isActive !== undefined) out.isActive = body.isActive === "true" || body.isActive === true;
    if (body.altText !== undefined) out.altText = String(body.altText);
    if (body.desc !== undefined) out.desc = String(body.desc);
    return out;
};

/**
 * POST /api/admin/socials/
 */
async function createSocial(req, res) {
    try {
        const body = req.body || {};

        console.log(body, "socials body")

        // keep it deterministic but simple: socials/<fk> or fallback to timestamp
        const folderBase = body.fk !== ""
            ? `socials/${body.fk}`
            : `socials/${Date.now()}`;

        // upload logo if it's a local path/base64; if it's already a URL, helper should no-op
        let iconUrl = "";
        if (body.icon) {
            const up = await toCloudinaryIfLocal(body.icon, folderBase, "icon");
            iconUrl = up?.url || ""; // store string URL per schema
        }

        // build payload exactly per schema
        const payload = {
            _id: body.id,
            fk: "0",
            icon: iconUrl,          // "cert" | "edu"
            platform: body.platform,
            url: body.url,
            priority: body.priority || "",    // allows "2022–2024"
        };
        console.log(payload)

        const doc = await SocialsModel.create(payload);
        return ok(res, doc, "social created.", 201);

    } catch (err) {
        if (err?.code === 11000) {
            return fail(res, "Duplicate key error.", 409, { keyValue: err.keyValue });
        }
        return fail(res, err?.message || "Failed to create social.", 500);
    }
}

/**
 * GET /api/admin/socials/
 * Optional query: ?q= (search in platform/username/url), ?isActive=true|false, ?sort=, ?page=, ?limit=
 */
async function getAllSocials(req, res) {
    try {
        // Fetch all Social items, newest first
        const items = await SocialsModel.find()
            .sort({ createdAt: -1 }) // descending order
            .lean();

        return ok(res, items, "Social fetched.");
    } catch (err) {
        return fail(res, err.message || "Failed to fetch Social.", 500);
    }
}

/**
 * GET /api/admin/socials/:id
 */
async function getSocialById(req, res) {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return fail(res, "Invalid ObjectId.", 422);

        const doc = await SocialModel.findById(id);
        if (!doc) return fail(res, "Social not found.", 404);
        return ok(res, doc, "Social fetched.");
    } catch (err) {
        return fail(res, err.message || "Failed to fetch social.", 500);
    }
}

/**
 * PUT /api/admin/socials/:id
 */
async function updateSocial(req, res) {
    try {
        const body = req.body || {};

        console.log(body, "socials body")

        const existingData = await SocialsModel.findOne({ _id: body.id }).lean();

        // keep it deterministic but simple: socials/<fk> or fallback to timestamp
        const folderBase = Number.isFinite(body.fk)
            ? `socials/${body.fk}`
            : `socials/${Date.now()}`;

        // upload logo if it's a local path/base64; if it's already a URL, helper should no-op
        let iconUrl = body.icon;
        if (body.icon !== existingData.icon) {
            await deleteFromCloudinary(existingData.icon)

            const up = await toCloudinaryIfLocal(body.icon, folderBase, "icon");
            iconUrl = up?.url || ""; // store string URL per schema
        }

        // build payload exactly per schema
        const payload = {
            _id: body.id,
            fk: body.fk,
            icon: iconUrl,          // "cert" | "edu"
            platform: body.name,
            url: body.level,
            priority: body.priority || "",    // allows "2022–2024"
        };

        const doc = await SocialsModel.findByIdAndUpdate(body.id, payload, {
            new: true,
            runValidators: true,
        });
        return ok(res, doc, "social updated.", 201);

    } catch (err) {
        if (err?.code === 11000) {
            return fail(res, "Duplicate key error.", 409, { keyValue: err.keyValue });
        }
        return fail(res, err?.message || "Failed to update social.", 500);
    }
}

/**
 * DELETE /api/admin/socials/:id
 */
async function deleteSocial(req, res) {
    try {
        const { id } = req.params;
        const existingData = await SocialsModel.findOne({ _id: id }).lean();
        await deleteFromCloudinary(existingData.icon);
        const doc = await SocialsModel.findByIdAndDelete(id);
        if (!doc) return fail(res, "Social not found.", 404);
        return ok(res, doc, "Social deleted.");
    } catch (err) {
        return fail(res, err.message || "Failed to delete Social.", 500);
    }
}

module.exports = {
    createSocial,
    getAllSocials,
    getSocialById,
    updateSocial,
    deleteSocial,
};
