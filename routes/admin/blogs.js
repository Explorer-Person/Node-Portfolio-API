// routes/admin/blogs.js
const express = require("express");
const router = express.Router();

// Controllers (adjust path to where you store them)
const {
    blogsController: { 
        createBlog,
        getBlogBySlug,
        updateBlog,
        deleteBlog,
        }
} = require("#controllers/admin");
// Create a new blog (with uploads)
router.post("/", createBlog);


router.get("/article/:slug", getBlogBySlug);


// Update a blog (with uploads)
router.put("/:id", updateBlog);

// Delete a blog
router.delete("/:id", deleteBlog);

module.exports = router;
