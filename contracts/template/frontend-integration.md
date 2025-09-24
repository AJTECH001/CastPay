# CastPay Paymaster Frontend Integration Guide

## Contract Details
- **Address**: `0x14f148f5a6cf9bba52f9c4680fe782a4e00cc74a`
- **Network**: Arbitrum Sepolia Testnet (Chain ID: 421614)
- **Explorer**: [View on Arbiscan](https://sepolia.arbiscan.io/address/0x14f148f5a6cf9bba52f9c4680fe782a4e00cc74a)

## Quick Setup

### 1. Install Dependencies
```bash
npm install ethers
# or
npm install viem @wagmi/core
```

### 2. Environment Variables
```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x14f148f5a6cf9bba52f9c4680fe782a4e00cc74a
NEXT_PUBLIC_CHAIN_ID=421614
NEXT_PUBLIC_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
```

### 3. Contract Instance (ethers.js)
```javascript
import { ethers } from 'ethers';
import CastPayABI from './CastPayPaymaster.json';

const CONTRACT_ADDRESS = "0x14f148f5a6cf9bba52f9c4680fe782a4e00cc74a";
const provider = new ethers.providers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CastPayABI, provider);

// With signer for transactions
const signer = provider.getSigner();
const contractWithSigner = new ethers.Contract(CONTRACT_ADDRESS, CastPayABI, signer);
```

## Core Functions

### User Registration
```javascript
const registerUser = async () => {
  try {
    const tx = await contractWithSigner.registerUser();
    const receipt = await tx.wait();
    console.log('User registered:', receipt.transactionHash);
    return receipt;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
};
```

### USDC Deposit
```javascript
const depositUSDC = async (amount) => {
  try {
    // amount in USDC (6 decimals)
    const amountWei = ethers.utils.parseUnits(amount.toString(), 6);
    const tx = await contractWithSigner.depositUsdc(amountWei);
    const receipt = await tx.wait();
    console.log('Deposit successful:', receipt.transactionHash);
    return receipt;
  } catch (error) {
    console.error('Deposit failed:', error);
    throw error;
  }
};
```

### Check Contract Balance
```javascript
const getBalance = async () => {
  try {
    const balance = await contract.getContractBalance();
    return ethers.utils.formatUnits(balance, 6); // Returns USDC amount
  } catch (error) {
    console.error('Error getting balance:', error);
    return '0';
  }
};
```

### Get User Count
```javascript
const getUserCount = async () => {
  try {
    const count = await contract.getUserCount();
    return count.toString();
  } catch (error) {
    console.error('Error getting user count:', error);
    return '0';
  }
};
```

## React Hook Example

```javascript
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import CastPayABI from './CastPayPaymaster.json';

const CONTRACT_ADDRESS = "0x14f148f5a6cf9bba52f9c4680fe782a4e00cc74a";

export const useCastPayContract = () => {
  const [contract, setContract] = useState(null);
  const [contractWithSigner, setContractWithSigner] = useState(null);
  const [balance, setBalance] = useState('0');
  const [userCount, setUserCount] = useState('0');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initContract = async () => {
      if (window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CastPayABI, provider);
        const signer = provider.getSigner();
        const contractWithSignerInstance = new ethers.Contract(CONTRACT_ADDRESS, CastPayABI, signer);

        setContract(contractInstance);
        setContractWithSigner(contractWithSignerInstance);

        // Load initial data
        await loadContractData(contractInstance);
      }
    };

    initContract();
  }, []);

  const loadContractData = async (contractInstance = contract) => {
    if (!contractInstance) return;

    try {
      const [bal, count] = await Promise.all([
        contractInstance.getContractBalance(),
        contractInstance.getUserCount()
      ]);

      setBalance(ethers.utils.formatUnits(bal, 6));
      setUserCount(count.toString());
    } catch (error) {
      console.error('Error loading contract data:', error);
    }
  };

  const registerUser = useCallback(async () => {
    if (!contractWithSigner) throw new Error('Contract not initialized');

    setLoading(true);
    try {
      const tx = await contractWithSigner.registerUser();
      const receipt = await tx.wait();
      await loadContractData();
      return receipt;
    } finally {
      setLoading(false);
    }
  }, [contractWithSigner]);

  const depositUSDC = useCallback(async (amount) => {
    if (!contractWithSigner) throw new Error('Contract not initialized');

    setLoading(true);
    try {
      const amountWei = ethers.utils.parseUnits(amount.toString(), 6);
      const tx = await contractWithSigner.depositUsdc(amountWei);
      const receipt = await tx.wait();
      await loadContractData();
      return receipt;
    } finally {
      setLoading(false);
    }
  }, [contractWithSigner]);

  return {
    contract,
    contractWithSigner,
    balance,
    userCount,
    loading,
    registerUser,
    depositUSDC,
    loadContractData
  };
};
```

## MetaMask Network Setup

```javascript
const addArbitrumSepolia = async () => {
  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: '0x66eee', // 421614 in hex
        chainName: 'Arbitrum Sepolia',
        nativeCurrency: {
          name: 'ETH',
          symbol: 'ETH',
          decimals: 18
        },
        rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
        blockExplorerUrls: ['https://sepolia.arbiscan.io/']
      }]
    });
  } catch (error) {
    console.error('Failed to add network:', error);
  }
};
```

## Error Handling

```javascript
const handleContractError = (error) => {
  if (error.code === 4001) {
    return 'Transaction rejected by user';
  } else if (error.code === -32603) {
    return 'Internal JSON-RPC error';
  } else if (error.message.includes('insufficient funds')) {
    return 'Insufficient funds for transaction';
  } else if (error.message.includes('Contract paused')) {
    return 'Contract is currently paused';
  }
  return error.message || 'Transaction failed';
};
```

## Files Included
- `CastPayPaymaster.json` - Contract ABI
- `deployment-info.json` - Deployment details
- `frontend-integration.md` - This guide

## Next Steps
1. Copy the ABI file to your frontend project
2. Use the contract address in your environment variables
3. Implement the functions you need for your app
4. Test on Arbitrum Sepolia testnet first