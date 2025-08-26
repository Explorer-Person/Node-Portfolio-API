// controllers/admin/blogController.js
const { BlogsModel } = require("#models"); // uses your "@/” alias (module-alias)
const { Types } = require("mongoose");

const { mapArray, toCloudinaryIfLocal, deleteFromCloudinary } = require("#utils/cloudinary");


function rewriteHtmlImgSrc(html, newSrcs) {
    if (!html || !Array.isArray(newSrcs) || newSrcs.length === 0) return html;

    let index = 0;
    console.log(newSrcs, "new srcs");

    return html.replace(
        /(<img\b[^>]*\bsrc\s*=\s*["'])([^"']+)(["'][^>]*>)/gi,
        (match, before, oldSrc, after) => {
            if (index < newSrcs.length) {
                // prepend /api/media?url= to the new source
                const fullUrl = `/api/media?url=${encodeURIComponent(newSrcs[index])}`;
                const newTag = `${before}${fullUrl}${after}`;
                console.log(newTag, "new Tag");
                index++;
                return newTag;
            }
            return match;
        }
    );
}

function replaceImageURLs(updatedContent, sanitizedMedias) {
    if (!updatedContent?.root?.children) return updatedContent;

    let index = 0;

    const walk = (node) => {
        if (node.type === "image" && node.src && index < sanitizedMedias.length) {
            node.src = `/api/media?url=${encodeURIComponent(sanitizedMedias[index])}`;
            index++;
        }
        if (Array.isArray(node.children)) {
            node.children.forEach(walk);
        }
    };

    walk(updatedContent.root);
    return updatedContent;
}

/** Utility: consistent API shape */
const ok = (res, data = null, message = "OK", status = 200, meta = undefined) =>
    res.status(status).json({ ok: true, message, data, ...(meta ? { meta } : {}) });

const fail = (res, message = "Bad Request", status = 400, details = undefined) =>
    res.status(status).json({ ok: false, message, ...(details ? { details } : {}) });




let mediaIndex = 0;
// Recursively walk through node tree
function updateImageSrc(node, sanitizedMedias) {
    if (node.type === "image" && mediaIndex < sanitizedMedias.length) {
        node.src = `/upload/${sanitizedMedias[mediaIndex]}`;
        mediaIndex++;
    }
    if (Array.isArray(node.children)) {
        node.children.forEach(updateImageSrc);
    }
}



/* ===================== CREATE (POST) ===================== */
exports.createBlog = async (req, res) => {
    try {
        const {
            fk,
            id,                // optional external id
            title,
            slug = "",
            excerpt = "",
            html = "",
            jsonModel,
            coverImage,
            medias,
            tags,
            href = "",
            priority = 0
        } = req.body;


        if (!title) {
            return res.status(400).json({ status: 400, msg: "title is required", data: null });
        }


        const coverIncoming = coverImage ? String(coverImage) : "";
        const mediasIncoming = Array.isArray(medias)
            ? medias.map(String)
            : medias
                ? String(medias).split(",").map(s => s.trim()).filter(Boolean)
                : [];

        // 3) Decide Cloudinary folder (prefer slug, else numeric id, else timestamp)
        const folderBase = slug
            ? `blogs/${slug}`
            : (idNum !== null ? `blogs/${idNum}` : `blogs/${Date.now()}`);

        // 4) Resolve uploads -> URLs
        let sanitizedCoverImage = coverIncoming;
        if (coverImage) {
            const up = await toCloudinaryIfLocal(sanitizedCoverImage, folderBase, "cover");
            if (up?.url) sanitizedCoverImage = up.url;
        }

        let sanitizedMedias = mediasIncoming;
        if (sanitizedMedias.length) {
            sanitizedMedias = await mapArray(mediasIncoming, folderBase, "media");
        }

        console.log(sanitizedMedias, jsonModel, "first");

        let updated;
        let updatedContent = typeof jsonModel === 'string'
            ? JSON.parse(jsonModel)
            : jsonModel;

        if (updatedContent?.root?.children) {
            updated = replaceImageURLs(updatedContent, sanitizedMedias);
        } else {
            console.warn('⚠️ Invalid Lexical JSON:', updatedContent);
        }

        console.log(sanitizedMedias, updated, "last");


        // --- 3) Rewrite HTML src to Cloudinary URLs ---
        const out = rewriteHtmlImgSrc(html, sanitizedMedias);
        const htmlRewritten = out;

        console.log(sanitizedCoverImage, sanitizedMedias, "sanitized datas")

        // --- 5) Persist ---
        const doc = await BlogsModel.create({
            fk: fk,
            _id: id,
            title,
            slug,
            excerpt,
            html: htmlRewritten,
            jsonModel: JSON.stringify(updated), // If your JSON model also stores image srcs and you want them Cloudinary too, we can rewrite it similarly.
            coverImage: sanitizedCoverImage, // e.g. "blog/media-foo"
            medias: sanitizedMedias,
            tags,
            href,
            priority: Number(priority) || 0,
        });

        return ok(res, doc, "blog created.", 201);
    } catch (err) {
        if (err?.code === 11000) {
            return fail(res, "Duplicate key error.", 409, { keyValue: err.keyValue });
        }
        return fail(res, err?.message || "Failed to create blogs.", 500);
    }
};

