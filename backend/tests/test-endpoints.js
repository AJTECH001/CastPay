const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001'; // Or ngrok URL


async function testEndpoints() {
  console.log('🧪 Testing CastPay Endpoints...\n');

  try {
     // 1. Health check
    console.log('1. Testing health endpoint...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health:', health.data);

    // 2. Username resolution
    console.log('\n2. Testing username resolution...');
    const resolution = await axios.get(`${BASE_URL}/resolve/vitalik.eth`);
    console.log('✅ Username resolution:', resolution.data);

    // 3. Balance check
    console.log('\n3. Testing balance check...');
    const testAddress = resolution.data.address;
    const balance = await axios.get(`${BASE_URL}/balance/${testAddress}`);
    console.log('✅ Balance check:', balance.data);

    console.log('\n🎉 All tests passed! Backend is ready.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    // More detailed error info
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testEndpoints();