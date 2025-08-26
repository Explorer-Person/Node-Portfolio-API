// controllers/admin/projectsController.js
const mongoose = require("mongoose")
const { ProjectsModel } = require("#models"); // keep your index export shape
const { mapArray, toCloudinaryIfLocal } = require("#utils/cloudinary");

// --- helpers: responses ---
const ok = (res, data = null, message = "OK", status = 200, meta) =>
    res.status(status).json({ ok: true, message, data, ...(meta ? { meta } : {}) });

const fail = (res, message = "Bad Request", status = 400, details) =>
    res.status(status).json({ ok: false, message, ...(details ? { details } : {}) });


/**
 * Create or upsert a Project.
 * - Requires numeric fk
 * - Upserts by numeric id (if provided); otherwise creates
 * Body fields (strings/arrays will be normalized):
 *   { id?, fk, title, slug?, description?, priority?, prodLink?, gitLink?, tags[], coverImage?, medias[] }
 */
async function createProject(req, res) {
    try {
        const b = req.body || {};

        // 1) Validate & normalize numeric fields for the unchanged schema
        const fkNum = b.fk;
        if (fkNum === null) return fail(res, "fk must be a Number", 422);

        const idNum = b.id; // optional

        // 2) Normalize other fields
        const title = String(b.title ?? "").trim();
        if (!title) return fail(res, "title is required", 422);

        const slug = b.slug;
        const description = String(b.description ?? "");
        const priority = b.priority;
        const prodLink = b.prodLink ? String(b.prodLink) : "";
        const gitLink = b.gitLink ? String(b.gitLink) : "";

        const tags = Array.isArray(b.tags)
            ? b.tags.map(String)
            : b.tags
                ? String(b.tags).split(",").map(s => s.trim()).filter(Boolean)
                : [];

        const coverIncoming = b.coverImage ? String(b.coverImage) : "";
        const mediasIncoming = Array.isArray(b.medias)
            ? b.medias.map(String)
            : b.medias
                ? String(b.medias).split(",").map(s => s.trim()).filter(Boolean)
                : [];

        // 3) Decide Cloudinary folder (prefer slug, else numeric id, else timestamp)
        const folderBase = slug
            ? `projects/${slug}`
            : (idNum !== null ? `projects/${idNum}` : `projects/${Date.now()}`);

        // 4) Resolve uploads -> URLs
        let coverImage = coverIncoming;
        if (coverImage) {
            const up = await toCloudinaryIfLocal(coverImage, folderBase, "cover");
            if (up?.url) coverImage = up.url;
        }

        let medias = mediasIncoming;
        if (medias.length) {
            medias = await mapArray(mediasIncoming, folderBase, "media");
        }

        // 5) Build the DB payload matching your unchanged schema exactly
        const toSet = {
            // id is added only if numeric (schema requires Number)
            _id: idNum,
            fk: fkNum,
            title,
            slug,
            description,
            coverImage,
            medias,
            gitLink,
            prodLink,
            tags,
            priority,
        };

        // 6) Upsert by id if numeric; else create
        let doc, status, message;

        if (idNum !== null) {
            doc = await ProjectsModel.findOneAndUpdate(
                { _id: idNum },
                { $set: toSet },
                { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
            );
            status = 200;
            message = "Project upserted by id.";
        } else {
            // no numeric id -> create new
            doc = await ProjectsModel.create(toSet);
            status = 201;
            message = "Project created.";
        }

        // Meta notes if client sent non-numeric id
        const meta = (b.id !== undefined && idNum === null)
            ? { note: "Non-numeric 'id' was ignored due to schema type Number." }
            : undefined;

        return ok(res, doc, message, status, meta);
    } catch (err) {
        const msg = err?.message || "Failed to save project";
        return fail(res, msg, 500);
    }
}




/**
 * GET /api/admin/projects/
 */
async function getAllProjects(req, res) {
    try {
        const items = await ProjectsModel.find().sort("-createdAt").lean();
        return ok(res, items, "Projects fetched.");
    } catch (err) {
        return fail(res, err.message || "Failed to fetch projects.", 500);
    }
}

/**
 * GET /api/admin/projects/:id
 */
async function getProjectById(req, res) {
    try {
        const { id } = req.params;
        const cleanId = id.trim();

        const doc = await ProjectsModel.findById(cleanId); // ✅ correct usage
        if (!doc) return fail(res, "Project not found.", 404);

        return ok(res, doc, "Project fetched.");
    } catch (err) {
        console.error("Mongoose error:", err);
        return fail(res, err.message || "Failed to fetch project.", 500);
    }
}

/**
 * PUT /api/admin/projects/:id
 */
async function updateProject(req, res) {
    try {
        const b = req.body || {};
        const { id } = b;

        const existing = await ProjectsModel.findOne({_id: id }).lean();
        if (!existing) return fail(res, "Project not found.", 404);

        // Normalize inputs like in createProject
        const fkNum = b.fk ?? existing.fk;
        const title = b.title ? String(b.title).trim() : existing.title;
        const slug = b.slug;
        const description = b.description ?? existing.description;
        const priority = b.priority;
        const prodLink = b.prodLink ?? existing.prodLink;
        const gitLink = b.gitLink ?? existing.gitLink;

        const tags = Array.isArray(b.tags)
            ? b.tags.map(String)
            : b.tags
                ? String(b.tags).split(",").map(s => s.trim()).filter(Boolean)
                : existing.tags || [];

        const coverIncoming = b.coverImage ?? existing.coverImage;
        const mediasIncoming = Array.isArray(b.medias)
            ? b.medias.map(String)
            : b.medias
                ? String(b.medias).split(",").map(s => s.trim()).filter(Boolean)
                : existing.medias || [];

        const folderBase = slug
            ? `projects/${slug}`
            : (existing.slug ? `projects/${existing.slug}` : `projects/${id}`);

        // Cover: upload if new local, remove old if changed
        let coverImage = coverIncoming;
        if (coverImage !== existing.coverImage) {
            if (existing.coverImage) {
                try {
                    await cloudinary.uploader.destroy(existing.coverImage);
                } catch (err) {
                    console.warn("Cloudinary cover delete failed:", err.message);
                }
            }
            if (coverImage) {
                const up = await toCloudinaryIfLocal(coverImage, folderBase, "cover");
                if (up?.url) coverImage = up.url;
            }
        }

        // Medias: upload new locals, delete removed ones
        const removedMedias = (existing.medias || []).filter(m => !mediasIncoming.includes(m));
        for (const m of removedMedias) {
            try {
                await cloudinary.uploader.destroy(m, { resource_type: isVideo(m) ? "video" : "image" });
            } catch (err) {
                console.warn(`Cloudinary media delete failed: ${m}`, err.message);
            }
        }
        const medias = await mapArray(mediasIncoming, folderBase, "media");

        // Final update payload
        const toSet = {
            _id: id,
            fk: fkNum,
            title,
            slug,
            description,
            coverImage,
            medias,
            gitLink,
            prodLink,
            tags,
            priority,
        };

        const doc = await ProjectsModel.findByIdAndUpdate(id, toSet, {
            new: true,
            runValidators: true,
        });

        return ok(res, doc, "Project updated.");
    } catch (err) {
        console.error("Update project error:", err);
        return fail(res, err.message || "Failed to update project.", 500);
    }
}


/**
 * DELETE /api/admin/projects/:id
 */
async function deleteProject(req, res) {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return fail(res, "Invalid ObjectId.", 422);
        }
        const doc = await ProjectsModel.findByIdAndDelete(id);
        if (!doc) return fail(res, "Project not found.", 404);
        return ok(res, doc, "Project deleted.");
    } catch (err) {
        return fail(res, err.message || "Failed to delete project.", 500);
    }
}

module.exports = {
    createProject,
    getAllProjects,
    getProjectById,
    updateProject,
    deleteProject,
};
