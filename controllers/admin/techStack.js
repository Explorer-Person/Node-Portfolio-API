// controllers/admin/techStackController.js
const mongoose = require("mongoose");
const { TechStackModel } = require("#models");
const { deleteFromCloudinary, toCloudinaryIfLocal } = require("#utils/cloudinary");

/** Utilities */
const ok = (res, data = null, message = "OK", status = 200, meta = undefined) =>
    res.status(status).json({ ok: true, message, data, ...(meta ? { meta } : {}) });

const fail = (res, message = "Bad Request", status = 400, details = undefined) =>
    res.status(status).json({ ok: false, message, ...(details ? { details } : {}) });

/**
 * POST /api/admin/techStack/
 */
async function createTechStack(req, res) {
    try {
        const body = req.body || {};

        console.log(body, "techStack body")

        // keep it deterministic but simple: techStack/<fk> or fallback to timestamp
        const folderBase = body.fk !== ""
            ? `techStack/${body.fk}`
            : `techStack/${Date.now()}`;

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
            name: body.name,
            level: body.level,
            priority: body.priority || "",    // allows "2022–2024"
        };
        console.log(payload)

        const doc = await TechStackModel.create(payload);
        return ok(res, doc, "Skill created.", 201);

    } catch (err) {
        if (err?.code === 11000) {
            return fail(res, "Duplicate key error.", 409, { keyValue: err.keyValue });
        }
        return fail(res, err?.message || "Failed to create skill.", 500);
    }
}

/**
 * GET /api/admin/techStack/
 * Optional query params: ?q=, ?category=, ?isActive=true|false, ?page=, ?limit=, ?sort=
 */
async function getAllTechStacks(req, res) {
    try {
        // Fetch all tech stack items, newest first
        const items = await TechStackModel.find()
            .sort({ createdAt: -1 }) // descending order
            .lean();

        return ok(res, items, "Tech Stack fetched.");
    } catch (err) {
        return fail(res, err.message || "Failed to fetch tech stack.", 500);
    }
}


/**
 * GET /api/admin/techStack/:id
 */
async function getTechStackById(req, res) {
    try {
        const { id } = req.params;

        const doc = await TechStackModel.findOne({ _id: id }).lean();
        if (!doc) return fail(res, "Tech stack not found.", 404);
        return ok(res, doc, "Tech stack fetched.");
    } catch (err) {
        return fail(res, err.message || "Failed to fetch tech stack.", 500);
    }
}

/**
 * PUT /api/admin/techStack/:id
 */
async function updateTechStack(req, res) {
    try {
        const body = req.body || {};

        console.log(body, "techStack body")

        const existingData = await TechStackModel.findOne({ _id: body.id }).lean();

        // keep it deterministic but simple: techStack/<fk> or fallback to timestamp
        const folderBase = Number.isFinite(body.fk)
            ? `techStack/${body.fk}`
            : `techStack/${Date.now()}`;

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
            name: body.name,
            level: body.level,
            priority: body.priority || "",    // allows "2022–2024"
        };

        const doc = await TechStackModel.findByIdAndUpdate(body.id, payload, {
            new: true,
            runValidators: true,
        });
        return ok(res, doc, "Skill updated.", 201);

    } catch (err) {
        if (err?.code === 11000) {
            return fail(res, "Duplicate key error.", 409, { keyValue: err.keyValue });
        }
        return fail(res, err?.message || "Failed to update skill.", 500);
    }
}



/**
 * DELETE /api/admin/techStack/:id
 */
async function deleteTechStack(req, res) {
    try {
        const { id } = req.params;
        console.warn(id, "id value")
        const existingData = await TechStackModel.findOne({ _id: id }).lean();
        console.log(existingData, "existingData");
        await deleteFromCloudinary(existingData.icon);
        const doc = await TechStackModel.findByIdAndDelete(id);
        if (!doc) return fail(res, "TechStack not found.", 404);
        return ok(res, doc, "TechStack deleted.");
    } catch (err) {
        return fail(res, err.message || "Failed to delete TechStack.", 500);
    }
}

module.exports = {
    createTechStack,
    getAllTechStacks,
    getTechStackById,
    updateTechStack,
    deleteTechStack,
};
