require('dotenv').config();
const { ethers } = require('ethers');

// Configuration
const RPC_URL = process.env.ARBITRUM_RPC_URL;
let PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
if (PRIVATE_KEY && !PRIVATE_KEY.startsWith('0x')) {
    PRIVATE_KEY = '0x' + PRIVATE_KEY;
}
const PAYMASTER_ADDRESS = process.env.PAYMASTER_ADDRESS;

// ABI for the functions we need
const ABI = [
    "function unpause() external",
    "function setGasSponsorshipEnabled(bool enabled) external",
    "function isPaused() view returns (bool)",
    "function isGasSponsorshipEnabled() view returns (bool)",
    "function owner() view returns (address)"
];

async function configurePaymaster() {
    try {
        // Setup provider and wallet
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        
        // Create contract instance
        const paymaster = new ethers.Contract(PAYMASTER_ADDRESS, ABI, wallet);

        console.log('🔧 Configuring Paymaster Contract...');
        console.log('Contract:', PAYMASTER_ADDRESS);
        console.log('Caller:', wallet.address);

        // Check if caller is owner
        const owner = await paymaster.owner();
        console.log('Owner:', owner);
        
        if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
            throw new Error(`Caller (${wallet.address}) is not the contract owner (${owner})`);
        }

        // Check current state
        console.log('\n📊 Checking current state...');
        const currentPaused = await paymaster.isPaused();
        console.log('Paused state retrieved:', currentPaused);
        
        const currentGasSponsorship = await paymaster.isGasSponsorshipEnabled();
        console.log('Gas sponsorship state retrieved:', currentGasSponsorship);
        
        console.log('\n📊 Current State:');
        console.log('Paused:', currentPaused);
        console.log('Gas Sponsorship Enabled:', currentGasSponsorship);

        // Execute transactions if needed
        if (currentPaused) {
            console.log('\n🔄 Unpausing contract...');
            const unpauseTx = await paymaster.unpause();
            console.log('Transaction sent:', unpauseTx.hash);
            await unpauseTx.wait();
            console.log('✅ Contract unpaused');
        } else {
            console.log('\n✅ Contract already unpaused');
        }

        if (!currentGasSponsorship) {
            console.log('\n🔄 Enabling gas sponsorship...');
            const enableTx = await paymaster.setGasSponsorshipEnabled(true);
            console.log('Transaction sent:', enableTx.hash);
            await enableTx.wait();
            console.log('✅ Gas sponsorship enabled');
        } else {
            console.log('\n✅ Gas sponsorship already enabled');
        }

        // Verify final state
        console.log('\n📊 Final State:');
        const finalPaused = await paymaster.isPaused();
        const finalGasSponsorship = await paymaster.isGasSponsorshipEnabled();
        
        console.log('Paused:', finalPaused);
        console.log('Gas Sponsorship Enabled:', finalGasSponsorship);

        console.log('\n🎉 Configuration completed successfully!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the script
configurePaymaster();