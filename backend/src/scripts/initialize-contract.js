const { ethers } = require('ethers');
require('dotenv').config();

async function initializeContract() {
    console.log('🚀 Initializing CastPay Contract...');
    
    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
    const relayerWallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);
    
    console.log('🔑 Relayer Address:', relayerWallet.address);
    
    // Contract ABI for initialization
    const contractABI = [
        "function initialize(address initial_owner) external",
        "function owner() view returns (address)",
        "function is_paused() view returns (bool)"
    ];
    
    const contract = new ethers.Contract(
        process.env.PAYMASTER_ADDRESS,
        contractABI,
        relayerWallet
    );
    
    try {
        // Check if already initialized
        const currentOwner = await contract.owner();
        if (currentOwner !== ethers.ZeroAddress) {
            console.log('✅ Contract already initialized');
            console.log('📋 Current owner:', currentOwner);
            return;
        }
        
        // Initialize contract
        console.log('⏳ Initializing contract...');
        const tx = await contract.initialize(relayerWallet.address);
        console.log('📝 Transaction hash:', tx.hash);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        console.log('✅ Contract initialized successfully!');
        console.log('📊 Block number:', receipt.blockNumber);
        
        // Verify initialization
        const newOwner = await contract.owner();
        console.log('👑 New contract owner:', newOwner);
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        
        if (error.reason) {
            console.error('Error reason:', error.reason);
        }
        
        if (error.transaction) {
            console.error('Transaction details:', error.transaction);
        }
    }
}

// Run if called directly
if (require.main === module) {
    initializeContract().catch(console.error);
}

module.exports = initializeContract;