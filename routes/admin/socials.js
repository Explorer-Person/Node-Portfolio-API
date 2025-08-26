// routes/admin/socials.js
const express = require("express");
const router = express.Router();

// Controllers (adjust path if different)
const {
    socialsController: { createSocial,
        updateSocial,
        deleteSocial, }
} = require("#controllers/admin");

// Create a new social (with uploads, e.g., custom icon)
router.post("/", createSocial);

// Update a social (with uploads)
router.put("/:id", updateSocial);

// Delete a social
router.delete("/:id", deleteSocial);

module.exports = router;
