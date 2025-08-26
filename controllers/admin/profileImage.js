// controllers/admin/profileImageController.js
const { ProfileImageModel } = require("#models");
const { toCloudinaryIfLocal, deleteFromCloudinary } = require("../../utils/cloudinary");

/** Utility: consistent API shape */
const ok = (res, data = null, message = "OK", status = 200, meta = undefined) =>
    res.status(status).json({ ok: true, message, data, ...(meta ? { meta } : {}) });

const fail = (res, message = "Bad Request", status = 400, details = undefined) =>
    res.status(status).json({ ok: false, message, ...(details ? { details } : {}) });


/**
 * GET /api/admin/profile-image/
 */
async function getAllProfileImages(req, res) {
    try {
        const items = await ProfileImageModel.find().lean();
        console.log("Fetched profile images:", items);
        return ok(res, items, "Profile images fetched.");
    } catch (err) {
        return fail(res, err.message || "Failed to fetch profile images.", 500);
    }
}

/**
 * PUT /api/admin/profile-image/:id
 */
async function saveProfileImage(req, res) {
    try {
        const body = await req.body;

        console.log(body, "profileImage body")

        const data = await ProfileImageModel.find().lean();
        const existingData = data[0] || null; // get first item or null if none

        console.log("Existing profile image data:", existingData, data);

        // keep it deterministic but simple: profileImages/<fk> or fallback to timestamp
        const folderBase = body.fk
            ? `profileImage/${body.fk}`
            : `profileImage/${Date.now()}`;

        // upload logo if it's a local path/base64; if it's already a URL, helper should no-op
        let imageUrl = body.src;
        if (existingData !== null && (imageUrl !== existingData.src)) {
            await deleteFromCloudinary(existingData.src)

            const up = await toCloudinaryIfLocal(`upload/${imageUrl}`, folderBase, "src");
            imageUrl = up?.url || ""; // store string URL per schema
        }else if(existingData === null){
            const up = await toCloudinaryIfLocal(`upload/${imageUrl}`, folderBase, "src");
            imageUrl = up?.url || ""; // store string URL per schema
        }

        // build payload exactly per schema
        const payload = {
            ...(!existingData?._id ? { _id: body.id } : {}),
            fk: "0",
            src: imageUrl,
            alt: body.alt,
            width: body.width,
            height: body.height || "",
            className: body.className
        };
        console.log("Profile image payload:", payload);

        const doc = await existingData !== null ? await ProfileImageModel.findByIdAndUpdate(existingData._id, payload, {
            new: true,
            runValidators: true,
        }) : await ProfileImageModel.create(payload);
        return ok(res, doc, "profileImage updated.", 201);

    } catch (err) {
        if (err?.code === 11000) {
            return fail(res, "Duplicate key error.", 409, { keyValue: err.keyValue });
        }
        return fail(res, err?.message || "Failed to update profileImage.", 500);
    }
}



module.exports = {
    getAllProfileImages,
    saveProfileImage,
};
