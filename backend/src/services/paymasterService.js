const { ethers } = require('ethers');
const blockchainService = require('./blockchainService');

class PaymasterService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
    this.relayerWallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, this.provider);

    // Paymaster contract ABI (simplified)
    this.paymasterABI = [
      "function get_contract_balance() view returns (uint256)",
      "function get_total_usdc_deposited() view returns (uint256)",
      "function is_paused() view returns (bool)",
      "function is_gas_sponsorship_enabled() view returns (bool)",
      "function get_user_count() view returns (uint256)",
      "function deposit_usdc(uint256 amount) external",
      "function register_user() external"
    ];

    this.paymasterContract = new ethers.Contract(
      process.env.PAYMASTER_ADDRESS,
      this.paymasterABI,
      this.provider
    );

    this.checkInitialization();

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
      const [
        contractBalance,
        totalDeposited,
        isPaused,
        sponsorshipEnabled,
        userCount
      ] = await Promise.all([
        this.paymasterContract.get_contract_balance(),
        this.paymasterContract.get_total_usdc_deposited(),
        this.paymasterContract.is_paused(),
        this.paymasterContract.is_gas_sponsorship_enabled(),
        this.paymasterContract.get_user_count()
      ]);

      return {
        contractBalance: contractBalance.toString(),
        totalDeposited: totalDeposited.toString(),
        isPaused,
        sponsorshipEnabled,
        userCount: userCount.toString(),
        paymasterAddress: process.env.PAYMASTER_ADDRESS
      };
    } catch (error) {
      console.error('Paymaster status error:', error);
      throw new Error('Failed to get paymaster status');
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
      throw new Error('Failed to get paymaster balance');
    }
  }
}

module.exports = new PaymasterService();