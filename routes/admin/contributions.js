// routes/admin/contributions.js
const express = require("express");
const router = express.Router();

// Controllers (adjust path to where you store them)
const {
    contributionsController
} = require("#controllers/admin");

// Create a new contribution (with uploads)
router.post("/", contributionsController.createContribution);

// Update a contribution (with uploads)
router.put("/:id", contributionsController.updateContribution);

// Delete a contribution
router.delete("/:id", contributionsController.deleteContribution);

module.exports = router;
