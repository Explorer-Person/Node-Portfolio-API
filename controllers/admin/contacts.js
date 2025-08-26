// controllers/admin/contactsController.js
const { Types } = require("mongoose");
const { ContactsModel } = require("#models");
const { toCloudinaryIfLocal, deleteFromCloudinary } = require("../../utils/cloudinary");

/* --------------------------- helpers --------------------------- */

function isObjectId(id) {
    return Types.ObjectId.isValid(String(id));
}

function normalizeArray(body) {
    // Accept: array or { items: [...] } or single object
    if (Array.isArray(body)) return body;
    if (Array.isArray(body?.items)) return body.items;
    if (body && typeof body === "object") return [body];
    return [];
}

/** Build filter for single by id (accepts Mongo _id or numeric id) */
function idFilter(id) {
    if (isObjectId(id)) return { _id: id };
    const n = Number(id);
    if (!Number.isNaN(n)) return { id: n };
    return { _id: id }; // last resort
}

/** Utility: consistent API shape */
const ok = (res, data = null, message = "OK", status = 200, meta = undefined) =>
    res.status(status).json({ ok: true, message, data, ...(meta ? { meta } : {}) });

const fail = (res, message = "Bad Request", status = 400, details = undefined) =>
    res.status(status).json({ ok: false, message, ...(details ? { details } : {}) });

/* --------------------------- CREATE --------------------------- */
/**
 * POST /contacts/
 * - Single or bulk
 * - Body accepts:
 *    { fk, label, value, id? }  OR
 *    [{...}, {...}]              OR
 *    { items: [{...}, ...] }
 */
exports.createContact = async (req, res) => {
    try {
        const body = req.body || {};

        console.log(body, "contacts body")

        // keep it deterministic but simple: contacts/<fk> or fallback to timestamp
        const folderBase = body.fk !== ""
            ? `contacts/${body.fk}`
            : `contacts/${Date.now()}`;

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
            icon: iconUrl,
            priority: body.priority,
            value: body.value,
            label: body.label || "",
        };
        console.log(payload)

        const doc = await ContactsModel.create(payload);
        return ok(res, doc, "contact created.", 201);

    } catch (err) {
        if (err?.code === 11000) {
            return fail(res, "Duplicate key error.", 409, { keyValue: err.keyValue });
        }
        return fail(res, err?.message || "Failed to create contact.", 500);
    }
};

/* --------------------------- READ ALL --------------------------- */
/**
 * GET /contacts/?fk=1&label=Phone,Email&page=1&limit=50
 */
exports.getAllContacts = async (req, res) => {
    try {
        // Fetch all Contacts items, newest first
        const items = await ContactsModel.find()
            .sort({ createdAt: -1 }) // descending order
            .lean();

        return ok(res, items, "Contacts fetched.");
    } catch (err) {
        return fail(res, err.message || "Failed to fetch Contacts.", 500);
    }
};

/* --------------------------- READ ONE (optional) --------------------------- */
/**
 * If you wire a GET /contacts/:id route later:
 */
exports.getContactById = async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await ContactsModel.findOne(idFilter(id)).lean();
        if (!doc) return fail(res, "not found", 404, null);
        return ok(res, doc);
    } catch (err) {
        return fail(res, err.message || "get error");
    }
};

/* --------------------------- UPDATE --------------------------- */
/**
 * PUT /contacts/:id           -> update single by id (Mongo _id or numeric id)
 * PUT /contacts/bulk          -> bulk upsert/update by:
 *    { items: [
 *       { _id }, { id }, OR { fk, label } + value (upsert)
 *    ]}
 */
exports.updateContact = async (req, res) => {
    try {
        const body = req.body || {};

        console.log(body, "contacts body")

        const existingData = await ContactsModel.findOne({ _id: body.id }).lean();

        // keep it deterministic but simple: contactss/<fk> or fallback to timestamp
        const folderBase = Number.isFinite(body.fk)
            ? `contacts/${body.fk}`
            : `contacts/${Date.now()}`;

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
            value: body.value,
            label: body.label,
            priority: body.priority || "",    // allows "2022–2024"
        };

        const doc = await ContactsModel.findByIdAndUpdate(body.id, payload, {
            new: true,
            runValidators: true,
        });
        return ok(res, doc, "contacts updated.", 201);

    } catch (err) {
        if (err?.code === 11000) {
            return fail(res, "Duplicate key error.", 409, { keyValue: err.keyValue });
        }
        return fail(res, err?.message || "Failed to update contacts.", 500);
    }
};

/* --------------------------- DELETE --------------------------- */
/**
 * DELETE /contacts/:id        -> delete single by id (_id or numeric id)
 * DELETE /contacts/bulk       -> bulk delete
 *   Body:
 *     { ids: ["<_id>", ...] } OR { ids: [123, 124] }
 *     OR { labels: ["Phone","Email"], fk: 1 }
 */
exports.deleteContact = async (req, res) => {
    try {
        const { id } = req.params;
        const existingData = await ContactsModel.findOne({ _id: id }).lean();
        await deleteFromCloudinary(existingData.icon);
        const doc = await ContactsModel.findByIdAndDelete(id);
        if (!doc) return fail(res, "Contact not found.", 404);
        return ok(res, doc, "Contact deleted.");
    } catch (err) {
        return fail(res, err.message || "Failed to delete Contact.", 500);
    }
};


