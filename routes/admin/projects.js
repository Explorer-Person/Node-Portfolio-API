/* This code snippet is a JavaScript file that defines routes for handling CRUD operations related to
projects in an admin section of a web application. Here's a breakdown of what it does: */
// routes/admin/projects.js
const express = require("express");
const router = express.Router();

// Controllers (adjust path to where you store them)
const { projectsController: { createProject, updateProject, deleteProject } } =
    require('#controllers/admin');

// Create a new project (with uploads)
router.post("/", createProject);



// Update a project (with uploads)
router.put("/:id", updateProject);

// Delete a project
router.delete("/:id", deleteProject);

module.exports = router;
