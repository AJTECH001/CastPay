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

    this.usdcAddress = process.env.USDC_ADDRESS || '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

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

    this.usernameCache = new Map();
    this.pendingTransactions = new Map();
    this.userBalances = new Map();

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
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: Date.now(),
        solution: 'completely-free',
        gasProvider: 'self-funded'
      });
    });

    this.app.get('/resolve/:username', this.resolveUsername.bind(this));
    this.app.post('/transfer', this.sponsoredTransfer.bind(this));
    this.app.get('/status/:txId', this.getTransactionStatus.bind(this));
    this.app.get('/balance/:address', this.getUserBalance.bind(this));
    this.app.post('/deposit', this.depositForGas.bind(this));
    this.app.get('/gas-balance/:address', this.getGasBalance.bind(this));
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
      const { from, to, amount, signature } = req.body;

      if (!ethers.isAddress(from) || !ethers.isAddress(to)) {
        return res.status(400).json({ error: 'Invalid addresses' });
      }

      const amountWei = ethers.parseUnits(amount.toString(), 6);
      if (amountWei <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const txId = ethers.keccak256(ethers.toUtf8Bytes(from + to + amount + Date.now()));

      this.pendingTransactions.set(txId, {
        from,
        to,
        amount: amountWei.toString(),
        status: 'pending',
        timestamp: Date.now()
      });

      this.processTransfer(txId, from, to, amountWei, signature);

      res.json({
        txId,
        status: 'submitted',
        message: 'Transfer submitted for processing'
      });

    } catch (error) {
      console.error('Transfer submission error:', error);
      res.status(500).json({ error: 'Failed to submit transfer' });
    }
  }

  async processTransfer(txId, from, to, amountWei, userSignature) {
    try {
      this.updateTransactionStatus(txId, 'processing');

      const userBalance = await this.usdcContract.balanceOf(from);
      if (userBalance < amountWei) {
        this.updateTransactionStatus(txId, 'failed', { error: 'Insufficient USDC balance' });
        return;
      }

      const allowance = await this.usdcContract.allowance(from, this.relayerWallet.address);
      if (allowance < amountWei) {
        this.updateTransactionStatus(txId, 'failed', { error: 'Insufficient allowance' });
        return;
      }

      const gasPrice = await this.provider.getFeeData();
      const estimatedGas = await this.usdcContract.transferFrom.estimateGas(from, to, amountWei);
      const gasCost = estimatedGas * gasPrice.gasPrice;

      this.updateTransactionStatus(txId, 'executing');

      const tx = await this.usdcContract.connect(this.relayerWallet).transferFrom(
        from,
        to,
        amountWei,
        {
          gasLimit: estimatedGas * 120n / 100n,
          gasPrice: gasPrice.gasPrice
        }
      );

      this.updateTransactionStatus(txId, 'submitted', { transactionHash: tx.hash });

      const receipt = await tx.wait();

      if (receipt.status === 1) {
        this.updateTransactionStatus(txId, 'success', {
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString()
        });
      } else {
        this.updateTransactionStatus(txId, 'failed', { error: 'Transaction failed on chain' });
      }

    } catch (error) {
      console.error(`Transfer ${txId} failed:`, error);
      this.updateTransactionStatus(txId, 'failed', { error: error.message });
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
        lastUpdated: transaction.lastUpdated,
        details: transaction.details || {}
      });
    } catch (error) {
      console.error('Status check error:', error);
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
      const formattedBalance = ethers.formatUnits(balance, 6);

      res.json({
        address,
        balance: formattedBalance,
        balanceWei: balance.toString()
      });
    } catch (error) {
      console.error('Balance check error:', error);
      res.status(500).json({ error: 'Failed to get balance' });
    }
  }

  async depositForGas(req, res) {
    try {
      const { address, amount } = req.body;

      const currentBalance = this.userBalances.get(address) || 0;
      this.userBalances.set(address, currentBalance + parseFloat(amount));

      res.json({
        address,
        newBalance: this.userBalances.get(address),
        message: 'Gas deposit recorded'
      });
    } catch (error) {
      console.error('Deposit error:', error);
      res.status(500).json({ error: 'Failed to process deposit' });
    }
  }

  async getGasBalance(req, res) {
    try {
      const { address } = req.params;
      const balance = this.userBalances.get(address) || 0;

      res.json({
        address,
        gasBalance: balance.toString()
      });
    } catch (error) {
      console.error('Gas balance check error:', error);
      res.status(500).json({ error: 'Failed to get gas balance' });
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

  cleanupTransactions() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);

    for (const [txId, tx] of this.pendingTransactions.entries()) {
      if (tx.timestamp < cutoff) {
        this.pendingTransactions.delete(txId);
      }
    }
  }

  start(port = 3001) {
    setInterval(() => this.cleanupTransactions(), 60 * 60 * 1000);

    this.app.listen(port, () => {
      console.log(`🚀 CastPay Relayer listening on port ${port}`);
      console.log(`🔧 Gas paid by relayer wallet: ${this.relayerWallet.address}`);
      console.log(`📊 Health check: http://localhost:${port}/health`);
    });
  }
}

function validateEnvironment() {
  const required = ['ARBITRUM_RPC_URL', 'RELAYER_PRIVATE_KEY'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    process.exit(1);
  }

  console.log('✅ Environment validated');
}

if (require.main === module) {
  require('dotenv').config();
  validateEnvironment();
  const relayer = new CastPayRelayer();
  relayer.start(process.env.PORT || 3001);
}

module.exports = CastPayRelayer;