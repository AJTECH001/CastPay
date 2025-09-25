const express = require('express');
const router = express.Router();
const paymasterController = require('../controllers/paymasterController');

router.get('/status', paymasterController.getPaymasterStatus);
router.post('/deposit', paymasterController.depositToPaymaster);
router.post('/register', paymasterController.registerUser);
router.get('/balance', paymasterController.getPaymasterBalance);

module.exports = router;