const express = require('express');
const router = express.Router();
const metaController = require('../controllers/metaController');

router.get('/relayer', metaController.getRelayer);


module.exports = router;