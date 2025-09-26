// Wagmi configuration for CastPay - Web3 wallet integration.
// Sets up supported chains, connectors, and transports for EVM wallet interaction.
// Supports MetaMask, Coinbase Wallet, WalletConnect, and other standard wallets.

import { http, createConfig } from "wagmi"; // Wagmi core utilities
import { injected, walletConnect, coinbaseWallet } from "@wagmi/connectors"; // Standard wallet connectors
import { localhost, arbitrum, arbitrumSepolia } from "./viemChains"; // Supported chains

// Define supported chains based on environment
// Use Nitro localhost for development, Arbitrum mainnets for production
type Chain = typeof localhost | typeof arbitrum | typeof arbitrumSepolia;

// Use Vite's environment variables for mode detection
const isDev = (import.meta as any).env?.MODE === "development" || (import.meta as any).env?.VITE_USE_LOCALHOST === "true";

console.log('[Wagmi Config] Environment detection:', {
  MODE: (import.meta as any).env?.MODE,
  VITE_USE_LOCALHOST: (import.meta as any).env?.VITE_USE_LOCALHOST,
  isDev
});

// Wagmi requires a non-empty tuple for chains
const chains = (isDev ? [localhost, arbitrum, arbitrumSepolia] : [arbitrum, arbitrumSepolia]) as [Chain, ...Chain[]];

console.log('[Wagmi Config] Selected chains:', chains.map(c => ({ id: c.id, name: c.name })));

// Map each chain to its HTTP transport for RPC
const transports = chains.reduce((acc, chain) => {
  acc[chain.id] = http(chain.rpcUrls.default.http[0]);
  return acc;
}, {} as Record<number, ReturnType<typeof http>>);

// Create standard web wallet connectors
const createConnectors = () => {
  const connectors = [];
  
  try {
    // Browser extension wallets (MetaMask, etc.)
    connectors.push(injected({
      shimDisconnect: true,
    }));
    console.log('[Wagmi Config] Added injected connector');
  } catch (error) {
    console.error('[Wagmi Config] Failed to create injected connector:', error);
  }
  
  try {
    // Coinbase Wallet
    connectors.push(coinbaseWallet({
      appName: 'CastPay',
      appLogoUrl: '/CastPay.png',
    }));
    console.log('[Wagmi Config] Added Coinbase Wallet connector');
  } catch (error) {
    console.error('[Wagmi Config] Failed to create Coinbase Wallet connector:', error);
  }
  
  // Only add WalletConnect if we have a valid project ID
  const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
  if (walletConnectProjectId && walletConnectProjectId !== 'demo-project-id') {
    try {
      connectors.push(walletConnect({
        projectId: walletConnectProjectId,
        metadata: {
          name: 'CastPay',
          description: 'Gasless USDC payments on Arbitrum',
          url: typeof window !== 'undefined' ? window.location.origin : 'https://castpay.vercel.app',
          icons: ['/CastPay.png'],
        },
      }));
      console.log('[Wagmi Config] Added WalletConnect connector');
    } catch (error) {
      console.error('[Wagmi Config] Failed to create WalletConnect connector:', error);
    }
  } else {
    console.log('[Wagmi Config] Skipping WalletConnect - no valid project ID provided');
  }
  
  console.log('[Wagmi Config] Final connectors:', connectors.length, 'connectors created');
  
  // Ensure we have at least one connector
  if (connectors.length === 0) {
    console.error('[Wagmi Config] No connectors available! Adding basic injected as fallback.');
    connectors.push(injected());
  }
  
  return connectors;
};

// Main Wagmi config used throughout the app
export const config = createConfig({
  chains,
  connectors: createConnectors(),
  transports,
});

// Type augmentation for Wagmi config
// Ensures correct typing when using Wagmi hooks
declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}