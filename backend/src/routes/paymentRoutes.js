const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { validateSignature } = require('../middleware/auth');
const { validatePaymentRequest, validateAddressParam } = require('../middleware/validation');

router.post('/transfer', validatePaymentRequest, paymentController.sponsoredTransfer);
router.get('/status/:txId', paymentController.getTransactionStatus);
router.get('/balance/:address', validateAddressParam, paymentController.getUserBalance);
router.get('/transactions', paymentController.getTransactions);


module.exports = router;