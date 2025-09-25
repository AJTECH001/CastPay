const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { validateSignature, validateAddress } = require('../middleware/auth');
const { validatePaymentRequest } = require('../middleware/validation');

router.post('/transfer', validatePaymentRequest, validateSignature, paymentController.sponsoredTransfer);
router.get('/status/:txId', paymentController.getTransactionStatus);
router.get('/balance/:address', validateAddress, paymentController.getUserBalance);
router.get('/transactions', paymentController.getTransactions.bind(this));


module.exports = router;