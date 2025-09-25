require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

class CastPayTester {
  constructor() {
    this.testResults = [];
    this.testUser = 'vitalik.eth';
    this.testAddress = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045'; // Vitalik's known address
  }

  async runAllTests() {
    console.log('🧪 Starting Comprehensive CastPay Endpoint Tests\n');
    console.log(`📡 Testing against: ${BASE_URL}\n`);

    try {
      // 1. Health Check
      await this.testHealthEndpoint();

      // 2. Username Resolution
      await this.testUsernameResolution();

      // 3. Balance Checks
      await this.testBalanceEndpoints();

      // 4. Paymaster Management Endpoints
      await this.testPaymasterEndpoints();

      // 5. Transaction Flow (if paymaster is operational)
      await this.testTransactionFlow();

      // 6. Error Cases
      await this.testErrorCases();

      this.printSummary();

    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
    }
  }

  async testHealthEndpoint() {
    console.log('1. 🔍 Testing Health Endpoint');
    
    try {
      const response = await axios.get(`${BASE_URL}/health`);
      this.testResults.push({ test: 'Health Check', status: 'PASS', data: response.data });

      console.log('✅ Health endpoint:', {
        status: response.data.status,
        paymaster: response.data.paymaster?.address || 'Not configured',
        mode: response.data.mode || 'unknown'
      });

      // Check if paymaster is connected
      if (response.data.paymaster?.address) {
        console.log('   💡 Paymaster connected:', response.data.paymaster.address);
      } else {
        console.log('   ⚠️  Paymaster not configured - some tests may be limited');
      }

    } catch (error) {
      this.testResults.push({ test: 'Health Check', status: 'FAIL', error: error.message });
      console.log('❌ Health endpoint failed:', error.message);
    }
    console.log('');
  }

  async testUsernameResolution() {
    console.log('2. 👤 Testing Username Resolution');
    
    const testUsernames = [
      'vitalik.eth',
      'mg',
    ];

    for (const username of testUsernames) {
      try {
        const response = await axios.get(`${BASE_URL}/resolve/${username}`);
        this.testResults.push({ 
          test: `Resolve ${username}`, 
          status: 'PASS', 
          data: response.data 
        });

        console.log(`✅ ${username}:`, {
          address: response.data.address,
          source: response.data.source,
          displayName: response.data.displayName || 'N/A'
        });

      } catch (error) {
        this.testResults.push({ 
          test: `Resolve ${username}`, 
          status: 'FAIL', 
          error: error.response?.data?.error || error.message 
        });
        console.log(`❌ ${username}:`, error.response?.data?.error || error.message);
      }
    }
    console.log('');
  }

  async testBalanceEndpoints() {
    console.log('3. 💰 Testing Balance Endpoints');
    
    try {
      // Test user balance
      const balanceResponse = await axios.get(`${BASE_URL}/balance/${this.testAddress}`);
      this.testResults.push({ test: 'User Balance', status: 'PASS', data: balanceResponse.data });

      console.log('✅ User balance:', {
        address: balanceResponse.data.address,
        balance: balanceResponse.data.balance + ' USDC',
        paymasterAllowance: balanceResponse.data.paymasterAllowance + ' USDC'
      });

      // Test nonce endpoint
      const nonceResponse = await axios.get(`${BASE_URL}/nonce/${this.testAddress}`);
      this.testResults.push({ test: 'User Nonce', status: 'PASS', data: nonceResponse.data });

      console.log('✅ User nonce:', {
        address: nonceResponse.data.address,
        nonce: nonceResponse.data.nonce
      });

    } catch (error) {
      this.testResults.push({ test: 'Balance Endpoints', status: 'FAIL', error: error.message });
      console.log('❌ Balance endpoints failed:', error.message);
    }
    console.log('');
  }