/* ===================== READ ALL (GET) ===================== */
// Supports ?fk=1 & ?limit= & ?page= & ?q= (title/excerpt search) & ?sort=priority,-createdAt
exports.getAllBlogs = async (req, res) => {
    try {
        const fk = req.query.fk != null ? Number(req.query.fk) : undefined;
        const q = String(req.query.q || "").trim();
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        // sorting: "priority,-createdAt"
        const sortParam = String(req.query.sort || "priority, -createdAt");
        const sort = {};
        sortParam.split(",").map(s => s.trim()).filter(Boolean).forEach(s => {
            if (s.startsWith("-")) sort[s.slice(1)] = -1;
            else sort[s] = 1;
        });

        const filter = {};
        if (fk != null && !Number.isNaN(fk)) filter.fk = fk;
        if (q) {
            filter.$or = [
                { title: { $regex: q, $options: "i" } },
                { excerpt: { $regex: q, $options: "i" } }
            ];
        }

        const [items, total] = await Promise.all([
            BlogsModel.find(filter).sort(sort).skip(skip).limit(limit).lean(),
            BlogsModel.countDocuments(filter)
        ]);

        return ok(res, items, "Blogs fetched.");
    } catch (err) {
        return fail(res, err.message || "Failed to fetch Blogs.", 500);
    }
};

/* ===================== READ ONE (GET /:id) ===================== */
exports.getBlogById = async (req, res) => {
    try {
        const { id } = req.params;

        // allow both Mongo _id or your numeric "id"
        let doc = null;
        if (id) {
            doc = await BlogsModel.findOne({ _id: id }).lean();
        }

        if (!doc) {
            return res.status(404).json({ status: 404, msg: "not found", data: null });
        }

        return ok(res, doc);
    } catch (err) {
        return fail(res, err.message || "get error");
    }
};

/* ===================== READ ONE (GET /:slug) ===================== */
exports.getBlogBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        // allow both Mongo _id or your numeric "slug"
        let doc = null;

        if (slug) {
            doc = await BlogsModel.findOne({ slug: String(slug) }).lean();
        }
        console.log(doc.medias, "medias"); // should still be there

        if (!doc) {
            return res.status(404).json({ status: 404, msg: "not found", data: null });
        }

        return ok(res, doc);
    } catch (err) {
        return fail(res, err.message || "get error");
    }
};


