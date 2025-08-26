// routes/admin/hero.js
const express = require("express");
const router = express.Router();
const uploadProcessor = require("#middlewares/multer/middleware.js");
// Controllers (adjust path to where you store them)
const {
    heroController: { 
        createHero,
        }
} = require("#controllers/admin");

// Create a new hero (with uploads)
router.post("/", createHero);

module.exports = router;
