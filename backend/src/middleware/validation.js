const { ethers } = require('ethers');

const validatePaymentRequest = (req, res, next) => {
  const { from, to, amount, nonce } = req.body;

  console.log('🔍 Validating payment request:', { from, to, amount, nonce });

  if (!from || !to) {
    console.log('❌ Missing addresses:', { from, to });
    return res.status(400).json({ error: 'Invalid addresses' });
  }

  // Try to validate and correct addresses
  let fromAddress, toAddress;
  
  try {
    fromAddress = ethers.getAddress(from);
  } catch (error) {
    console.log('❌ Invalid from address:', from);
    return res.status(400).json({ error: 'Invalid addresses' });
  }
  
  try {
    toAddress = ethers.getAddress(to);
  } catch (error) {
    console.log('❌ Invalid to address:', to);
    return res.status(400).json({ error: 'Invalid addresses' });
  }

  console.log('✅ Address validation passed:', { fromAddress, toAddress });

  req.body.from = fromAddress;
  req.body.to = toAddress;

  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  if (nonce === undefined || nonce === null || isNaN(parseInt(nonce))) {
    return res.status(400).json({ error: 'Invalid nonce' });
  }

  req.body.nonce = parseInt(nonce);

  console.log('✅ Payment request validation passed');
  next();
};

const validateUsername = (req, res, next) => {
  const { username } = req.params;
  
  if (!username || username.length < 1) {
    return res.status(400).json({ error: 'Username required' });
  }

  next();
};

const validateAddressParam = (req, res, next) => {
  const { address } = req.params;
  
  if (!address || !ethers.isAddress(address)) {
    return res.status(400).json({ error: 'Invalid Ethereum address' });
  }

  req.params.address = ethers.getAddress(address);
  next();
};

module.exports = {
  validatePaymentRequest,
  validateUsername,
  validateAddressParam
};