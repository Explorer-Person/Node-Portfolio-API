const express = require("express");
const router = express.Router();
const uploadProcessor = require("#middlewares/multer/middleware.js");

// POST /api/upload?filename=foo.jpg
router.post(
    "/",
    uploadProcessor({ baseUrl: "/upload" }), // matches static mount
    (req, res) => {
        const first =
            req.fileInfo ||
            (req.uploads && req.uploads.all && req.uploads.all[0]) ||
            null;

        if (!first) return res.status(400).json({ error: "No file received" });

        return res.status(201).json({
            fileName: first.filename, // save this in DB / state
            url: first.url,           // e.g. /upload/foo.jpg
            size: first.size,
            mime: first.mime,
        });
    }
);

module.exports = router;
