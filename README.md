# CastPay

CastPay enables seamless, ETH-free USDC transfers via social usernames, reducing friction in crypto payments on social platforms.

## Overview

CastPay allows Farcaster users to send USDC payments using simple commands like `@username /pay 5 USDC` without needing to hold ETH for gas fees. The system uses a Stylus-based Paymaster contract on Arbitrum to sponsor gas fees, making crypto payments as easy as sending a message.

## Problem and Solution

### The Problem

Traditional crypto payments on social platforms face several barriers:

- **Gas Fee Friction**: Users need to hold native tokens (ETH) to pay gas fees, creating a poor UX
- **Complex Addresses**: Wallet addresses are hard to remember and type, especially on mobile
- **Multiple Steps**: Current payment flows require multiple app switches and confirmations
- **Technical Barriers**: Users need deep crypto knowledge to navigate gas prices and network fees

### Our Solution

CastPay eliminates these barriers through:

- **Account Abstraction**: ERC-4337 compatible smart accounts remove gas fee requirements
- **Social Identity**: Pay using familiar @usernames instead of complex wallet addresses
- **Gasless Transactions**: Stylus Paymaster sponsors all gas fees from USDC balance
- **Native Integration**: Seamless Farcaster Mini App experience without leaving the social platform
- **Instant Settlement**: Sub-5 second transaction completion with immediate confirmation

This creates a Web2-like payment experience while maintaining full crypto ownership and transparency.

## Features

- **Gasless Payments**: Send USDC without holding ETH
- **Username-based Transfers**: Pay using @usernames instead of wallet addresses
- **Instant Transactions**: Complete payments in under 5 seconds
- **Farcaster Integration**: Native mini app integration with Warpcast
- **ERC-4337 Compatible**: Built on Account Abstraction standards
- **Stylus Paymaster**: Efficient Rust-based smart contracts on Arbitrum

## Quick Start

### Prerequisites

- Node.js 16+ and pnpm
- Warpcast account with linked wallet
- Arbitrum testnet ETH for initial setup

### Installation

```bash
git clone https://github.com/your-org/castpay
cd castpay
pnpm install
```

### Development

1. **Start the frontend**:
   ```bash
   cd frontend
   pnpm dev
   ```

2. **Start the relayer service**:
   ```bash
   cd backend
   pnpm start
   ```

3. **Deploy contracts**:
   ```bash
   cd contracts/template
   cargo build --release
   # Deploy using your preferred method
   ```

## Usage

### Sending a Payment

1. Enable CastPay Mini App in Warpcast
2. Type `@username /pay [amount] USDC` in a cast or DM
3. Confirm the payment in the popup modal
4. Payment completes instantly without ETH fees

### Example

```
@alice /pay 10 USDC
```

This sends 10 USDC to the user @alice.

## Architecture

```

  Farcaster               CastPay              Arbitrum     
  Mini App                 Relayer          Blockchain    
  (Frontend)              (Backend)            (Contracts)    

```

### Components

- **Frontend**: React-based Farcaster Mini App for user interface
- **Backend**: Node.js relayer service for transaction bundling
- **Contracts**: Stylus Paymaster contract written in Rust
- **Integrations**: Farcaster API for username resolution

## Project Structure

```
castpay/
    frontend/           # Farcaster Mini App UI
        src/
            App.tsx
            components/
        package.json
    backend/            # Relayer service
        src/
            relayer.js
        package.json
    contracts/          # Smart contracts
        template/
            src/
                lib.rs
            Cargo.toml
    scripts/           # Deployment scripts
```

## Configuration

### Environment Variables

Create `.env` files in the respective directories:

**Frontend (.env)**:
```
VITE_RELAYER_URL=http://localhost:3001
VITE_CHAIN_ID=421614
```

**Backend (.env)**:
```
PRIVATE_KEY=your_private_key
ARBITRUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
FARCASTER_API_KEY=your_api_key
```

## Smart Contracts

The Paymaster contract is built using Arbitrum Stylus (Rust/WASM) and implements ERC-4337 standards:

- Validates user operations
- Sponsors gas fees by deducting from USDC balance
- Includes ~10% surcharge for sustainability
- Deployed on Arbitrum testnet

## API Reference

### Relayer Endpoints

- `POST /send-payment` - Submit a payment operation
- `GET /payment-status/:txHash` - Check payment status
- `GET /user-balance/:address` - Get user USDC balance

### Payment Format

```json
{
  "recipient": "@username",
  "amount": "10.00",
  "currency": "USDC",
  "signature": "0x..."
}
```

## Security

- No private keys stored by the application
- Rate limiting to prevent abuse
- Signature validation for all transactions
- Paymaster validates operations before sponsoring



## Contributors

- [@emmaglorypraise](https://github.com/emmaglorypraise) 
- [@ajtech001](https://github.com/ajtech001)
- [@nnennaokoye](https://github.com/nnennaokoye)


## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details
