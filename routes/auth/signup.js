// routes/admin/hero.js
const express = require("express");
const router = express.Router();
// Controllers (adjust path to where you store them)
const {
    signupController: { 
        createAdmin,
        }
} = require("#controllers/auth");

// Create a new hero (with uploads)
router.post("/", createAdmin);


module.exports = router;
