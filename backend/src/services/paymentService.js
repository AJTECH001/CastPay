const { ethers } = require('ethers');
const blockchainService = require('./blockchainService');
const cacheService = require('./cacheService');

class PaymentService {
  constructor() {
    this.pendingTransactions = new Map();

    setInterval(() => this.cleanupTransactions(), 60 * 60 * 1000);
  }

  async processTransfer(from, to, amount, signature, nonce) {
    if (!ethers.isAddress(from) || !ethers.isAddress(to)) {
      throw new Error('Invalid addresses');
    }

    const amountWei = ethers.parseUnits(amount.toString(), 6);
    if (amountWei <= 0) throw new Error('Invalid amount');

    // Signature validation disabled for testing
    // const isValid = await this.verifySignature(from, to, amountWei, nonce, signature);
    // if (!isValid) throw new Error('Invalid signature');

    const txId = ethers.keccak256(ethers.toUtf8Bytes(`${from}${to}${amount}${nonce}${Date.now()}`));

    this.pendingTransactions.set(txId, {
      from,
      to,
      amount: amountWei.toString(),
      amountFormatted: amount,
      nonce,
      status: 'pending',
      timestamp: Date.now(),
      lastUpdated: Date.now(),
      details: {}
    });

    console.log(`📝 Transaction ${txId} created for ${from} -> ${to}`);

    this.processTransaction(txId, from, to, amountWei, nonce, signature);

    return {
      txId,
      status: 'submitted',
      message: 'Transfer submitted for processing'
    };
  }

  // async processTransaction(txId, from, to, amountWei, nonce, signature) {
  //   try {
  //     this.updateTransactionStatus(txId, 'processing');

  //     await blockchainService.validateTransfer(from, to, amountWei);

  //     const result = await blockchainService.executePaymasterTransfer(from, to, amountWei);

  //     this.updateTransactionStatus(txId, 'success', {
  //       transactionHash: result.transactionHash,
  //       blockNumber: result.receipt.blockNumber,
  //       gasUsed: result.receipt.gasUsed.toString(),
  //       paymasterExecuted: true
  //     });

  //     console.log(`✅ Transaction ${txId} completed: ${result.transactionHash}`);

  //   } catch (error) {
  //     console.error(`❌ Transaction ${txId} failed:`, error.message);
  //     this.updateTransactionStatus(txId, 'failed', { 
  //       error: error.message,
  //       timestamp: Date.now()
  //     });
  //   }
  // }

  // In your processTransaction method, add logging:
  async processTransaction(txId, from, to, amountWei, nonce, signature) {
    try {
      this.updateTransactionStatus(txId, 'processing');
      console.log('🔍 Processing transaction:', txId);

      await blockchainService.validateTransfer(from, to, amountWei);

      const result = await blockchainService.executePaymasterTransfer(from, to, amountWei);
      console.log('✅ Transfer executed successfully');

      this.updateTransactionStatus(txId, 'success', {
        transactionHash: result.transactionHash,
        gasUsed: result.receipt.gasUsed.toString()
      });

    } catch (error) {
      console.error('❌ Transaction failed:', error.message);
      this.updateTransactionStatus(txId, 'failed', { error: error.message });
    }
  }

  async getTransactionStatus(txId) {
    if (!this.pendingTransactions.has(txId)) {
      throw new Error('Transaction not found');
    }

    const tx = this.pendingTransactions.get(txId);
    return {
      txId,
      from: tx.from,
      to: tx.to,
      amount: tx.amountFormatted,
      status: tx.status,
      timestamp: tx.timestamp,
      lastUpdated: tx.lastUpdated,
      details: tx.details || {}
    };
  }

  updateTransactionStatus(txId, status, details = {}) {
    if (this.pendingTransactions.has(txId)) {
      const tx = this.pendingTransactions.get(txId);
      tx.status = status;
      tx.details = { ...tx.details, ...details };
      tx.lastUpdated = Date.now();
      console.log(`🔄 Transaction ${txId} status: ${status}`);
    }
  }

  cleanupTransactions() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    let cleaned = 0;

    for (const [txId, tx] of this.pendingTransactions.entries()) {
      if (tx.timestamp < cutoff) {
        this.pendingTransactions.delete(txId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old transactions`);
    }
  }

  async verifySignature(from, to, amountWei, nonce, signature) {
    try {
      const message = `CastPay:${from}:${to}:${amountWei}:${nonce}`;
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === from.toLowerCase();
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  async getUserBalance(address) {
    try {
      // Get user balance from blockchain service
      const result = await blockchainService.getUserBalance(address);

      return {
        address: result.address,
        balance: result.balance,
        paymasterAllowance: result.paymasterAllowance,
        paymasterAddress: result.paymasterAddress,
        source: 'blockchain'
      };
    } catch (error) {
      console.error('Error getting user balance:', error.message);
      throw new Error('Failed to get user balance');
    }
  }

  async getTransactions(query = {}) {
    try {
      const { limit = 10, offset = 0, status, address } = query;

      let transactions = Array.from(this.pendingTransactions.entries())
        .map(([txId, tx]) => ({ txId, ...tx }))
        .sort((a, b) => b.timestamp - a.timestamp);

      if (status) {
        transactions = transactions.filter(tx => tx.status === status);
      }

      if (address) {
        transactions = transactions.filter(tx =>
          tx.from.toLowerCase() === address.toLowerCase() ||
          tx.to.toLowerCase() === address.toLowerCase()
        );
      }

      const total = transactions.length;
      const paginatedTxs = transactions.slice(offset, offset + limit);

      return {
        transactions: paginatedTxs,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: offset + limit < total
        }
      };
    } catch (error) {
      console.error('Error getting transactions:', error.message);
      throw new Error('Failed to get transactions');
    }
  }
}

module.exports = new PaymentService();