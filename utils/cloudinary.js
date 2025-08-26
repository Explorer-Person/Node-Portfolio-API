// utils/cloudinary.js
const fs = require("fs");
const path = require("path");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const normalize = (r) => ({
    publicId: r.public_id,
    url: r.secure_url,
    resourceType: r.resource_type, // image | video | raw
    bytes: r.bytes,
    width: r.width,
    height: r.height,
    duration: r.duration,          // videos
    format: r.format,
});

async function uploadLocalFile(localPath, {
    folder = "projects",
    publicId,                 // if omitted -> <folder>/<filename-no-ext>
    overwrite = true,
    resourceType = "auto",
    removeLocal = true,
    largeThreshold = 100 * 1024 * 1024, // >100MB -> upload_large
    chunkSize = 20 * 1024 * 1024,
} = {}) {
    const base = path.parse(localPath).name;
    const finalId = publicId || (folder ? `${folder}/${base}` : base);

    const stat = fs.statSync(localPath);
    const opts = { resource_type: resourceType, public_id: finalId, overwrite };

    const res = stat.size > largeThreshold
        ? await new Promise((resolve, reject) =>
            cloudinary.uploader.upload_large(localPath, { ...opts, chunk_size: chunkSize }, (e, r) =>
                e ? reject(e) : resolve(r)
            )
        )
        : await cloudinary.uploader.upload(localPath, opts);

    if (removeLocal) { try { fs.unlinkSync(localPath); } catch { } }
    return normalize(res);
}

// --- helpers: utils ---
const UPLOAD_DIR = path.join(process.cwd(), "public", "upload");
const isUrl = (s = "") => /^https?:\/\//i.test(String(s));
const isVideo = (s = "") => /\.(mp4|webm|ogg|mov|m4v|avi|mkv)$/i.test(String(s));
const slugify = (s = "") =>
    s.toString().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
const safeLocal = (name = "") => path.join(UPLOAD_DIR, path.basename(name));
const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

// Upload a single local filename (or pass-through if already URL/missing)
async function toCloudinaryIfLocal(name, folder, label) {
    if (!name) return null;
    if (isUrl(name)) return { url: name, publicId: null };

    const localPath = safeLocal(name);
    if (!fs.existsSync(localPath)) {
        // Keep original so caller can see what was sent
        return { url: name, publicId: null };
    }

    const resourceType = isVideo(name) ? "auto" : "image";
    const up = await uploadLocalFile(localPath, {
        folder,
        publicId: `${folder}/${label}`, // stable slot id
        resourceType,
        removeLocal: true,
    });
    // expected: { url, publicId }
    return up;
}

async function mapArray(names = [], folder, labelPrefix) {
    const out = [];
    for (let i = 0; i < names.length; i++) {
        const up = await toCloudinaryIfLocal(names[i], folder, `${labelPrefix}-${i}`);
        if (up) out.push(up.url); // store only URLs (schema has no mediaIds)
    }
    return out;
}

async function deleteFromCloudinary(input) {
    try {
        if (!input) return;

        const items = Array.isArray(input) ? input : [input];

        const unwrapProxied = (s) => {
            if (!s) return s;
            if (s.includes("media?url=")) {
                try {
                    const u = new URL(s, "http://dummy");           // allow relative
                    const inner = u.searchParams.get("url");
                    return inner ? decodeURIComponent(inner) : s;
                } catch { return s; }
            }
            return s;
        };

        const toPublicId = (s) => {
            // if it's already a public_id (no scheme and no /upload/)
            if (s && !/^https?:\/\//i.test(s) && !s.includes("/upload/")) {
                return s.replace(/\.[^.]+$/, "");
            }
            try {
                const u = new URL(s);
                // path: /<cloud_name>/<resource_type>/upload/<maybe v123>/blogs/.../name.ext
                const afterUpload = u.pathname.split("/upload/")[1] || "";
                const clean = afterUpload.split(/[?#]/)[0];
                const parts = clean.split("/").filter(Boolean);
                // drop leading version piece like v1755343571
                if (parts[0] && /^v\d+$/.test(parts[0])) parts.shift();
                // drop extension from last segment
                if (parts.length) parts[parts.length - 1] =
                    parts[parts.length - 1].replace(/\.[^.]+$/, "");
                return parts.join("/");
            } catch {
                return ""; // couldn't parse
            }
        };

        const publicIds = items
            .map(unwrapProxied)
            .map(toPublicId)
            .filter(Boolean);

        console.log(publicIds, "filtered url")

        if (publicIds.length === 0) return;

        // Delete (works for 1 or many)
        const result = await cloudinary.api.delete_resources(publicIds);
        console.log("Deleted from Cloudinary:", result);
        return result;

    } catch (err) {
        console.error("Cloudinary deletion error:", err);
        throw err;
    }
}



module.exports = { cloudinary, uploadLocalFile, mapArray, toCloudinaryIfLocal, deleteFromCloudinary };
