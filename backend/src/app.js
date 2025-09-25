const express = require('express');
const { ethers } = require('ethers');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

class CastPayRelayer {
  constructor() {
    this.app = express();

    this.provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
    this.relayerWallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, this.provider);

    this.usdcAddress = process.env.USDC_ADDRESS || '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'; // Arbitrum Sepolia USDC
    this.paymasterAddress = process.env.PAYMASTER_ADDRESS; // Your deployed Stylus contract

    this.usdcContract = new ethers.Contract(
      this.usdcAddress,
      [
        "function balanceOf(address owner) view returns (uint256)",
        "function transfer(address to, uint256 amount) returns (bool)",
        "function transferFrom(address from, address to, uint256 amount) returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)"
      ],
      this.provider
    );

    this.paymasterContract = new ethers.Contract(
      this.paymasterAddress,
      [
        // User functions
        "function register_user() external",
        "function deposit_usdc(uint256 amount) external",
        "function withdraw_usdc(uint256 amount) external",
        "function sponsor_gas_for_user(address user, uint256 gas_cost) external",

        // View functions
        "function get_contract_balance() view returns (uint256)",
        "function get_total_usdc_deposited() view returns (uint256)",
        "function is_paused() view returns (bool)",
        "function owner() view returns (address)",
        "function is_gas_sponsorship_enabled() view returns (bool)",
        "function get_min_balance_threshold() view returns (uint256)",
        "function get_fee_collector() view returns (address)",
        "function get_user_count() view returns (uint256)",

        // Admin functions
        "function pause() external",
        "function unpause() external",
        "function transfer_ownership(address new_owner) external",
        "function set_fee_collector(address new_collector) external",
        "function set_min_balance_threshold(uint256 new_threshold) external",
        "function set_gas_sponsorship_enabled(bool enabled) external"
      ],
      this.provider
    );

