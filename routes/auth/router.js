const { signupRouter, loginRouter } = require('./index'); const express = require('express');
const router = express.Router();
const requireAdminAuth = require("#middlewares/auth/checkAuth"); // the middleware we wrote


// inline helpers
const ok = (res, data = null, message = 'OK', status = 200, meta) =>
    res.status(status).json({ ok: true, message, data, ...(meta ? { meta } : {}) });



// POST /api/auth/check -> 200 if token+session valid
router.post('/check', requireAdminAuth(), (req, res) => {
    return ok(res, { adminId: req.auth.adminId, sessionId: req.auth.sessionId }, 'Authorized');
});
// Mount them under their paths
router.use('/', loginRouter);
router.use('/signup', signupRouter);


module.exports = router;
