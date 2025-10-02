require('dotenv').config();
const { ethers } = require('ethers');

const RPC_URL = process.env.ARBITRUM_RPC_URL;
const PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
const PAYMASTER_ADDRESS = process.env.PAYMASTER_ADDRESS;

const ABI = [
  // Initialization
  "function initialize(address initial_owner) external",

  // View functions
  "function owner() view returns (address)",
  "function is_paused() view returns (bool)",
  "function is_gas_sponsorship_enabled() view returns (bool)",
  "function get_contract_balance() view returns (uint256)",
  "function get_user_count() view returns (uint256)",

  // Admin functions
  "function unpause() external",
  "function set_gas_sponsorship_enabled(bool enabled) external"
];

async function setupPaymaster() {
  try {
    console.log('🚀 Setting up Paymaster Contract...\n');

    // Validate inputs
    if (!RPC_URL || !PRIVATE_KEY || !PAYMASTER_ADDRESS) {
      throw new Error('Missing required environment variables');
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const paymaster = new ethers.Contract(PAYMASTER_ADDRESS, ABI, wallet);

    console.log('📋 Contract Details:');
    console.log('Address:', PAYMASTER_ADDRESS);
    console.log('Caller:', wallet.address);

    // Step 1: Check/Initialize contract
    console.log('\n1. Checking contract initialization...');
    let owner;
    try {
      owner = await paymaster.owner();
      console.log('Current owner:', owner);
    } catch (error) {
      console.log('Contract not initialized, initializing...');
      const initTx = await paymaster.initialize(wallet.address);
      await initTx.wait();
      console.log('✅ Contract initialized');
      owner = wallet.address;
    }

    // Verify we're the owner
    if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
      throw new Error(`Not the contract owner. Owner: ${owner}, You: ${wallet.address}`);
    }
    console.log('✅ You are the contract owner');

    // Step 2: Check current state
    console.log('\n2. Checking current state...');
    const [paused, gasEnabled, balance, userCount] = await Promise.all([
      paymaster.is_paused(),
      paymaster.is_gas_sponsorship_enabled(),
      paymaster.get_contract_balance(),
      paymaster.get_user_count()
    ]);

    console.log('Paused:', paused);
    console.log('Gas Sponsorship Enabled:', gasEnabled);
    console.log('Contract Balance:', ethers.formatUnits(balance, 6), 'USDC');
    console.log('User Count:', userCount.toString());

    // Step 3: Configure contract
    console.log('\n3. Configuring contract...');
    let transactions = [];

    if (paused) {
      console.log('🔄 Unpausing contract...');
      const unpauseTx = await paymaster.unpause();
      await unpauseTx.wait();
      console.log('✅ Contract unpaused');
      transactions.push(unpauseTx.hash);
    }

    if (!gasEnabled) {
      console.log('🔄 Enabling gas sponsorship...');
      const gasTx = await paymaster.set_gas_sponsorship_enabled(true);
      await gasTx.wait();
      console.log('✅ Gas sponsorship enabled');
      transactions.push(gasTx.hash);
    }

    // Step 4: Verify final state
    console.log('\n4. Final state:');
    const [finalPaused, finalGasEnabled] = await Promise.all([
      paymaster.is_paused(),
      paymaster.is_gas_sponsorship_enabled()
    ]);

    console.log('Paused:', finalPaused);
    console.log('Gas Sponsorship Enabled:', finalGasEnabled);

    if (transactions.length > 0) {
      console.log('\n📝 Transaction Hashes:');
      transactions.forEach(hash => console.log(hash));
    }

    console.log('\n🎉 Paymaster setup completed successfully!');
    console.log('You can now test the API endpoint:');
    console.log('curl -X GET "http://localhost:3001/api/paymaster/status"');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupPaymaster();