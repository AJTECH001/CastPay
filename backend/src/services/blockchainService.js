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

    const allowance = await this.usdcContract.allowance(from, process.env.PAYMASTER_ADDRESS);
    if (allowance < amountWei) throw new Error('Insufficient paymaster allowance');
  }

  async executePaymasterTransfer(from, to, amountWei) {
    const gasPrice = await this.provider.getFeeData();
    const estimatedGas = await this.usdcContract.transferFrom.estimateGas(from, to, amountWei);

    const tx = await this.usdcContract.connect(this.relayerWallet).transferFrom(
      from, to, amountWei, { gasLimit: estimatedGas * 120n / 100n, gasPrice: gasPrice.gasPrice }
    );

    const receipt = await tx.wait();
    return { transactionHash: tx.hash, receipt };
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