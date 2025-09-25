require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

class CastPayTester {
  constructor() {
    this.testResults = [];
    this.testUser = 'vitalik.eth';
    this.testAddress = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';
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

      // 5. Error Cases
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
        service: response.data.service,
        version: response.data.version
      });

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
      'dwr.eth'
    ];

    for (const username of testUsernames) {
      try {
        const response = await axios.get(`${BASE_URL}/api/users/resolve/${username}`);
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
      const balanceResponse = await axios.get(`${BASE_URL}/api/payments/balance/${this.testAddress}`);
      this.testResults.push({ test: 'User Balance', status: 'PASS', data: balanceResponse.data });

      console.log('✅ User balance:', {
        address: balanceResponse.data.address,
        balance: balanceResponse.data.balance + ' USDC',
        paymasterAllowance: balanceResponse.data.paymasterAllowance + ' USDC'
      });

      // Test nonce endpoint
      const nonceResponse = await axios.get(`${BASE_URL}/api/users/nonce/${this.testAddress}`);
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
      const statusResponse = await axios.get(`${BASE_URL}/api/paymaster/status`);
      this.testResults.push({ test: 'Paymaster Status', status: 'PASS', data: statusResponse.data });

      console.log('✅ Paymaster status:', {
        contractBalance: statusResponse.data.contractBalance + ' USDC',
        totalDeposited: statusResponse.data.totalDeposited + ' USDC',
        isPaused: statusResponse.data.isPaused,
        sponsorshipEnabled: statusResponse.data.sponsorshipEnabled,
        userCount: statusResponse.data.userCount
      });

      // Test paymaster balance
      const balanceResponse = await axios.get(`${BASE_URL}/api/paymaster/balance`);
      this.testResults.push({ test: 'Paymaster Balance', status: 'PASS', data: balanceResponse.data });

      console.log('✅ Paymaster balance:', {
        balance: balanceResponse.data.balance + ' USDC',
        formatted: balanceResponse.data.formatted + ' USDC'
      });

    } catch (error) {
      this.testResults.push({ test: 'Paymaster Endpoints', status: 'FAIL', error: error.message });
      console.log('❌ Paymaster endpoints failed:', error.response?.data?.error || error.message);
    }
    console.log('');
  }

  async testErrorCases() {
    console.log('5. 🚨 Testing Error Cases');
    
    const errorTests = [
      {
        name: 'Invalid username resolution',
        url: `${BASE_URL}/api/users/resolve/nonexistentuser123456`,
        expectedError: 'User not found'
      },
      {
        name: 'Invalid address balance check',
        url: `${BASE_URL}/api/payments/balance/invalid-address`,
        expectedError: 'Invalid Ethereum address'
      },
      {
        name: 'Non-existent API route',
        url: `${BASE_URL}/api/nonexistent`,
        expectedError: 'Route not found'
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

  main().catch(console.error);
}

module.exports = CastPayTester;