// routes/admin/contacts.js
const express = require("express");
const router = express.Router();

// Controllers (adjust path to where you store them)
const {contactsController} = require("#controllers/admin");

// Create a new contacts (with uploads)
router.post("/", contactsController.createContact);



// Update a contact (with uploads)
router.put("/:id", contactsController.updateContact);

// Delete a contact
router.delete("/:id", contactsController.deleteContact);

module.exports = router;
