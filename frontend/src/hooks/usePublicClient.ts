// usePublicClient.ts
// viem public client setup for the Farcaster + Arbitrum Mini-App Starter.
// Provides a low-level RPC client for reading contract logs and data.
// Use this hook to interact with the blockchain outside of Wagmi's hooks.

import { createPublicClient, http } from 'viem';
import { arbitrum, localhost } from '../viemChains';

// Detect environment: use Nitro localhost for development, Arbitrum mainnet for production
const isDev = import.meta.env.MODE === 'development' || import.meta.env.VITE_USE_LOCALHOST === 'true';
const chain = isDev ? localhost : arbitrum;

// Export a viem public client instance for the selected chain
export const publicClient = createPublicClient({
  chain,
  transport: http(),
});
