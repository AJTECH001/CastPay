const { ethers } = require('ethers');

const validateSignature = (req, res, next) => {
  try {
    const { signature, from, to, amount, nonce } = req.body;
    
    if (!signature) {
      return res.status(401).json({ error: 'Signature required' });
    }

    const message = `CastPay:${from}:${to}:${amount}:${nonce}`;
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    if (recoveredAddress.toLowerCase() !== from.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    next();
  } catch (error) {
    res.status(401).json({ error: 'Signature verification failed' });
  }
};

const validateAddress = (req, res, next) => {
  const { address } = req.params;
  
  if (!ethers.isAddress(address)) {
    return res.status(400).json({ error: 'Invalid Ethereum address' });
  }

  next();
};

module.exports = {
  validateSignature,
  validateAddress
};