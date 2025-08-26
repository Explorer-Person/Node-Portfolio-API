// routes/admin/hero.js
const express = require("express");
const router = express.Router();
// Controllers (adjust path to where you store them)
const {
    loginController: { 
        adminLogin,
        adminLogout,
        refresh
        }
} = require("#controllers/auth");

router.post("/login", adminLogin);

router.post("/logout", adminLogout);

router.post("/refresh", refresh);


module.exports = router;
