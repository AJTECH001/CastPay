const { ethers } = require('ethers');
require('dotenv').config();

async function fundPaymaster() {
    console.log('💰 Funding Paymaster Contract...');
    
    const provider = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
    const relayerWallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);
    
    console.log('🔑 Relayer:', relayerWallet.address);
    console.log('📝 Paymaster:', process.env.PAYMASTER_ADDRESS);
    console.log('💵 USDC Address:', process.env.USDC_ADDRESS);
    
    // USDC ABI (simplified)
    const usdcABI = [
        "function balanceOf(address account) view returns (uint256)",
        "function transfer(address to, uint256 amount) returns (bool)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)"
    ];
    
    // Paymaster ABI
    const paymasterABI = [
        "function deposit_usdc(uint256 amount) external",
        "function get_contract_balance() view returns (uint256)",
        "function get_total_usdc_deposited() view returns (uint256)"
    ];
    
    const usdcContract = new ethers.Contract(process.env.USDC_ADDRESS, usdcABI, relayerWallet);
    const paymasterContract = new ethers.Contract(process.env.PAYMASTER_ADDRESS, paymasterABI, relayerWallet);
    
    try {
        // 1. Check relayer USDC balance
        const relayerBalance = await usdcContract.balanceOf(relayerWallet.address);
        const relayerBalanceFormatted = ethers.formatUnits(relayerBalance, 6);
        console.log('💳 Relayer USDC Balance:', relayerBalanceFormatted, 'USDC');
        
        if (relayerBalance === 0n) {
            console.log('❌ Relayer has no USDC. Get testnet USDC first.');
            return;
        }
        
        // 2. Check current paymaster balance
        try {
            const currentBalance = await paymasterContract.get_contract_balance();
            const currentFormatted = ethers.formatUnits(currentBalance, 6);
            console.log('🏦 Current Paymaster Balance:', currentFormatted, 'USDC');
        } catch (error) {
            console.log('📊 Paymaster balance check failed (may be uninitialized)');
        }
        
        // 3. Determine amount to deposit (10% of balance or min 10 USDC)
        let depositAmount;
        if (relayerBalance > ethers.parseUnits("100", 6)) {
            depositAmount = relayerBalance * 10n / 100n; // 10% of balance
        } else {
            depositAmount = ethers.parseUnits("10", 6); // Minimum 10 USDC
        }
        
        const depositFormatted = ethers.formatUnits(depositAmount, 6);
        console.log('💸 Amount to deposit:', depositFormatted, 'USDC');
        
        // 4. Check allowance
        const allowance = await usdcContract.allowance(relayerWallet.address, process.env.PAYMASTER_ADDRESS);
        if (allowance < depositAmount) {
            console.log('⏳ Approving USDC spending...');
            const approveTx = await usdcContract.approve(process.env.PAYMASTER_ADDRESS, depositAmount);
            console.log('📝 Approve TX:', approveTx.hash);
            await approveTx.wait();
            console.log('✅ USDC approved for paymaster');
        }
        
        // 5. Deposit to paymaster
        console.log('⏳ Depositing USDC to paymaster...');
        const depositTx = await paymasterContract.deposit_usdc(depositAmount);
        console.log('📝 Deposit TX:', depositTx.hash);
        
        console.log('⏳ Waiting for confirmation...');
        const receipt = await depositTx.wait();
        console.log('✅ Deposit confirmed! Block:', receipt.blockNumber);
        
        // 6. Verify new balance
        const newBalance = await paymasterContract.get_contract_balance();
        const newFormatted = ethers.formatUnits(newBalance, 6);
        console.log('💰 New Paymaster Balance:', newFormatted, 'USDC');
        
        console.log('🎉 Paymaster funded successfully!');
        
    } catch (error) {
        console.error('❌ Funding failed:', error);
        
        if (error.reason) {
            console.error('Error reason:', error.reason);
        }
        
        if (error.info?.error) {
            console.error('RPC error:', error.info.error);
        }
    }
}

// Run if called directly
if (require.main === module) {
    fundPaymaster().catch(console.error);
}

module.exports = fundPaymaster;
