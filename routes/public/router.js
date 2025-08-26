const express = require('express');
const router = express.Router();
const {
    blogsController: { getBlogById, getBlogBySlug, getAllBlogs },
    contactsController: { getAllContacts },
    contributionsController: { getAllContributions, getContributionById },
    heroController: { getAllHeroes },
    profileImageController: { getAllProfileImages },
    projectsController: { getAllProjects, getProjectById },
    qualificationsController: { getAllQualifications, getQualificationById },
    socialsController: { getAllSocials, getSocialById },
    techStackController: { getAllTechStacks, getTechStackById }
} = require("#controllers/admin");

// Get all blogs
router.get("/blogs", getAllBlogs);

// Get a single blog
router.get("/blogs/:id", getBlogById);
router.get("/blogs/article/:slug", getBlogBySlug);

//---

// Get all contacts
router.get("/contacts", getAllContacts);

//---

// Get all contributions
router.get("/contributions", getAllContributions);
// Get a single contribution
router.get("/contributions/:id", getContributionById);

//---

// Get all heroes
router.get("/hero", getAllHeroes);

//---

// Get all profile images
router.get("/profileImage", getAllProfileImages);

//---

// Get all projects
router.get("/projects", getAllProjects);
// Get a single project
router.get("/projects/:id", getProjectById);

//---

// Get all qualifications
router.get("/qualifications", getAllQualifications);
// Get a single qualification
router.get("/qualifications/:id", getQualificationById);

//---

// Get all socials
router.get("/socials", getAllSocials);
// Get a single social
router.get("/socials/:id", getSocialById);

//---

// Get all tech stacks
router.get("/techStack", getAllTechStacks);
// Get a single tech stack
router.get("/techStack/:id", getTechStackById);

module.exports = router;