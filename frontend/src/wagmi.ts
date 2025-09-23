// Wagmi configuration for the Farcaster + Arbitrum Mini-App Starter.
// Sets up supported chains, connectors, and transports for EVM wallet interaction.
// Use this config in your app to enable wallet connection and contract calls.

import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector"; // Farcaster MiniApp connector for Wagmi
import { http, createConfig } from "wagmi"; // Wagmi core utilities
import { injected } from "@wagmi/connectors"; // Standard browser wallet connector
import { localhost, arbitrum, arbitrumSepolia } from "./viemChains"; // Supported chains

// Define supported chains based on environment
// Use Nitro localhost for development, Arbitrum mainnets for production
type Chain = typeof localhost | typeof arbitrum | typeof arbitrumSepolia;

const isDev = process.env.NODE_ENV === "development" || process.env.VITE_USE_LOCALHOST === "true";

// Wagmi requires a non-empty tuple for chains
const chains = (isDev ? [localhost, arbitrum, arbitrumSepolia] : [arbitrum, arbitrumSepolia]) as [Chain, ...Chain[]];

// Map each chain to its HTTP transport for RPC
const transports = chains.reduce((acc, chain) => {
  acc[chain.id] = http(chain.rpcUrls.default.http[0]);
  return acc;
}, {} as Record<number, ReturnType<typeof http>>);

// Main Wagmi config used throughout the app
export const config = createConfig({
  chains,
  connectors: isDev ? [injected(), farcasterMiniApp()] : [farcasterMiniApp()],
  transports,
});

// Type augmentation for Wagmi config
// Ensures correct typing when using Wagmi hooks
declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}