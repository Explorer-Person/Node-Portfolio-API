// routes/admin/qualifications.js
const express = require("express");
const router = express.Router();

// Controllers (adjust path if different)
const {
    qualificationsController: { 
        createQualification,
        updateQualification,
        deleteQualification, }
} = require("#controllers/admin");

// Create a new qualification (with uploads, e.g., logo)
router.post("/", createQualification);



// Update a qualification 
router.put("/:id", updateQualification);

// Delete a qualification
router.delete("/:id", deleteQualification);

module.exports = router;
