// controllers/admin/qualificationsController.js
const mongoose = require("mongoose");
const { QualificationsModel } = require("#models");
const { toCloudinaryIfLocal, deleteFromCloudinary } = require("#utils/cloudinary");

/** Utility: consistent API shape */
const ok = (res, data = null, message = "OK", status = 200, meta = undefined) =>
    res.status(status).json({ ok: true, message, data, ...(meta ? { meta } : {}) });

const fail = (res, message = "Bad Request", status = 400, details = undefined) =>
    res.status(status).json({ ok: false, message, ...(details ? { details } : {}) });



/**
 * POST /api/admin/qualifications/
 */
async function createQualification(req, res) {
    try {
        const body = req.body || {};

        console.log(body, "qualifications body")

        if (!body.type || !["cert", "edu"].includes(body.type)) {
            return fail(res, "Field 'type' must be 'cert' or 'edu'.", 422);
        }
        if (!body.title) {
            return fail(res, "Field 'title' is required.", 422);
        }

        // Map "institution" -> "org" if client sends it
        const org = body.org ?? body.institution ?? "";

        // number normalizations
        const fk = Number(body.fk);
        const priority = body.priority != null ? Number(body.priority) : 0;
        const idNum = body.id != null && body.id !== "" ? Number(body.id) : null;

        // decide a simple folder for Cloudinary uploads
        // keep it deterministic but simple: qualifications/<fk> or fallback to timestamp
        const folderBase = Number.isFinite(fk)
            ? `qualifications/${fk}`
            : `qualifications/${Date.now()}`;

        // upload logo if it's a local path/base64; if it's already a URL, helper should no-op
        let logoUrl = "";
        if (body.logo) {
            const up = await toCloudinaryIfLocal(body.logo, folderBase, "logo");
            logoUrl = up?.url || ""; // store string URL per schema
        }

        // build payload exactly per schema
        const payload = {
            _id: body.id,
            fk,
            type: body.type,          // "cert" | "edu"
            title: body.title,
            org,
            year: body.year || "",    // allows "2022–2024"
            url: body.url || "",
            logo: logoUrl,
            priority
        };

        const doc = await QualificationsModel.create(payload);
        return ok(res, doc, "Qualification created.", 201);

    } catch (err) {
        if (err?.code === 11000) {
            return fail(res, "Duplicate key error.", 409, { keyValue: err.keyValue });
        }
        return fail(res, err?.message || "Failed to create qualification.", 500);
    }
};

/**
 * GET /api/admin/qualifications/
 */
async function getAllQualifications(req, res) {
    try {
        const items = await QualificationsModel.find().sort("-createdAt").lean();
        return ok(res, items, "Qualifications fetched.");
    } catch (err) {
        return fail(res, err.message || "Failed to fetch qualifications.", 500);
    }
}

/**
 * GET /api/admin/qualifications/:id
 */
async function getQualificationById(req, res) {
    try {
        const { id } = req.params;

        const doc = await QualificationsModel.findById(id);
        if (!doc) return fail(res, "Qualification not found.", 404);
        return ok(res, doc, "Qualification fetched.");
    } catch (err) {
        return fail(res, err.message || "Failed to fetch qualification.", 500);
    }
}

/**
 * PUT /api/admin/qualifications/:id
 */
async function updateQualification(req, res) {
    try {
        const body = req.body || {};

        console.log(body)

        const existingData = await QualificationsModel.findOne({ _id: body.id }).lean();

        console.log(existingData);

        if (!body.type || !["cert", "edu"].includes(body.type)) {
            return fail(res, "Field 'type' must be 'cert' or 'edu'.", 422);
        }
        if (!body.title) {
            return fail(res, "Field 'title' is required.", 422);
        }

        // Map "institution" -> "org" if client sends it
        const org = body.org ?? body.institution ?? "";



        // decide a simple folder for Cloudinary uploads
        // keep it deterministic but simple: qualifications/<fk> or fallback to timestamp
        const folderBase = Number.isFinite(body.fk)
            ? `qualifications/${body.fk}`
            : `qualifications/${Date.now()}`;

        console.log(existingData, existingData.logo)

        // upload logo if it's a local path/base64; if it's already a URL, helper should no-op
        let logoUrl = "";
        if (body.logo !== existingData.logo) {

            await deleteFromCloudinary(existingData.logo)

            const up = await toCloudinaryIfLocal(body.logo, folderBase, "logo");
            logoUrl = up?.url || ""; // store string URL per schema

            
        }

        // build payload exactly per schema
        const payload = {
            _id: body.id,
            fk: body.fk,
            type: body.type,          // "cert" | "edu"
            title: body.title,
            org,
            year: body.year || "",    // allows "2022–2024"
            url: body.url || "",
            logo: logoUrl,
            priority: body.priority
        };

        const doc = await QualificationsModel.findByIdAndUpdate(body.id, payload, {
            new: true,
            runValidators: true,
        });
        return ok(res, doc, "Qualification updated.", 201);

    } catch (err) {
        if (err?.code === 11000) {
            return fail(res, "Duplicate key error.", 409, { keyValue: err.keyValue });
        }
        return fail(res, err?.message || "Failed to update qualification.", 500);
    }
}

/**
 * DELETE /api/admin/qualifications/:id
 */
async function deleteQualification(req, res) {
    try {
        const { id } = req.params;
        
        const existingData = await QualificationsModel.findOne({ _id: id}).lean()

        await deleteFromCloudinary(existingData.logo);

        const doc = await QualificationsModel.findByIdAndDelete(id);
        if (!doc) return fail(res, "Qualification not found.", 404);
        return ok(res, doc, "Qualification deleted.");
    } catch (err) {
        return fail(res, err.message || "Failed to delete qualification.", 500);
    }
}

module.exports = {
    createQualification,
    getAllQualifications,
    getQualificationById,
    updateQualification,
    deleteQualification,
};
