// controllers/admin/contributionsController.js
const { ContributionsModel } = require("#models");
const { Types } = require("mongoose");
const { toCloudinaryIfLocal, deleteFromCloudinary } = require("../../utils/cloudinary");

/* ============ helpers ============ */
function isObjectId(id) {
    return Types.ObjectId.isValid(String(id));
}
function idFilter(id) {
    if (isObjectId(id)) return { _id: id };
    const n = Number(id);
    if (!Number.isNaN(n)) return { id: n };
    return { _id: id };
}

/** Utility: consistent API shape */
const ok = (res, data = null, message = "OK", status = 200, meta = undefined) =>
    res.status(status).json({ ok: true, message, data, ...(meta ? { meta } : {}) });

const fail = (res, message = "Bad Request", status = 400, details = undefined) =>
    res.status(status).json({ ok: false, message, ...(details ? { details } : {}) });

// Extract image URL from uploads (if any)
function extractImg(req) {
    const uploads = req.uploads || { all: [], byField: {} };
    const byField = uploads.byField || {};
    return (
        byField.img?.[0]?.url ||        // preferred field: "img"
        byField.coverImage?.[0]?.url || // accept "coverImage" if used
        uploads.all?.[0]?.url ||        // fallback: first uploaded file
        null
    );
}

/* ============ CREATE (POST /contributions/) ============ */
exports.createContribution = async (req, res) => {
    try {
        const body = req.body || {};

        console.log(body, "contributions body")

        // keep it deterministic but simple: contributions/<fk> or fallback to timestamp
        const folderBase = body.fk !== ""
            ? `contributions/${body.fk}`
            : `contributions/${Date.now()}`;

        // upload logo if it's a local path/base64; if it's already a URL, helper should no-op
        let coverUrl = body.coverImage;
        if (coverUrl) {
            const up = await toCloudinaryIfLocal(coverUrl, folderBase, "cover");
            coverUrl = up?.url || ""; // store string URL per schema
        }

        // build payload exactly per schema
        const payload = {
            _id: body.id,
            fk: "0",
            coverImage: coverUrl,
            title: body.title,
            slug: body.slug,
            excerpt: body.excerpt || "",
            href: body.href || "",
            priority: body.priority || "",
        };
        console.log(payload)

        const doc = await ContributionsModel.create(payload);
        return ok(res, doc, "contribution created.", 201);

    } catch (err) {
        if (err?.code === 11000) {
            return fail(res, "Duplicate key error.", 409, { keyValue: err.keyValue });
        }
        return fail(res, err?.message || "Failed to create contribution.", 500);
    }
};

/* ============ READ ALL (GET /contributions/) ============ */
// Supports ?fk=1&q=term&page=1&limit=20&sort=priority,-createdAt
exports.getAllContributions = async (req, res) => {
    try {
        // Fetch all Contributions items, newest first
        const items = await ContributionsModel.find()
            .sort({ createdAt: -1 }) // descending order
            .lean();

        return ok(res, items, "Contributions fetched.");
    } catch (err) {
        return fail(res, err.message || "Failed to fetch Contributions.", 500);
    }
};

/* ============ READ ONE (GET /contributions/:id) ============ */
exports.getContributionById = async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await ContributionsModel.findOne(idFilter(id)).lean();
        if (!doc) return fail(res, "not found", 404, null);
        return ok(res, doc);
    } catch (err) {
        return fail(res, err.message || "get error");
    }
};

/* ============ UPDATE (PUT /contributions/:id) ============ */
exports.updateContribution = async (req, res) => {
    try {
        const body = req.body || {};

        console.log(body, "contributions body")

        const existingData = await ContributionsModel.findOne({ _id: body.id }).lean();

        // keep it deterministic but simple: contributionss/<fk> or fallback to timestamp
        const folderBase = Number.isFinite(body.fk)
            ? `contributions/${body.fk}`
            : `contributions/${Date.now()}`;

        // upload logo if it's a local path/base64; if it's already a URL, helper should no-op
        let coverUrl = body.coverImage;
        if (coverUrl !== existingData.icon) {
            await deleteFromCloudinary(existingData.icon)

            const up = await toCloudinaryIfLocal(coverUrl, folderBase, "cover");
            coverUrl = up?.url || ""; // store string URL per schema
        }

        // build payload exactly per schema
        const payload = {
            _id: body.id,
            fk: "0",
            coverImage: coverUrl,
            title: body.title,
            slug: body.slug,
            excerpt: body.excerpt || "",
            href: body.href || "",
            priority: body.priority || "",
        };

        const doc = await ContributionsModel.findByIdAndUpdate(body.id, payload, {
            new: true,
            runValidators: true,
        });
        return ok(res, doc, "contribution updated.", 201);

    } catch (err) {
        if (err?.code === 11000) {
            return fail(res, "Duplicate key error.", 409, { keyValue: err.keyValue });
        }
        return fail(res, err?.message || "Failed to update contribution.", 500);
    }
};

/* ============ DELETE (DELETE /contributions/:id) ============ */
exports.deleteContribution = async (req, res) => {
    try {
        const { id } = req.params;
        const existingData = await ContributionsModel.findOne({ _id: id }).lean();
        await deleteFromCloudinary(existingData.icon);
        const doc = await ContributionsModel.findByIdAndDelete(id);
        if (!doc) return fail(res, "Contribution not found.", 404);
        return ok(res, doc, "Contribution deleted.");
    } catch (err) {
        return fail(res, err.message || "Failed to delete Contribution.", 500);
    }
};
