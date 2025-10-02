const { ethers } = require('ethers');
const p = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
const code =  p.getCode(process.env.PAYMASTER_ADDRESS);
console.log('code size:', code.length);