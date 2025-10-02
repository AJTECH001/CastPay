const express = require('express');
const router = express.Router();

const paymentRoutes = require('./paymentRoutes');
const userRoutes = require('./userRoutes');
const paymasterRoutes = require('./paymasterRoutes');
const metaRoutes = require('./metaRoutes');   

router.use('/payments', paymentRoutes);
router.use('/users', userRoutes);
router.use('/paymaster', paymasterRoutes);
router.use('/meta', metaRoutes); 

module.exports = router;