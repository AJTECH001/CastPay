// src/scripts/simple-init.js
const { ethers } = require('ethers');
require('dotenv').config();

async function simpleInitialize() {
    console.log('🚀 Simple Contract Initialization...');
    
    const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
    const relayerWallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);
    
    console.log('🔑 Relayer:', relayerWallet.address);
    console.log('📝 Contract:', process.env.PAYMASTER_ADDRESS);
    
    // Minimal ABI - just initialize and owner
    const contractABI = [
        "function initialize(address initial_owner) external",
        "function owner() view returns (address)"
    ];
    
    const contract = new ethers.Contract(
        process.env.PAYMASTER_ADDRESS,
        contractABI,
        relayerWallet
    );
    
    try {
        // Check if already initialized
        const owner = await contract.owner();
        console.log('Current owner:', owner);
        
        if (owner === ethers.ZeroAddress) {
            console.log('Initializing...');
            const tx = await contract.initialize(relayerWallet.address);
            console.log('TX hash:', tx.hash);
            await tx.wait();
            console.log('✅ Initialized successfully!');
        } else {
            console.log('✅ Already initialized');
        }
        
    } catch (error) {
        console.error('❌ Failed:', error.message);
        
        // Try with different gas settings
        if (error.code === 'CALL_EXCEPTION') {
            console.log('Trying with manual gas...');
            try {
                const tx = await contract.initialize(relayerWallet.address, {
                    gasLimit: 500000
                });
                console.log('TX hash:', tx.hash);
                await tx.wait();
                console.log('✅ Initialized with manual gas!');
            } catch (error2) {
                console.error('Still failed:', error2.message);
            }
        }
    }
}

simpleInitialize().catch(console.error);