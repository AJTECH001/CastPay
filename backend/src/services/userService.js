const axios = require('axios');
const cacheService = require('./cacheService');

class UserService {
  async resolveUsername(username) {
    const cleanUsername = username.replace('@', '').toLowerCase();

    const cached = await cacheService.getUsername(cleanUsername);
    if (cached) return cached;

    if (process.env.NEYNAR_API_KEY) {
      try {
        const response = await axios.get(
          `https://api.neynar.com/v2/farcaster/user/by_username?username=${cleanUsername}`,
          {
            headers: { 'api_key': process.env.NEYNAR_API_KEY },
            timeout: 10000
          }
        );

        const address = response.data?.user?.verified_addresses?.eth_addresses?.[0];
        if (address) {
          const userData = {
            address,
            source: 'neynar',
            username: cleanUsername,
            displayName: response.data?.user?.display_name,
            fid: response.data?.user?.fid
          };

          await cacheService.setUsername(cleanUsername, userData);
          return userData;
        }
      } catch (error) {
        console.error('Neynar API error:', error.message);
      }
    }

    throw new Error('User not found or no verified address');
  }

  async getUserNonce(address) {
    // In a mainnet implementation, this would check the contract or database
    // For now, using simple in-memory storage
    const nonce = await cacheService.getUserNonce(address);
    return { address, nonce: nonce.toString(), source: 'cache' };
  }

  async incrementUserNonce(address) {
    const currentNonce = await cacheService.getUserNonce(address);
    await cacheService.setUserNonce(address, currentNonce + 1);
  }
}

module.exports = new UserService();