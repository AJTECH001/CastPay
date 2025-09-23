// Chain definitions for the Farcaster + Arbitrum Mini-App Starter.
// Includes custom Nitro localhost for Stylus development and Arbitrum mainnets for production.
// Use these chain objects in Wagmi and viem configuration.

import { defineChain } from 'viem';

// Custom chain config for local Stylus/Nitro development
export const localhost = defineChain({
  id: 412346, // Unique chain ID for local dev
  name: 'Nitro Localhost',
  network: 'Nitro localhost',
  nativeCurrency: {
    decimals: 18,
    name: 'ETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://localhost:8547'], // Local RPC endpoint
      webSocket: ['ws://localhost:8547'],
    },
    public: {
      http: ['http://localhost:8547'],
      webSocket: ['ws://localhost:8547'],
    },
  },
  testnet: false,
});

// Import and re-export standard Arbitrum One and Sepolia testnet chains
import { arbitrum, arbitrumSepolia } from 'viem/chains';
export { arbitrum, arbitrumSepolia };