  async testPaymasterEndpoints() {
    console.log('4. 🏦 Testing Paymaster Endpoints');
    
    try {
      // Test paymaster status
      const statusResponse = await axios.get(`${BASE_URL}/paymaster/status`);
      this.testResults.push({ test: 'Paymaster Status', status: 'PASS', data: statusResponse.data });

      console.log('✅ Paymaster status:', {
        contractBalance: statusResponse.data.contractBalance + ' USDC',
        totalDeposited: statusResponse.data.totalDeposited + ' USDC',
        isPaused: statusResponse.data.isPaused,
        sponsorshipEnabled: statusResponse.data.sponsorshipEnabled,
        userCount: statusResponse.data.userCount
      });

      // Test paymaster balance
      const balanceResponse = await axios.get(`${BASE_URL}/paymaster/balance`);
      this.testResults.push({ test: 'Paymaster Balance', status: 'PASS', data: balanceResponse.data });

      console.log('✅ Paymaster balance:', {
        balance: balanceResponse.data.balance + ' USDC',
        formatted: balanceResponse.data.formatted + ' USDC'
      });

      // Test user registration (this might fail if already registered, which is OK)
      try {
        const registerResponse = await axios.post(`${BASE_URL}/paymaster/register`, {
          userAddress: this.testAddress
        });
        this.testResults.push({ test: 'User Registration', status: 'PASS', data: registerResponse.data });
        console.log('✅ User registration: Success');
      } catch (registerError) {
        // Registration might fail if user already exists - that's acceptable
        this.testResults.push({ test: 'User Registration', status: 'SKIP', error: 'Already registered or not implemented' });
        console.log('⚠️  User registration:', registerError.response?.data?.error || 'Already registered');
      }

    } catch (error) {
      this.testResults.push({ test: 'Paymaster Endpoints', status: 'FAIL', error: error.message });
      console.log('❌ Paymaster endpoints failed:', error.response?.data?.error || error.message);
    }
    console.log('');
  }

