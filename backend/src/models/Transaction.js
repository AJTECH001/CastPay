const { v4: uuidv4 } = require('uuid');

class Transaction {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.from = data.from;
    this.to = data.to;
    this.amount = data.amount;
    this.amountWei = data.amountWei;
    this.nonce = data.nonce;
    this.signature = data.signature;
    this.status = data.status || 'pending';
    this.txId = data.txId;
    this.transactionHash = data.transactionHash;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.details = data.details || {};
  }

  updateStatus(status, details = {}) {
    this.status = status;
    this.details = { ...this.details, ...details };
    this.updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.id,
      from: this.from,
      to: this.to,
      amount: this.amount,
      amountWei: this.amountWei,
      status: this.status,
      txId: this.txId,
      transactionHash: this.transactionHash,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      details: this.details
    };
  }
}

module.exports = Transaction;