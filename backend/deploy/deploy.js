require('dotenv').config();
const CastPayRelayer = require('../src/app');

console.log('🚀 Deploying CastPay Relayer...');

// Validate environment
const requiredEnvVars = ['ARBITRUM_RPC_URL', 'RELAYER_PRIVATE_KEY'];
const missing = requiredEnvVars.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('❌ Missing environment variables:', missing);
  process.exit(1);
}

const relayer = new CastPayRelayer();
const port = process.env.PORT || 3001;

relayer.start(port);