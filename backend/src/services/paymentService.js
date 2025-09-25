const { ethers } = require('ethers');
const blockchainService = require('./blockchainService');

class PaymentService {
  constructor() {
    this.pendingTransactions = new Map();
  }

  async processTransfer(from, to, amount, signature, nonce) {
    if (!ethers.isAddress(from) || !ethers.isAddress(to)) {
      throw new Error('Invalid addresses');
    }

    const amountWei = ethers.parseUnits(amount.toString(), 6);
    if (amountWei <= 0) throw new Error('Invalid amount');

    const isValid = await this.verifySignature(from, to, amountWei, nonce, signature);
    if (!isValid) throw new Error('Invalid signature');

    const txId = ethers.keccak256(ethers.toUtf8Bytes(from + to + amount + nonce + Date.now()));

    this.pendingTransactions.set(txId, {
      from, to, amount: amountWei.toString(), nonce, status: 'pending', timestamp: Date.now()
    });

    this.processTransaction(txId, from, to, amountWei, nonce, signature);

    return {
      txId,
      status: 'submitted',
      message: 'Transfer submitted for processing'
    };
  }

  async processTransaction(txId, from, to, amountWei, nonce, signature) {
    try {
      this.updateTransactionStatus(txId, 'processing');

      // Check balance and allowance
      await blockchainService.validateTransfer(from, to, amountWei);

      // Execute via paymaster
      const result = await blockchainService.executePaymasterTransfer(from, to, amountWei);

      this.updateTransactionStatus(txId, 'success', {
        transactionHash: result.transactionHash,
        paymasterExecuted: true
      });

    } catch (error) {
      this.updateTransactionStatus(txId, 'failed', { error: error.message });
    }
  }

  async getTransactionStatus(txId) {
    if (!this.pendingTransactions.has(txId)) {
      throw new Error('Transaction not found');
    }
    return this.pendingTransactions.get(txId);
  }

  async getUserBalance(address) {
    return await blockchainService.getUserBalance(address);
  }

  updateTransactionStatus(txId, status, details = {}) {
    const tx = this.pendingTransactions.get(txId);
    if (tx) {
      tx.status = status;
      tx.details = { ...tx.details, ...details };
      tx.lastUpdated = Date.now();
    }
  }

  async verifySignature(from, to, amountWei, nonce, signature) {
    const message = `CastPay:${from}:${to}:${amountWei}:${nonce}`;
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === from.toLowerCase();
  }
}

module.exports = new PaymentService();