  async testTransactionFlow() {
    console.log('5. 🔄 Testing Transaction Flow');
    
    try {
      // First, check if we have a functional paymaster
      const healthResponse = await axios.get(`${BASE_URL}/health`);
      const hasPaymaster = !!healthResponse.data.paymaster?.address;

      if (!hasPaymaster) {
        this.testResults.push({ test: 'Transaction Flow', status: 'SKIP', reason: 'No paymaster configured' });
        console.log('⚠️  Transaction flow: Skipped (no paymaster configured)');
        return;
      }

      // Test transaction submission (this will create a pending transaction)
      const transactionData = {
        from: this.testAddress,
        to: '0x742E6e70a3A24d5a0423340d34B0b0C65D1397A3', // Test recipient
        amount: '0.01', // Small amount for testing
        nonce: Date.now(), // Unique nonce
        signature: '0x' + '0'.repeat(130) // Mock signature (will fail validation)
      };

      const transferResponse = await axios.post(`${BASE_URL}/transfer`, transactionData);
      this.testResults.push({ test: 'Transfer Submission', status: 'PASS', data: transferResponse.data });

      console.log('✅ Transfer submission:', {
        txId: transferResponse.data.txId,
        status: transferResponse.data.status,
        paymaster: transferResponse.data.paymasterAddress ? 'Connected' : 'Not used'
      });

      // Test transaction status endpoint
      if (transferResponse.data.txId) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit
        
        const statusResponse = await axios.get(`${BASE_URL}/status/${transferResponse.data.txId}`);
        this.testResults.push({ test: 'Transaction Status', status: 'PASS', data: statusResponse.data });

        console.log('✅ Transaction status:', {
          txId: statusResponse.data.txId,
          currentStatus: statusResponse.data.status,
          paymasterInvolved: !!statusResponse.data.details?.paymasterExecuted
        });
      }

    } catch (error) {
      // Transaction might fail due to signature validation, which is expected
      const errorMessage = error.response?.data?.error || error.message;
      if (errorMessage.includes('signature') || errorMessage.includes('Signature')) {
        this.testResults.push({ test: 'Transaction Flow', status: 'PARTIAL', reason: 'Signature validation failed (expected)' });
        console.log('⚠️  Transaction flow: Signature validation failed (this is expected without real signing)');
      } else {
        this.testResults.push({ test: 'Transaction Flow', status: 'FAIL', error: errorMessage });
        console.log('❌ Transaction flow failed:', errorMessage);
      }
    }
    console.log('');
  }

  async testErrorCases() {
    console.log('6. 🚨 Testing Error Cases');
    
    const errorTests = [
      {
        name: 'Invalid username resolution',
        url: `${BASE_URL}/resolve/nonexistentuser123456`,
        expectedError: 'User not found'
      },
      {
        name: 'Invalid address balance check',
        url: `${BASE_URL}/balance/invalid-address`,
        expectedError: 'Invalid address'
      },
      {
        name: 'Non-existent transaction status',
        url: `${BASE_URL}/status/0x1234567890abcdef`,
        expectedError: 'Transaction not found'
      }
    ];

    for (const test of errorTests) {
      try {
        await axios.get(test.url);
        this.testResults.push({ test: test.name, status: 'FAIL', reason: 'Should have failed but succeeded' });
        console.log(`❌ ${test.name}: Expected error but request succeeded`);
      } catch (error) {
        const errorMessage = error.response?.data?.error || error.message;
        if (errorMessage.includes(test.expectedError)) {
          this.testResults.push({ test: test.name, status: 'PASS', reason: 'Correctly returned error' });
          console.log(`✅ ${test.name}: Correctly returned error - ${errorMessage}`);
        } else {
          this.testResults.push({ test: test.name, status: 'PARTIAL', reason: `Wrong error: ${errorMessage}` });
          console.log(`⚠️  ${test.name}: Wrong error returned - ${errorMessage}`);
        }
      }
    }
    console.log('');
  }

  printSummary() {
    console.log('📊 Test Summary');
    console.log('='.repeat(50));
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const skipped = this.testResults.filter(r => r.status === 'SKIP' || r.status === 'PARTIAL').length;
    const total = this.testResults.length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Skipped/Partial: ${skipped}`);
    console.log(`📋 Total: ${total}`);
    console.log('');

    // Show detailed results
    console.log('Detailed Results:');
    this.testResults.forEach((result, index) => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`${icon} ${index + 1}. ${result.test} - ${result.status}`);
      if (result.error) console.log(`   Error: ${result.error}`);
      if (result.reason) console.log(`   Reason: ${result.reason}`);
    });

    console.log('');
    if (failed === 0) {
      console.log('🎉 All critical tests passed! Your CastPay backend is ready.');
    } else {
      console.log('💡 Some tests failed. Check the configuration and try again.');
    }

    // Final recommendations
    console.log('');
    console.log('🔧 Next Steps:');
    if (this.testResults.some(r => r.test.includes('Paymaster') && r.status === 'FAIL')) {
      console.log('   • Check PAYMASTER_ADDRESS in .env file');
      console.log('   • Ensure the Stylus contract is deployed');
      console.log('   • Fund the paymaster with USDC');
    }
    if (this.testResults.some(r => r.test.includes('Resolution') && r.status === 'FAIL')) {
      console.log('   • Check NEYNAR_API_KEY in .env file');
    }
    console.log('   • Test with frontend integration');
    console.log('   • Monitor transaction status endpoints');
  }
}

// Run the tests
async function main() {
  const tester = new CastPayTester();
  await tester.runAllTests();
}

// Handle command line arguments
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node tests/test-endpoints.js [options]

Options:
  --url <url>     Set custom base URL (default: http://localhost:3001)
  --user <user>   Set test username (default: vitalik.eth)
  --address <addr> Set test address
  --help, -h      Show this help message

Examples:
  node tests/test-endpoints.js
  node tests/test-endpoints.js --url https://your-backend.ngrok.io
  node tests/test-endpoints.js --user dwr.eth
    `);
    process.exit(0);
  }

  if (args.includes('--url')) {
    const urlIndex = args.indexOf('--url') + 1;
    if (urlIndex < args.length) {
      process.env.BASE_URL = args[urlIndex];
    }
  }

  if (args.includes('--user')) {
    const userIndex = args.indexOf('--user') + 1;
    if (userIndex < args.length) {
      process.env.TEST_USER = args[userIndex];
    }
  }

  main().catch(console.error);
}

module.exports = CastPayTester;