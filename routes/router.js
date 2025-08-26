const express = require('express');
const router = express.Router();
const adminRouter = require('./admin/router');
const authRouter = require('./auth/router');
const publicRouter = require('./public/router');
const requireAdminAuth = require("#middlewares/auth/checkAuth"); // the middleware we wrote

router.use('/admin', requireAdminAuth(), adminRouter);
router.use('/auth', authRouter);
router.use('/', publicRouter);


module.exports = router;