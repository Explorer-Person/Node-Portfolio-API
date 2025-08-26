// routes/admin/profileImage.js
const express = require("express");
const router = express.Router();
const uploadProcessor = require("#middlewares/multer/middleware.js");

// Controllers (adjust path to where you store them)
const {
    profileImageController
} = require("#controllers/admin");

const {saveProfileImage} = profileImageController;

// Create a new profile image (with uploads)
router.post("/", saveProfileImage);




module.exports = router;
