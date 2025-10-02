// src/scripts/test-sponsorship.js
const { ethers } = require('ethers');
require('dotenv').config();

async function testSponsorship() {
    console.log('🧪 Testing Gas Sponsorship Function...');
    
    const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
    const wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);
    
    const paymasterABI = [
        "function sponsor_gas_for_user(address user, uint256 gas_cost) external"
    ];
    
    const paymaster = new ethers.Contract(process.env.PAYMASTER_ADDRESS, paymasterABI, wallet);
    
    try {
        // Test with a small gas cost (0.0001 ETH worth)
        const gasCost = ethers.parseEther("0.0001");
        const testUser = wallet.address; // Sponsor gas for yourself
        
        console.log('Testing with:');
        console.log('User:', testUser);
        console.log('Gas cost:', ethers.formatEther(gasCost), 'ETH');
        
        const tx = await paymaster.sponsor_gas_for_user(testUser, gasCost);
        console.log('✅ Sponsorship TX sent:', tx.hash);
        
        const receipt = await tx.wait();
        console.log('✅ Sponsorship successful! Gas used:', receipt.gasUsed.toString());
        
    } catch (error) {
        console.error('❌ Sponsorship test failed:');
        console.error('Error:', error.message);
        
        if (error.reason) {
            console.error('Reason:', error.reason);
        }
    }
}

testSponsorship();