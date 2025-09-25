const { ethers } = require('ethers');

const validatePaymentRequest = (req, res, next) => {
  const { from, to, amount, nonce } = req.body;

  if (!ethers.isAddress(from) || !ethers.isAddress(to)) {
    return res.status(400).json({ error: 'Invalid Ethereum addresses' });
  }

  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  if (!nonce || isNaN(parseInt(nonce))) {
    return res.status(400).json({ error: 'Invalid nonce' });
  }

  next();
};

const validateUsername = (req, res, next) => {
  const { username } = req.params;
  
  if (!username || username.length < 1) {
    return res.status(400).json({ error: 'Username required' });
  }

  if (!/^[a-zA-Z0-9._]+$/.test(username.replace('@', ''))) {
    return res.status(400).json({ error: 'Invalid username format' });
  }

  next();
};

module.exports = {
  validatePaymentRequest,
  validateUsername
};