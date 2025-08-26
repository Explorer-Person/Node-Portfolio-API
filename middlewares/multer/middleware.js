// middlewares/uploadProcessor.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ensure target dir exists
function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }

// Single bucket: public/uploads
const UPLOAD_DIR = path.join(process.cwd(), "public/upload");
ensureDir(UPLOAD_DIR);

const safeName = (s = "") => String(s).replace(/[^\w.\-]/g, "_");

// Disk storage: read desired filename from query (?filename=foo.jpg), else auto
const defaultStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || "");
        const requested = req.query?.filename ? safeName(req.query.filename) : null;
        const finalName = requested || `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, finalName);
    },
});

// allow-list filter (images/videos by default; extend via allow.others or allow.mimes)
function fileFilterFactory(allow = { images: true, videos: true, others: false, mimes: [] }) {
    return (_req, file, cb) => {
        const mime = file.mimetype || "";
        if (allow.mimes?.length && allow.mimes.includes(mime)) return cb(null, true);

        const isImage = mime.startsWith("image/");
        const isVideo = mime.startsWith("video/");

        if ((isImage && allow.images) || (isVideo && allow.videos) || allow.others) return cb(null, true);
        const err = new Error(`Unsupported file type: ${mime}`);
        err.status = 415;
        return cb(err);
    };
}

// normalize Multer files into a consistent shape
function normalizeFiles(files, baseUrl = "/uploads") {
    const base = `/${baseUrl.replace(/^\//, "").replace(/\/$/, "")}`;

    const norm = files.map((f) => ({
        field: f.fieldname,
        originalName: f.originalname,
        encoding: f.encoding,
        mime: f.mimetype,
        size: f.size,
        filename: f.filename,
        destination: f.destination,
        path: f.path,
        url: `${base}/${f.filename}`.replace(/\\/g, "/"), // <- no subfolder in URL
    }));

    const images = norm.filter((f) => f.mime?.startsWith("image/"));
    const videos = norm.filter((f) => f.mime?.startsWith("video/"));
    const byField = norm.reduce((acc, f) => {
        (acc[f.field] ||= []).push(f);
        return acc;
    }, {});
    return { all: norm, images, videos, byField };
}

/**
 * Flexible Multer processor
 * - Saves ALL files into public/uploads
 * - Handles single or multiple fields automatically (`any()` by default)
 * - Accepts images/videos; can be extended to others
 * - Adds `req.uploads` { all, images, videos, byField } and `req.fileInfo` if single
 *
 * @param {Object} options
 * @param {Object} [options.limits]     Multer limits (fileSize, files, etc.)
 * @param {Object} [options.allow]      { images, videos, others, mimes[] }
 * @param {Array}  [options.fields]     e.g. [{ name:'avatar',maxCount:1 }, { name:'gallery',maxCount:10 }]
 * @param {String} [options.baseUrl]    Public base path (default "/uploads")
 * @param {multer.StorageEngine} [options.storage] Custom storage (defaults to single-bucket disk)
 * @param {Function} [options.fileFilter] Custom file filter (defaults to images/videos)
 */
module.exports = function uploadProcessor(options = {}) {
    const {
        limits = { fileSize: 200 * 1024 * 1024, files: 20 }, // 200MB, 20 files default
        allow = { images: true, videos: true, others: false, mimes: [] },
        fields, // optional: explicit field config
        baseUrl = "/uploads",
        storage = defaultStorage,
        fileFilter = fileFilterFactory(allow),
    } = options;

    const uploader = multer({ storage, limits, fileFilter });

    return function (req, res, next) {
        const ct = String(req.headers["content-type"] || "");
        if (!ct.includes("multipart/form-data")) return next();

        const handler = Array.isArray(fields) && fields.length ? uploader.fields(fields) : uploader.any();

        handler(req, res, (err) => {
            if (err) {
                const status = err.status || 400;
                return res.status(status).json({ status, msg: err.message || "Upload error", data: null });
            }

            const filesArray = Array.isArray(req.files) ? req.files : Object.values(req.files || {}).flat();
            const normalized = normalizeFiles(filesArray, baseUrl);

            req.uploads = normalized;
            if (normalized.all.length === 1) req.fileInfo = normalized.all[0];

            return next();
        });
    };
};
