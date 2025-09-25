const paymentService = require('../services/paymentService');

class PaymentController {
  async sponsoredTransfer(req, res) {
    try {
      const { from, to, amount, signature, nonce } = req.body;
      const result = await paymentService.processTransfer(from, to, amount, signature, nonce);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getTransactionStatus(req, res) {
    try {
      const { txId } = req.params;
      const status = await paymentService.getTransactionStatus(txId);
      res.json(status);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }

  async getTransactions(req, res) {
    try {
      const transactions = await paymentService.getTransactions(req.query);
      res.json(transactions);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getUserBalance(req, res) {
    try {
      const { address } = req.params;
      const balance = await paymentService.getUserBalance(address);
      res.json(balance);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new PaymentController();