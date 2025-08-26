const {blogsRouter, contactsRouter, contributionsRouter, heroRouter, profileImageRouter, projectsRouter, qualificationsRouter, socialsRouter, techStackRouter, uploadRouter } = require('./index'); const express = require('express');
const router = express.Router();


// Mount them under their paths
router.use('/blogs', blogsRouter);
router.use('/contacts', contactsRouter);
router.use('/contributions', contributionsRouter);
router.use('/hero', heroRouter);
router.use('/profileImage', profileImageRouter);
router.use('/projects', projectsRouter);
router.use('/qualifications', qualificationsRouter);
router.use('/socials', socialsRouter);
router.use('/techStack', techStackRouter);
router.use('/upload', uploadRouter);

module.exports = router;
