// routes/admin/techStacks.js
const express = require("express");
const router = express.Router();

// Controllers (adjust path if different)
const {
    techStackController: { createTechStack,
        getAllTechStacks,
        getTechStackById,
        updateTechStack,
        deleteTechStack, }
} = require("#controllers/admin");

// Create a new tech stack (with uploads, e.g., icon/logo)
router.post("/", createTechStack);

// Update a tech stack (with uploads)
router.put("/:id", updateTechStack);

// Delete a tech stack
router.delete("/:id", deleteTechStack);

module.exports = router;
