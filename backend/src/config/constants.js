module.exports = {
  // USDC contract addresses
  USDC_ADDRESSES: {
    ARBITRUM_MAINNET: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    ARBITRUM_SEPOLIA: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'
  },

  // Chain IDs
  CHAIN_IDS: {
    ARBITRUM_MAINNET: 42161,
    ARBITRUM_SEPOLIA: 421614
  },

  // Cache TTLs (in milliseconds)
  CACHE_TTL: {
    USERNAME_RESOLUTION: 5 * 60 * 1000, // 5 minutes
    TRANSACTION_STATUS: 24 * 60 * 60 * 1000 // 24 hours
  },

  // Transaction statuses
  TRANSACTION_STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    SUBMITTED: 'submitted',
    SUCCESS: 'success',
    FAILED: 'failed'
  },

  // Error messages
  ERROR_MESSAGES: {
    INSUFFICIENT_BALANCE: 'Insufficient USDC balance',
    INSUFFICIENT_ALLOWANCE: 'Insufficient paymaster allowance',
    USER_NOT_FOUND: 'User not found or no verified address',
    CONTRACT_PAUSED: 'Paymaster contract is paused'
  }
};