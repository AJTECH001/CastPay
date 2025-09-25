const paymasterService = require('../services/paymasterService');

class PaymasterController {
  async getPaymasterStatus(req, res) {
    try {
      const status = await paymasterService.getPaymasterStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async depositToPaymaster(req, res) {
    try {
      const { amount } = req.body;
      const result = await paymasterService.depositToPaymaster(amount);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async registerUser(req, res) {
    try {
      const { userAddress } = req.body;
      const result = await paymasterService.registerUser(userAddress);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getPaymasterBalance(req, res) {
    try {
      const balance = await paymasterService.getPaymasterBalance();
      res.json(balance);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new PaymasterController();