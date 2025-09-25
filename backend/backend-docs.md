# CastPay Backend API Documentation

## Overview

CastPay enables gasless USDC transfers via Farcaster usernames. This backend handles username resolution, transaction processing, and integration with the Stylus paymaster contract on Arbitrum.

## Quick Start

### Frontend Configuration

```javascript
const CASTPAY_CONFIG = {
  API_BASE_URL: 'https://00692bb93831.ngrok-free.app',
  USDC_ADDRESS: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // Arbitrum Sepolia
  CHAIN_ID: 421614, // Arbitrum Sepolia
};
```

### Basic Integration

```javascript
class CastPayAPI {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async resolveUsername(username) {
    const response = await fetch(`${this.baseURL}/resolve/${username}`);
    return response.json();
  }

  async sendPayment(paymentData) {
    const response = await fetch(`${this.baseURL}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    return response.json();
  }
}

const castpay = new CastPayAPI(' https://00692bb93831.ngrok-free.app');
```

## API Reference

### Health Check

**GET /health**

Check backend and paymaster status.

**Response:**

```json
{
  "status": "ok",
  "timestamp": 1758750889628,
  "paymaster": {
    "address": "0x...",
    "contractBalance": "1000000",
    "isPaused": false,
    "sponsorshipEnabled": true
  },
  "mode": "stylus-erc4337"
}
```

### Username Resolution

**GET /resolve/:username**

Resolve Farcaster username to Ethereum address.

**Example:**

```bash
GET /resolve/vitalik.eth
```

**Response:**

```json
{
  "address": "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
  "source": "neynar",
  "username": "vitalik.eth",
  "displayName": "Vitalik Buterin",
  "fid": 5650
}
```

### Send Payment

**POST /transfer**

Submit a gasless USDC transfer.

**Request Body:**

```json
{
  "from": "0xuserAddress",
  "to": "0xrecipientAddress",
  "amount": "10.50",
  "nonce": 12345,
  "signature": "0x..."
}
```

**Response:**

```json
{
  "txId": "0xtransactionHash",
  "status": "submitted",
  "paymasterAddress": "0x...",
  "message": "Transfer submitted via Stylus Paymaster"
}
```

### Transaction Status

**GET /status/:txId**

Check transaction processing status.

**Response:**

```json
{
  "txId": "0x...",
  "status": "success",
  "timestamp": 1758750889628,
  "details": {
    "transactionHash": "0x...",
    "blockNumber": 123456,
    "paymasterExecuted": true
  }
}
```

### Balance Check

**GET /balance/:address**

Get USDC balance and paymaster allowance.

**Response:**

```json
{
  "address": "0x...",
  "balance": "150.25",
  "paymasterAllowance": "100.00",
  "paymasterAddress": "0x..."
}
```

### Get Nonce

**GET /nonce/:address**

Get current nonce for signature generation.

**Response:**

```json
{
  "address": "0x...",
  "nonce": "5"
}
```

## Complete Payment Flow

### 1. Resolve Username

```javascript
const resolution = await castpay.resolveUsername('vitalik.eth');
const toAddress = resolution.address;
```

### 2. Check Balance & Allowance

```javascript
const balanceInfo = await castpay.getBalance(userAddress);

if (parseFloat(balanceInfo.balance) < amount) {
  throw new Error('Insufficient USDC balance');
}

if (parseFloat(balanceInfo.paymasterAllowance) < amount) {
  await requestPaymasterApproval(userAddress, amount);
}
```

### 3. Generate Signature

```javascript
const nonceInfo = await castpay.getNonce(userAddress);
const nonce = parseInt(nonceInfo.nonce);

const message = `CastPay:${userAddress}:${toAddress}:${amount}:${nonce}`;
const signature = await window.ethereum.request({
  method: 'personal_sign',
  params: [message, userAddress],
});
```

### 4. Submit Payment

```javascript
const paymentData = {
  from: userAddress,
  to: toAddress,
  amount: amount.toString(),
  nonce: nonce,
  signature: signature
};