/* ===================== UPDATE (PUT /:id) ===================== */
exports.updateBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;

        const slug = body.slug

        let existingData;
        if (id) {
            existingData = await BlogsModel.findOne({ _id: id }).lean();
        }

        // 3) Decide Cloudinary folder (prefer slug, else numeric id, else timestamp)
        const folderBase = slug
            ? `blogs/${slug}`
            : (idNum !== null ? `blogs/${idNum}` : `blogs/${Date.now()}`);

        const oldMedias = existingData.medias || [];
        const newMedias = body.medias || [];
        let finalMedias = body.medias;
        let finalCover = body.coverImage;

        // items present in new but not in old → ADDED
        const added = newMedias.filter(m => !oldMedias.includes(m));

        // items present in old but not in new → REMOVED
        const removed = oldMedias.filter(m => !newMedias.includes(m));

        console.log("Old:", oldMedias);
        console.log("New:", newMedias);
        console.log("Added:", added);
        console.log("Removed:", removed);
        if (added.length >= 0) {
            const sanitizedMedias = await mapArray(added, folderBase, "media");
            finalMedias = [...oldMedias, ...sanitizedMedias]
        }
        if (removed.length > 0) {
            // removed array should contain Cloudinary public IDs
            // e.g. "blogs/sdfsf/media-0" not the full URL


            await deleteFromCloudinary(removed);

            finalMedias = finalMedias.filter(f => !removed.includes(f));
        }

        if (existingData.coverImage !== body.coverImage) {

            await deleteFromCloudinary(existingData.coverImage)

            const extracted = await toCloudinaryIfLocal(body.coverImage, folderBase, "cover");
            finalCover = extracted.url
        }

        // rewrite the html and jsonModel
        let updated;
        const jsonModel = body.jsonModel
        const html = body.html;
        let updatedContent = typeof body.jsonModel === 'string'
            ? JSON.parse(jsonModel)
            : jsonModel;

        if (updatedContent?.root?.children) {
            updated = replaceImageURLs(updatedContent, finalMedias);
        } else {
            console.warn('⚠️ Invalid Lexical JSON:', updatedContent);
        }

        console.log(finalMedias, updated, "last");


        // --- 3) Rewrite HTML src to Cloudinary URLs ---
        const out = rewriteHtmlImgSrc(html, finalMedias);
        const htmlRewritten = out;


        // Build payload directly from body
        const payload = {
            fk: body.fk || "",
            title: body.title,
            slug: body.slug,
            excerpt: body.excerpt,
            html: htmlRewritten,
            jsonModel: JSON.stringify(updated),
            coverImage: finalCover,
            medias: finalMedias || [],
            tags: body.tags || [],
            href: body.href,
            priority: body.priority,
            date: body.date,
        };


        let doc = null;

        // allow both ObjectId and numeric id
        if (id) {
            doc = await BlogsModel.findByIdAndUpdate(id, { $set: payload }, { new: true });
        }

        if (!doc) {
            return res.status(404).json({ status: 404, msg: "not found", data: null });
        }

        return ok(res, doc, "blog updated.", 201);
    } catch (err) {
        if (err?.code === 11000) {
            return fail(res, "Duplicate key error.", 409, { keyValue: err.keyValue });
        }
        return fail(res, err?.message || "Failed to update blog.", 500);
    }
};


/* ===================== DELETE (DELETE /:id) ===================== */
exports.deleteBlog = async (req, res) => {
    try {
        const { id } = req.params;

        // 1) Find existing blog
        const existing = await BlogsModel.findOne({ _id: id }).lean();
        if (!existing) {
            return res.status(404).json({ status: 404, msg: "not found", data: null });
        }

        // 2) Build list of medias to delete
        const targets = [...(existing.medias || []), existing.coverImage].filter(Boolean);

        if (targets.length) {
            await deleteFromCloudinary(targets);
        }

        // 3) Delete the blog itself
        const doc = await BlogsModel.findOneAndDelete({ _id: id });

        return ok(res, { _id: String(doc._id), id: doc.id }, "Blog deleted.");

    } catch (err) {
        return fail(res, err.message || "Failed to delete Blog.", 500);
    }
};