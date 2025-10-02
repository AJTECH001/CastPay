const { ethers } = require('ethers');

class BlockchainService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
    this.relayerWallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, this.provider);

    this.usdcContract = new ethers.Contract(
      process.env.USDC_ADDRESS,
      ['function balanceOf(address) view returns (uint256)', 'function allowance(address, address) view returns (uint256)'],
      this.provider
    );
  }

  async validateTransfer(from, to, amountWei) {
    const balance = await this.usdcContract.balanceOf(from);
    if (balance < amountWei) throw new Error('Insufficient USDC balance');

    const spender = this.relayerWallet.address;  
    const allowance = await this.usdcContract.allowance(from, spender);
    if (allowance < amountWei) throw new Error('Insufficient paymaster allowance');
  }

  // async executePaymasterTransfer(from, to, amountWei) {
  //   const gasPrice = await this.provider.getFeeData();
  //   const estimatedGas = await this.usdcContract.transferFrom.estimateGas(from, to, amountWei);

  //   const tx = await this.usdcContract.connect(this.relayerWallet).transferFrom(
  //     from, to, amountWei, { gasLimit: estimatedGas * 120n / 100n, gasPrice: gasPrice.gasPrice }
  //   );

  //   const receipt = await tx.wait();
  //   return { transactionHash: tx.hash, receipt };
  // }

  async executePaymasterTransfer(from, to, amountWei) {
    console.log('🔄 Executing paymaster transfer...');

    try {
      // First, try to call the sponsorship function
      console.log('⛽ Calling gas sponsorship...');
      const gasPrice = await this.provider.getFeeData();
      const estimatedGas = await this.usdcContract.transferFrom.estimateGas(from, to, amountWei);
      const gasCost = estimatedGas * gasPrice.gasPrice;

      // Try to call the sponsorship function
      try {
        const paymasterABI = ["function sponsor_gas_for_user(address user, uint256 gas_cost) external"];
        const paymasterContract = new ethers.Contract(process.env.PAYMASTER_ADDRESS, paymasterABI, this.relayerWallet);

        const sponsorTx = await paymasterContract.sponsor_gas_for_user(from, gasCost);
        console.log('📝 Sponsorship TX:', sponsorTx.hash);
        await sponsorTx.wait();
        console.log('✅ Gas sponsored successfully');
      } catch (sponsorError) {
        console.log('⚠️ Gas sponsorship failed, proceeding with regular transfer:', sponsorError.message);
      }

      // Proceed with the transfer
      const tx = await this.usdcContract.connect(this.relayerWallet).transferFrom(
        from, to, amountWei, { gasLimit: estimatedGas * 120n / 100n }
      );

      const receipt = await tx.wait();
      console.log('✅ Transfer completed, gas used:', receipt.gasUsed.toString());

      return { transactionHash: tx.hash, receipt };

    } catch (error) {
      console.error('❌ Transfer execution failed:', error);
      throw error;
    }
  }

  async getUserBalance(address) {
    const balance = await this.usdcContract.balanceOf(address);
    const allowance = await this.usdcContract.allowance(address, process.env.PAYMASTER_ADDRESS);

    return {
      address,
      balance: ethers.formatUnits(balance, 6),
      paymasterAllowance: ethers.formatUnits(allowance, 6),
      paymasterAddress: process.env.PAYMASTER_ADDRESS
    };
  }
}

module.exports = new BlockchainService();