const result = await castpay.sendPayment(paymentData);
```

### 5. Monitor Status

```javascript
const checkStatus = async (txId) => {
  const status = await castpay.getTransactionStatus(txId);
  
  switch(status.status) {
    case 'success':
      console.log('Payment completed!');
      break;
    case 'failed':
      console.error('Payment failed');
      break;
    case 'processing':
      setTimeout(() => checkStatus(txId), 2000);
      break;
  }
};

checkStatus(result.txId);
```

## React Component Example

```jsx
import React, { useState } from 'react';

const PaymentComponent = ({ userAddress, userSigner }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const sendPayment = async (toUsername, amount) => {
    setLoading(true);
    
    try {
      setStatus('Resolving username...');
      const resolution = await castpay.resolveUsername(toUsername);

      setStatus('Getting nonce...');
      const nonceInfo = await castpay.getNonce(userAddress);
      const nonce = parseInt(nonceInfo.nonce);

      setStatus('Please sign transaction...');
      const message = `CastPay:${userAddress}:${resolution.address}:${amount}:${nonce}`;
      const signature = await userSigner.signMessage(message);

      setStatus('Submitting payment...');
      const result = await castpay.sendPayment({
        from: userAddress,
        to: resolution.address,
        amount: amount,
        nonce: nonce,
        signature: signature
      });

      setStatus('Payment submitted!');
      await trackPaymentStatus(result.txId);

    } catch (error) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button 
        onClick={() => sendPayment('vitalik.eth', '5.00')} 
        disabled={loading}
      >
        {loading ? 'Processing...' : 'Send 5 USDC'}
      </button>
      {status && <p>{status}</p>}
    </div>
  );
};
```

## Error Handling

### Common Error Responses

| Status Code | Error Message      | Description                        |
|-------------|--------------------|------------------------------------|
| 400         | Invalid addresses  | Malformed Ethereum addresses      |
| 401         | Invalid signature  | Signature verification failed      |
| 404         | User not found     | Farcaster username not resolved    |
| 500         | Transfer failed    | Server error during processing     |

### Error Handling Example

```javascript
try {
  const result = await castpay.sendPayment(paymentData);
} catch (error) {
  if (error.response?.status === 401) {
    console.error('Signature validation failed');
  } else if (error.response?.status === 400) {
    console.error('Invalid parameters:', error.response.data.error);
  } else {
    console.error('Payment failed:', error.message);
  }
}
```

## Status Codes Reference

### Transaction Status Values

| Status      | Description                  |
|-------------|------------------------------|
| pending     | Transaction received, waiting processing |
| processing  | Currently being processed    |
| submitted   | Submitted to blockchain      |
| success     | Completed successfully       |
| failed      | Failed during processing     |

### Paymaster Status

Check paymaster health before transactions:

```javascript
const health = await fetch(`${baseURL}/health`).then(r => r.json());

if (!health.paymaster.sponsorshipEnabled) {
  console.warn('Gas sponsorship disabled');
}

if (health.paymaster.isPaused) {
  throw new Error('Paymaster contract paused');
}
```

## Testing

### Run Test Suite

```bash
# Basic test
node tests/test-endpoints.js

# Custom URL
node tests/test-endpoints.js --url  https://00692bb93831.ngrok-free.app

# Specific username
node tests/test-endpoints.js --user dwr.eth
```

## Security Notes

- All transactions require valid signatures
- Nonce protection prevents replay attacks
- Gas costs sponsored by paymaster contract
- Paymaster contract is verified and secure

## Support

For integration issues:

1. Check `/health` endpoint first
2. Verify paymaster contract status
3. Test username resolution separately
4. Check browser console for errors

## Environment Variables

Required backend environment variables:

```bash
ARBITRUM_RPC_URL=your_arbitrum_rpc_url
RELAYER_PRIVATE_KEY=your_relayer_private_key
PAYMASTER_ADDRESS=0xYourDeployedContract
NEYNAR_API_KEY=your_neynar_api_key
```

Need help? Check the health endpoint first, then test each API method individually.