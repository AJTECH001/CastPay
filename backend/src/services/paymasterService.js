const { ethers } = require('ethers');
const blockchainService = require('./blockchainService');

class PaymasterService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
    this.relayerWallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, this.provider);

    this.paymasterABI = [
      "function getContractBalance() view returns (uint256)",
      "function getTotalUsdcDeposited() view returns (uint256)",
      "function isPaused() view returns (bool)",
      "function isGasSponsorshipEnabled() view returns (bool)",
      "function getUserCount() view returns (uint256)",
      "function owner() view returns (address)",
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

  // async getPaymasterStatus() {
  //   try {

  //     if (!process.env.PAYMASTER_ADDRESS || !process.env.ARBITRUM_RPC_URL || !process.env.RELAYER_PRIVATE_KEY) {
  //       console.warn('Missing required environment variables for paymaster');
  //       return {
  //         contractBalance: "0",
  //         totalDeposited: "0",
  //         isPaused: true,
  //         sponsorshipEnabled: false,
  //         userCount: "0",
  //         paymasterAddress: process.env.PAYMASTER_ADDRESS || 'NOT_CONFIGURED',
  //         status: 'configuration_error',
  //         error: 'Missing required environment variables'
  //       };
  //     }

  //     // Try to call each function individually with error handling
  //     let contractBalance = "0";
  //     let totalDeposited = "0";
  //     let isPaused = true; // Default to paused for safety
  //     let sponsorshipEnabled = false;
  //     let userCount = "0";

  //     try {
  //       const balance = await this.paymasterContract.get_contract_balance();
  //       contractBalance = ethers.formatUnits(balance, 6);
  //     } catch (error) {
  //       console.log('get_contract_balance failed:', error.message);
  //     }

  //     try {
  //       const deposited = await this.paymasterContract.get_total_usdc_deposited();
  //       totalDeposited = ethers.formatUnits(deposited, 6);
  //     } catch (error) {
  //       console.log('get_total_usdc_deposited failed:', error.message);
  //     }

  //     try {
  //       isPaused = await this.paymasterContract.is_paused();
  //     } catch (error) {
  //       console.log('is_paused failed:', error.message);
  //     }

  //     try {
  //       sponsorshipEnabled = await this.paymasterContract.is_gas_sponsorship_enabled();
  //     } catch (error) {
  //       console.log('is_gas_sponsorship_enabled failed:', error.message);
  //     }

  //     try {
  //       const count = await this.paymasterContract.get_user_count();
  //       userCount = count.toString();
  //     } catch (error) {
  //       console.log('get_user_count failed:', error.message);
  //     }

  //     return {
  //       contractBalance,
  //       totalDeposited,
  //       isPaused,
  //       sponsorshipEnabled,
  //       userCount,
  //       paymasterAddress: process.env.PAYMASTER_ADDRESS,
  //       status: 'operational'
  //     };

  //   } catch (error) {
  //     console.error('Paymaster status error:', error.message);
  //     // Return a basic status even if contract calls fail
  //     return {
  //       contractBalance: "0",
  //       totalDeposited: "0",
  //       isPaused: true,
  //       sponsorshipEnabled: false,
  //       userCount: "0",
  //       paymasterAddress: process.env.PAYMASTER_ADDRESS || 'NOT_CONFIGURED',
  //       status: 'degraded',
  //       error: 'Contract communication issue'
  //     };
  //   }
  // }

  async getPaymasterStatus() {
    try {
      console.log('🔍 Checking paymaster status...');

      // Test basic contract connection first
      const code = await this.provider.getCode(process.env.PAYMASTER_ADDRESS);
      if (code === '0x') {
        throw new Error('No contract at address');
      }
      console.log('✅ Contract code found');

      // Test individual function calls to identify which one fails
      console.log('Testing getContractBalance...');
      const contractBalance = await this.paymasterContract.getContractBalance();
      console.log('✅ getContractBalance works');

      console.log('Testing get_total_usdc_deposited...');
      const totalDeposited = await this.paymasterContract.getTotalUsdcDeposited();
      console.log('✅ getTotalUsdcDeposited( works');

      console.log('Testing ispaused...');
      const isPaused = await this.paymasterContract.isPaused();
      console.log('✅ isPaused works');

      console.log('Testing is_gas_sponsorship_enabled...');
      const sponsorshipEnabled = await this.paymasterContract.isGasSponsorshipEnabled();
      console.log('✅ isGasSponsorshipEnabled works');

      console.log('Testing get_user_count...');
      const userCount = await this.paymasterContract.getUserCount();
      console.log('✅ getUserCount works');

      return {
        contractBalance: ethers.formatUnits(contractBalance, 6),
        totalDeposited: ethers.formatUnits(totalDeposited, 6),
        isPaused,
        sponsorshipEnabled,
        userCount: userCount.toString(),
        paymasterAddress: process.env.PAYMASTER_ADDRESS,
        status: 'operational',
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Paymaster status error:', error.message);
      throw new Error(`Failed to get paymaster status: ${error.message}`);
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
      const balance = await this.paymasterContract.getContractBalance();
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


// const { ethers } = require('ethers');

// class PaymasterService {
//   constructor() {
//     if (!process.env.ARBITRUM_RPC_URL || !process.env.RELAYER_PRIVATE_KEY || !process.env.PAYMASTER_ADDRESS) {
//       throw new Error('Missing required environment variables for PaymasterService');
//     }

//     this.provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
//     this.relayerWallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, this.provider);

//     this.paymasterABI = [
//       "function get_contract_balance() view returns (uint256)",
//       "function get_total_usdc_deposited() view returns (uint256)",
//       "function is_paused() view returns (bool)",
//       "function is_gas_sponsorship_enabled() view returns (bool)",
//       "function get_user_count() view returns (uint256)",
//       "function owner() view returns (address)",
//       "function get_fee_collector() view returns (address)",
//       "function get_min_balance_threshold() view returns (uint256)",
//       "function deposit_usdc(uint256 amount)",
//       "function register_user()"
//     ];

//     this.paymasterContract = new ethers.Contract(
//       process.env.PAYMASTER_ADDRESS,
//       this.paymasterABI,
//       this.provider
//     );
//   }

//   async checkInitialization() {
//     try {
//       const owner = await this.paymasterContract.owner();
//       if (owner === ethers.ZeroAddress) {
//         console.warn(' Paymaster contract not initialized!');
//         console.log('Run: npm run init-contract');
//       } else {
//         console.log('Paymaster contract initialized');
//         console.log('👑 Contract owner:', owner);
//       }
//     } catch (error) {
//       console.error('❌ Failed to check contract initialization:', error.message);
//     }
//   }

//   async validateAddress(address) {
//     return ethers.isAddress(address) && address !== ethers.ZeroAddress;
//   }

//   async getPaymasterStatus() {
//     if (!process.env.PAYMASTER_ADDRESS) {
//       throw new Error('Paymaster address not configured');
//     }

//     try {
//       const [
//         contractBalance,
//         totalDeposited,
//         isPaused,
//         sponsorshipEnabled,
//         userCount
//       ] = await Promise.all([
//         this.paymasterContract.get_contract_balance(),
//         this.paymasterContract.get_total_usdc_deposited(),
//         this.paymasterContract.is_paused(),
//         this.paymasterContract.is_gas_sponsorship_enabled(),
//         this.paymasterContract.get_user_count()
//       ]);

//       return {
//         contractBalance: ethers.formatUnits(contractBalance, 6),
//         totalDeposited: ethers.formatUnits(totalDeposited, 6),
//         isPaused,
//         sponsorshipEnabled,
//         userCount: userCount.toString(),
//         paymasterAddress: process.env.PAYMASTER_ADDRESS,
//         status: 'operational',
//         lastUpdated: new Date().toISOString()
//       };
//     } catch (error) {
//       console.error('Paymaster status error:', error);
//       throw new Error(`Failed to get paymaster status: ${error.message}`);
//     }
//   }

//   async depositToPaymaster(amount) {
//     if (!amount || isNaN(amount) || Number(amount) <= 0) {
//       throw new Error('Invalid amount provided');
//     }

//     try {
//       const amountWei = ethers.parseUnits(amount.toString(), 6);

//       const gasEstimate = await this.paymasterContract.deposit_usdc.estimateGas(amountWei);

//       const tx = await this.paymasterContract.connect(this.relayerWallet).deposit_usdc(amountWei, {
//         gasLimit: gasEstimate * 120n / 100n
//       });

//       const receipt = await tx.wait();

//       return {
//         success: true,
//         transactionHash: tx.hash,
//         blockNumber: receipt.blockNumber,
//         amount: amountWei.toString(),
//         message: 'USDC deposited to paymaster'
//       };
//     } catch (error) {
//       console.error('Deposit failed:', error);
//       throw new Error(`Deposit failed: ${error.message}`);
//     }
//   }

//   async registerUser(userAddress) {
//     if (!await this.validateAddress(userAddress)) {
//       throw new Error('Invalid user address');
//     }

//     try {
//       const gasEstimate = await this.paymasterContract.register_user.estimateGas();

//       const tx = await this.paymasterContract.connect(this.relayerWallet).register_user({
//         gasLimit: gasEstimate * 120n / 100n
//       });

//       const receipt = await tx.wait();

//       return {
//         success: true,
//         transactionHash: tx.hash,
//         blockNumber: receipt.blockNumber,
//         userAddress,
//         message: 'User registered with paymaster'
//       };
//     } catch (error) {
//       console.error('Registration failed:', error);
//       throw new Error(`Registration failed: ${error.message}`);
//     }
//   }

//   async getPaymasterBalance() {
//     try {
//       const balance = await this.paymasterContract.get_contract_balance();
//       return {
//         balance: balance.toString(),
//         formatted: ethers.formatUnits(balance, 6),
//         currency: 'USDC'
//       };
//     } catch (error) {
//       console.error('Failed to get paymaster balance:', error);
//       throw new Error(`Balance check failed: ${error.message}`);
//     }
//   }
// }

// module.exports = new PaymasterService();