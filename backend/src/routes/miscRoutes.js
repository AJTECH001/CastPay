const express = require('express');
const router = express.Router();

router.get('/relayer', (req, res) => {
  res.json({ relayer: process.env.RELAYER_PUBLIC_ADDRESS });
});

module.exports = router;