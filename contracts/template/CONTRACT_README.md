# CastPay Paymaster Contract

ERC-4337 compatible Paymaster contract built with Arbitrum Stylus for gasless USDC payments on Farcaster.

## Overview

The CastPay Paymaster contract enables gasless transactions by sponsoring gas fees in exchange for USDC. Users can send payments using social usernames without needing to hold ETH for gas fees.

## Features

- **ERC-4337 Compatible**: Implements the Account Abstraction standard
- **USDC Gas Sponsorship**: Pays gas fees using user's USDC balance
- **Fee Structure**: Configurable fee percentage for sustainability
- **Access Control**: Owner-only administrative functions
- **Pause Mechanism**: Emergency pause functionality
- **Event Logging**: Comprehensive event emission for tracking

## Contract Architecture

### Core Functions

- `initialize()`: One-time setup with USDC token address and parameters
- `validatePaymasterUserOp()`: Validates user operations during bundling
- `postOp()`: Deducts USDC fees after successful execution
- `getUserBalance()`: Checks user's USDC balance
- `withdrawFees()`: Owner function to withdraw accumulated fees

### Storage

- `owner`: Contract owner address
- `usdc_token`: USDC token contract address
- `min_balance`: Minimum USDC balance required
- `fee_percentage`: Fee percentage in basis points
- `accumulated_fees`: Total collected fees
- `user_tx_count`: Transaction count per user
- `paused`: Pause state flag

## Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [Cargo](https://doc.rust-lang.org/cargo/)
- [Stylus CLI](https://docs.arbitrum.io/stylus/stylus-quickstart)
- [Node.js](https://nodejs.org/) (v16+)

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   cargo update
   ```

2. **Copy environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Build the contract**:
   ```bash
   npm run build
   ```

## Deployment

### Local Testnet

```bash
# Start local Arbitrum node (if available)
npm run nitro-node

# Deploy to local testnet
npm run deploy:local
```

### Arbitrum Sepolia Testnet

```bash
# Set environment variables
export DEPLOY_PRIVATE_KEY=your_private_key
export STYLUS_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# Deploy to testnet
npm run deploy:testnet
```

### Custom Deployment

```bash
# Use the custom deployment script
npm run deploy:custom
```

## Testing

```bash
# Run all tests
npm run test

# Run unit tests only
npm run test:unit

# Run with coverage (if configured)
cargo test --coverage
```

## Development Workflow

1. **Make changes** to `src/lib.rs`
2. **Build** with `npm run build`
3. **Test** with `npm run test`
4. **Check** with `npm run check`
5. **Deploy** with appropriate deploy command

## Contract Interaction

### Initialization

```rust
// Initialize the contract (only once)
contract.initialize(
    usdc_token_address,
    min_balance,      // e.g., 1_000_000 (1 USDC with 6 decimals)
    fee_percentage    // e.g., 1000 (10% in basis points)
)?;
```

### User Operations

The contract automatically handles ERC-4337 user operations through:

1. **Validation Phase**: `validatePaymasterUserOp()` checks user balance
2. **Execution Phase**: User's transaction executes
3. **Post-Operation**: `postOp()` deducts USDC fees

### Administrative Functions

```rust
// Pause/unpause (owner only)
contract.set_paused(true)?;

// Update minimum balance (owner only)
contract.set_min_balance(new_amount)?;

// Update fee percentage (owner only)
contract.set_fee_percentage(new_percentage)?;

// Withdraw accumulated fees (owner only)
contract.withdraw_fees(amount)?;
```

## Configuration

### Environment Variables

- `PRIVATE_KEY`: Deployment private key
- `ARBITRUM_RPC_URL`: RPC endpoint
- `USDC_TOKEN`: USDC contract address
- `MIN_BALANCE`: Minimum USDC balance (wei)
- `FEE_PERCENTAGE`: Fee in basis points (1000 = 10%)

### Contract Parameters

- **Min Balance**: Minimum USDC required to sponsor transactions
- **Fee Percentage**: Additional fee charged (in basis points)
- **USDC Token**: Address of the USDC contract on the network

## Security Considerations

- **Owner Privileges**: Owner can pause, withdraw fees, and update parameters
- **Balance Checks**: Users must have sufficient USDC before sponsorship
- **Failed Transactions**: No fees charged for failed operations
- **Access Control**: Critical functions protected by owner-only modifiers

## Gas Optimization

- **Stylus Efficiency**: Rust compilation to WASM for optimal gas usage
- **Storage Optimization**: Minimal storage reads/writes
- **Event Logging**: Efficient event emission for off-chain tracking

## Troubleshooting

### Build Issues

```bash
# Clean and rebuild
npm run clean
npm run build
```

### Deployment Issues

```bash
# Check gas estimation
npm run estimate-gas

# Verify network connectivity
npm run check
```

### Testing Issues

```bash
# Run individual test
cargo test test_initialization --lib

# Verbose output
cargo test -- --nocapture
```

## ABI Generation

```bash
# Export Solidity ABI for frontend integration
npm run export-abi
```

The generated ABI will be available for integration with frontend applications and other smart contracts.

## Integration

To integrate with the CastPay system:

1. **Frontend**: Use the exported ABI to interact with the contract
2. **Relayer**: Submit user operations to the EntryPoint with this paymaster
3. **Backend**: Monitor events for payment tracking and analytics

## Support

For issues and questions:

- Check the [main README](../../README.md)
- Review [Stylus documentation](https://docs.arbitrum.io/stylus/)
- Open an issue on the repository