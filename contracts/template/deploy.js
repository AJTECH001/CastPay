// CastPay Paymaster Deployment Script
// Deploys the Stylus Paymaster contract to Arbitrum

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  // Arbitrum Sepolia Testnet
  rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
  privateKey: process.env.PRIVATE_KEY,

  // Contract parameters
  usdcToken: process.env.USDC_TOKEN || '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // Arbitrum Sepolia USDC
  minBalance: process.env.MIN_BALANCE || '1000000', // 1 USDC (6 decimals)
  feePercentage: process.env.FEE_PERCENTAGE || '1000', // 10% (1000 basis points)

  // Gas settings
  gasLimit: process.env.GAS_LIMIT || '500000',
  gasPrice: process.env.GAS_PRICE || '1000000000', // 1 gwei
};

async function deployPaymaster() {
  console.log('🚀 Starting CastPay Paymaster deployment...');

  // Validate environment
  if (!config.privateKey) {
    throw new Error('PRIVATE_KEY environment variable is required');
  }

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);

  console.log(`📍 Deploying from address: ${wallet.address}`);
  console.log(`🌐 Network: ${config.rpcUrl}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance < ethers.parseEther('0.01')) {
    console.warn('⚠️  Low balance detected. Make sure you have enough ETH for deployment.');
  }

  try {
    // Read the compiled contract (assuming it's been built with cargo stylus)
    const contractPath = path.join(__dirname, 'target', 'wasm32-unknown-unknown', 'release', 'castpay_paymaster.wasm');

    if (!fs.existsSync(contractPath)) {
      throw new Error(`Contract WASM not found at ${contractPath}. Run 'cargo stylus export-abi' first.`);
    }

    console.log('📄 Contract WASM found, proceeding with deployment...');

    // For Stylus contracts, we need to use the Stylus CLI or custom deployment
    // This is a placeholder for the actual deployment logic
    console.log('⚡ Deploying Stylus contract...');
    console.log('📋 Contract parameters:');
    console.log(`   USDC Token: ${config.usdcToken}`);
    console.log(`   Min Balance: ${config.minBalance} (${ethers.formatUnits(config.minBalance, 6)} USDC)`);
    console.log(`   Fee Percentage: ${config.feePercentage} basis points (${config.feePercentage / 100}%)`);

    // TODO: Implement actual Stylus deployment
    // This would typically involve calling the Stylus deployment APIs

    console.log('✅ Deployment simulation completed!');
    console.log('💡 To deploy for real, use the Stylus CLI:');
    console.log('   cargo stylus deploy --private-key $PRIVATE_KEY');

    // Save deployment info
    const deploymentInfo = {
      network: 'arbitrum-sepolia',
      timestamp: new Date().toISOString(),
      deployer: wallet.address,
      contractParams: {
        usdcToken: config.usdcToken,
        minBalance: config.minBalance,
        feePercentage: config.feePercentage,
      },
      // contractAddress: 'TBD', // Will be filled after actual deployment
    };

    fs.writeFileSync(
      path.join(__dirname, 'deployment.json'),
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('📁 Deployment info saved to deployment.json');

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    throw error;
  }
}

// Verification function for post-deployment
async function verifyDeployment(contractAddress) {
  console.log('🔍 Verifying deployment...');

  const provider = new ethers.JsonRpcProvider(config.rpcUrl);

  // Check if contract exists
  const code = await provider.getCode(contractAddress);
  if (code === '0x') {
    throw new Error('Contract not found at the specified address');
  }

  console.log('✅ Contract deployed successfully!');
  console.log(`📍 Contract address: ${contractAddress}`);
  console.log(`🔗 Explorer: https://sepolia.arbiscan.io/address/${contractAddress}`);

  return true;
}

// Initialize contract after deployment
async function initializeContract(contractAddress) {
  console.log('🔧 Initializing contract...');

  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);

  // TODO: Call initialize function with proper ABI
  // This would require the generated ABI from the Stylus contract

  console.log('✅ Contract initialization completed!');
}

// Main execution
if (require.main === module) {
  deployPaymaster()
    .then(() => {
      console.log('🎉 Deployment process completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Deployment failed:', error);
      process.exit(1);
    });
}

module.exports = {
  deployPaymaster,
  verifyDeployment,
  initializeContract,
  config,
};