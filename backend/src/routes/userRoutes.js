const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/resolve/:username', userController.resolveUsername);
router.get('/nonce/:address', userController.getUserNonce);

module.exports = router;