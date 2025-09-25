const { ethers } = require('ethers');
const blockchainService = require('./blockchainService');

class PaymasterService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
    this.relayerWallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, this.provider);

    this.paymasterABI = [
      "function get_contract_balance() view returns (uint256)",
      "function get_total_usdc_deposited() view returns (uint256)",
      "function is_paused() view returns (bool)",
      "function is_gas_sponsorship_enabled() view returns (bool)",
      "function get_user_count() view returns (uint256)",
      "function owner() view returns (address)",
      "function get_fee_collector() view returns (address)",
      "function get_min_balance_threshold() view returns (uint256)"
    ];

    this.paymasterContract = new ethers.Contract(
      process.env.PAYMASTER_ADDRESS,
      this.paymasterABI,
      this.provider
    );
  }

  async checkInitialization() {
    try {
      const owner = await this.paymasterContract.owner();
      if (owner === ethers.ZeroAddress) {
        console.warn('⚠️  Paymaster contract not initialized!');
        console.log('💡 Run: npm run init-contract');
      } else {
        console.log('✅ Paymaster contract initialized');
        console.log('👑 Contract owner:', owner);
      }
    } catch (error) {
      console.error('❌ Failed to check contract initialization:', error.message);
    }
  }

  async getPaymasterStatus() {
    try {
      // Check if we have the required environment variables
      if (!process.env.PAYMASTER_ADDRESS || !process.env.ARBITRUM_RPC_URL || !process.env.RELAYER_PRIVATE_KEY) {
        console.warn('Missing required environment variables for paymaster');
        return {
          contractBalance: "0",
          totalDeposited: "0", 
          isPaused: true,
          sponsorshipEnabled: false,
          userCount: "0",
          paymasterAddress: process.env.PAYMASTER_ADDRESS || 'NOT_CONFIGURED',
          status: 'configuration_error',
          error: 'Missing required environment variables'
        };
      }

      // Try to call each function individually with error handling
      let contractBalance = "0";
      let totalDeposited = "0";
      let isPaused = true; // Default to paused for safety
      let sponsorshipEnabled = false;
      let userCount = "0";

      try {
        const balance = await this.paymasterContract.get_contract_balance();
        contractBalance = ethers.formatUnits(balance, 6);
      } catch (error) {
        console.log('get_contract_balance failed:', error.message);
      }

      try {
        const deposited = await this.paymasterContract.get_total_usdc_deposited();
        totalDeposited = ethers.formatUnits(deposited, 6);
      } catch (error) {
        console.log('get_total_usdc_deposited failed:', error.message);
      }

      try {
        isPaused = await this.paymasterContract.is_paused();
      } catch (error) {
        console.log('is_paused failed:', error.message);
      }

      try {
        sponsorshipEnabled = await this.paymasterContract.is_gas_sponsorship_enabled();
      } catch (error) {
        console.log('is_gas_sponsorship_enabled failed:', error.message);
      }

      try {
        const count = await this.paymasterContract.get_user_count();
        userCount = count.toString();
      } catch (error) {
        console.log('get_user_count failed:', error.message);
      }

      return {
        contractBalance,
        totalDeposited,
        isPaused,
        sponsorshipEnabled,
        userCount,
        paymasterAddress: process.env.PAYMASTER_ADDRESS,
        status: 'operational'
      };

    } catch (error) {
      console.error('Paymaster status error:', error.message);
      // Return a basic status even if contract calls fail
      return {
        contractBalance: "0",
        totalDeposited: "0",
        isPaused: true,
        sponsorshipEnabled: false,
        userCount: "0",
        paymasterAddress: process.env.PAYMASTER_ADDRESS || 'NOT_CONFIGURED',
        status: 'degraded',
        error: 'Contract communication issue'
      };
    }
  }


  async depositToPaymaster(amount) {
    try {
      const amountWei = ethers.parseUnits(amount.toString(), 6);
      const tx = await this.paymasterContract.connect(this.relayerWallet).deposit_usdc(amountWei);
      await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        amount: amountWei.toString(),
        message: 'USDC deposited to paymaster'
      };
    } catch (error) {
      throw new Error(`Deposit failed: ${error.message}`);
    }
  }

  async registerUser(userAddress) {
    try {
      const tx = await this.paymasterContract.connect(this.relayerWallet).register_user();
      await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
        userAddress,
        message: 'User registered with paymaster'
      };
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  async getPaymasterBalance() {
    try {
      const balance = await this.paymasterContract.get_contract_balance();
      return {
        balance: balance.toString(),
        formatted: ethers.formatUnits(balance, 6)
      };
    } catch (error) {
      console.error('Failed to get paymaster balance:', error.message);
      // Return default values instead of throwing
      return {
        balance: "0",
        formatted: "0.0"
      };
    }
  }
}

module.exports = new PaymasterService();