    this.usernameCache = new Map();
    this.pendingTransactions = new Map();
    this.userNonces = new Map();

    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors({
      origin: [
        'http://localhost:3000',
        'https://cast-pay-frontend.vercel.app',
        'https://cadf9eb7e446.ngrok-free.app'
      ],
      credentials: true
    }));

    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: 'Too many requests from this IP'
    });
    this.app.use(limiter);

    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    this.app.get('/health', this.healthCheck.bind(this));
    this.app.get('/resolve/:username', this.resolveUsername.bind(this));
    this.app.post('/transfer', this.sponsoredTransfer.bind(this));
    this.app.get('/status/:txId', this.getTransactionStatus.bind(this));
    this.app.get('/balance/:address', this.getUserBalance.bind(this));
    this.app.get('/nonce/:address', this.getUserNonce.bind(this));

    this.app.get('/paymaster/status', this.getPaymasterStatus.bind(this));
    this.app.post('/paymaster/deposit', this.depositToPaymaster.bind(this));
    this.app.post('/paymaster/register', this.registerUser.bind(this));
    this.app.get('/paymaster/balance', this.getPaymasterBalance.bind(this));
  }

  async healthCheck(req, res) {
    try {
      const paymasterStatus = await this.getPaymasterStatusInternal();

      res.json({
        status: 'ok',
        timestamp: Date.now(),
        paymaster: {
          address: this.paymasterAddress,
          ...paymasterStatus
        },
        network: 'Arbitrum',
        mode: 'stylus-erc4337'
      });
    } catch (error) {
      res.json({
        status: 'degraded',
        error: 'Paymaster connection issue',
        details: error.message
      });
    }
  }

  async resolveUsername(req, res) {
    try {
      const { username } = req.params;
      const cleanUsername = username.replace('@', '').toLowerCase();

      if (this.usernameCache.has(cleanUsername)) {
        const cachedData = this.usernameCache.get(cleanUsername);
        if (Date.now() - cachedData.timestamp < 300000) {
          return res.json({
            address: cachedData.address,
            source: 'cache',
            username: cleanUsername
          });
        }
      }

      if (process.env.NEYNAR_API_KEY) {
        try {
          const neynarResponse = await axios.get(
            `https://api.neynar.com/v2/farcaster/user/by_username?username=${cleanUsername}`,
            {
              headers: {
                'api_key': process.env.NEYNAR_API_KEY,
                'accept': 'application/json'
              },
              timeout: 10000
            }
          );

          const address = neynarResponse.data?.user?.verified_addresses?.eth_addresses?.[0];

          if (address) {
            this.usernameCache.set(cleanUsername, {
              address,
              timestamp: Date.now(),
              source: 'neynar'
            });

            return res.json({
              address,
              source: 'neynar',
              username: cleanUsername,
              displayName: neynarResponse.data?.user?.display_name,
              fid: neynarResponse.data?.user?.fid
            });
          }
        } catch (error) {
          console.error('Neynar API error:', error.response?.data || error.message);
        }
      }

      res.status(404).json({
        error: 'User not found or no verified address',
        username: cleanUsername
      });

    } catch (error) {
      console.error('Username resolution error:', error);
      res.status(500).json({ error: 'Failed to resolve username' });
    }
  }

  async sponsoredTransfer(req, res) {
    try {
      const { from, to, amount, signature, nonce } = req.body;

      if (!ethers.isAddress(from) || !ethers.isAddress(to)) {
        return res.status(400).json({ error: 'Invalid addresses' });
      }

      const amountWei = ethers.parseUnits(amount.toString(), 6);
      if (amountWei <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      if (!signature) {
        return res.status(400).json({ error: 'Signature required' });
      }

      const isValidSignature = await this.verifySignature(from, to, amountWei, nonce, signature);
      if (!isValidSignature) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const txId = ethers.keccak256(ethers.toUtf8Bytes(from + to + amount + nonce + Date.now()));

      this.pendingTransactions.set(txId, {
        from,
        to,
        amount: amountWei.toString(),
        nonce,
        status: 'pending',
        timestamp: Date.now()
      });

      this.processPaymasterTransfer(txId, from, to, amountWei, nonce, signature);

      res.json({
        txId,
        status: 'submitted',
        message: 'Transfer submitted via Stylus Paymaster',
        paymasterAddress: this.paymasterAddress,
        mode: 'erc4337-stylus'
      });

    } catch (error) {
      console.error('Transfer submission error:', error);
      res.status(500).json({ error: 'Failed to submit transfer' });
    }
  }

  async processPaymasterTransfer(txId, from, to, amountWei, nonce, signature) {
    try {
      this.updateTransactionStatus(txId, 'processing');

      await this.ensureUserRegistered(from);

      const userBalance = await this.usdcContract.balanceOf(from);
      if (userBalance < amountWei) {
        this.updateTransactionStatus(txId, 'failed', { error: 'Insufficient USDC balance' });
        return;
      }

      const allowance = await this.usdcContract.allowance(from, this.paymasterAddress);
      if (allowance < amountWei) {
        this.updateTransactionStatus(txId, 'failed', {
          error: 'Insufficient paymaster allowance',
          instructions: 'User must approve the paymaster contract to spend USDC'
        });
        return;
      }

      const gasPrice = await this.provider.getFeeData();
      const estimatedGas = await this.usdcContract.transferFrom.estimateGas(from, to, amountWei);
      const gasCost = estimatedGas * gasPrice.gasPrice;

      await this.requestGasSponsorship(from, gasCost);

      const tx = await this.usdcContract.connect(this.relayerWallet).transferFrom(
        from,
        to,
        amountWei,
        {
          gasLimit: estimatedGas * 120n / 100n,
          gasPrice: gasPrice.gasPrice
        }
      );

      this.updateTransactionStatus(txId, 'submitted', {
        transactionHash: tx.hash,
        paymasterAddress: this.paymasterAddress,
        gasSponsored: true
      });

      const receipt = await tx.wait();

      if (receipt.status === 1) {
        this.updateTransactionStatus(txId, 'success', {
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          paymasterExecuted: true
        });

        this.userNonces.set(from, nonce + 1);
      } else {
        this.updateTransactionStatus(txId, 'failed', { error: 'Transaction failed' });
      }

    } catch (error) {
      console.error(`Paymaster transfer ${txId} failed:`, error);
      this.updateTransactionStatus(txId, 'failed', {
        error: error.message,
        paymasterError: true
      });
    }
  }

  async ensureUserRegistered(userAddress) {
    try {
      await this.paymasterContract.connect(this.relayerWallet).register_user();
    } catch (error) {
      console.log('User registration:', error.message);
    }
  }

  async requestGasSponsorship(userAddress, gasCost) {
    try {
      await this.paymasterContract.connect(this.relayerWallet).sponsor_gas_for_user(
        userAddress,
        gasCost
      );
      return true;
    } catch (error) {
      console.error('Gas sponsorship failed:', error);
      throw new Error('Paymaster gas sponsorship unavailable');
    }
  }

  async getPaymasterStatus(req, res) {
    try {
      const status = await this.getPaymasterStatusInternal();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get paymaster status' });
    }
  }

  async getPaymasterStatusInternal() {
    const [
      contractBalance,
      totalDeposited,
      isPaused,
      owner,
      sponsorshipEnabled,
      minThreshold,
      feeCollector,
      userCount
    ] = await Promise.all([
      this.paymasterContract.get_contract_balance(),
      this.paymasterContract.get_total_usdc_deposited(),
      this.paymasterContract.is_paused(),
      this.paymasterContract.owner(),
      this.paymasterContract.is_gas_sponsorship_enabled(),
      this.paymasterContract.get_min_balance_threshold(),
      this.paymasterContract.get_fee_collector(),
      this.paymasterContract.get_user_count()
    ]);

    return {
      contractBalance: contractBalance.toString(),
      totalDeposited: totalDeposited.toString(),
      isPaused,
      owner,
      sponsorshipEnabled,
      minThreshold: minThreshold.toString(),
      feeCollector,
      userCount: userCount.toString(),
      usdcAddress: this.usdcAddress
    };
  }

  async depositToPaymaster(req, res) {
    try {
      const { amount } = req.body;
      const amountWei = ethers.parseUnits(amount.toString(), 6);

      const tx = await this.paymasterContract.connect(this.relayerWallet).deposit_usdc(amountWei);
      await tx.wait();

      res.json({
        success: true,
        transactionHash: tx.hash,
        amount: amountWei.toString(),
        message: 'USDC deposited to paymaster'
      });
    } catch (error) {
      res.status(500).json({ error: 'Deposit failed' });
    }
  }

  async registerUser(req, res) {
    try {
      const { userAddress } = req.body;

      const tx = await this.paymasterContract.connect(this.relayerWallet).register_user();
      await tx.wait();

      res.json({
        success: true,
        transactionHash: tx.hash,
        userAddress,
        message: 'User registered with paymaster'
      });
    } catch (error) {
      res.status(500).json({ error: 'Registration failed' });
    }
  }

  async getPaymasterBalance(req, res) {
    try {
      const balance = await this.paymasterContract.get_contract_balance();
      res.json({
        balance: balance.toString(),
        formatted: ethers.formatUnits(balance, 6)
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get balance' });
    }
  }

  async verifySignature(from, to, amountWei, nonce, signature) {
    try {
      const message = `CastPay:${from}:${to}:${amountWei}:${nonce}`;
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === from.toLowerCase();
    } catch (error) {
      return false;
    }
  }

  async getTransactionStatus(req, res) {
    try {
      const { txId } = req.params;
      if (!this.pendingTransactions.has(txId)) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      const transaction = this.pendingTransactions.get(txId);
      res.json({
        txId,
        status: transaction.status,
        timestamp: transaction.timestamp,
        details: transaction.details || {},
        paymasterAddress: this.paymasterAddress
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get status' });
    }
  }

  async getUserBalance(req, res) {
    try {
      const { address } = req.params;
      if (!ethers.isAddress(address)) {
        return res.status(400).json({ error: 'Invalid address' });
      }
      const balance = await this.usdcContract.balanceOf(address);
      const allowance = await this.usdcContract.allowance(address, this.paymasterAddress);

      res.json({
        address,
        balance: ethers.formatUnits(balance, 6),
        paymasterAllowance: ethers.formatUnits(allowance, 6),
        paymasterAddress: this.paymasterAddress
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get balance' });
    }
  }

  async getUserNonce(req, res) {
    try {
      const { address } = req.params;
      const nonce = this.userNonces.get(address) || 0;
      res.json({ address, nonce: nonce.toString() });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get nonce' });
    }
  }

  updateTransactionStatus(txId, status, details = {}) {
    if (this.pendingTransactions.has(txId)) {
      const tx = this.pendingTransactions.get(txId);
      tx.status = status;
      tx.details = { ...tx.details, ...details };
      tx.lastUpdated = Date.now();
    }
  }

  start(port = 3001) {
    this.app.listen(port, () => {
      console.log(`🚀 CastPay Relayer with Stylus Paymaster listening on port ${port}`);
      console.log(`🔗 Paymaster Contract: ${this.paymasterAddress}`);
      console.log(`💰 USDC Address: ${this.usdcAddress}`);
      console.log(`📊 Health check: http://localhost:${port}/health`);
    });
  }
}

function validateEnvironment() {
  const required = [
    'ARBITRUM_RPC_URL',
    'RELAYER_PRIVATE_KEY',
    'PAYMASTER_ADDRESS'  // Your deployed Stylus contract address
  ];

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    process.exit(1);
  }
  console.log('✅ Environment validated for Stylus Paymaster integration');
}

if (require.main === module) {
  require('dotenv').config();
  validateEnvironment();
  const relayer = new CastPayRelayer();
  relayer.start(process.env.PORT || 3001);
}

module.exports = CastPayRelayer;