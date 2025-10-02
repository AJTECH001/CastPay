const axios = require('axios');
const cacheService = require('./cacheService');

class UserService {
  constructor() {
    // Fallback known users for testing purposes
    // this.knownUsers = {
    //   'dwr.eth': {
    //     address: '0xD7029BDEa1c17493893AAfE29AAD69EF892B8ff2',
    //     source: 'fallback',
    //     username: 'dwr.eth',
    //     displayName: 'Dan Romero',
    //     fid: 3
    //   },
    //   'vitalik.eth': {
    //     address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
    //     source: 'fallback', 
    //     username: 'vitalik.eth',
    //     displayName: 'Vitalik Buterin',
    //     fid: 5650
    //   },
    //   'mg': {
    //     address: '0x2b0d29ffa81fa6bf35d31db7c3bc11a5913b45ef',
    //     source: 'fallback',
    //     username: 'mg',
    //     displayName: 'Matt Galligan',
    //     fid: 13
    //   }
    // };
  }

  async resolveUsername(username) {
    const cleanUsername = username.replace('@', '').toLowerCase();

    const cached = await cacheService.getUsername(cleanUsername);
    if (cached) return cached;

    // First try the API if available
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
        console.log('Neynar API error, trying fallback:', error.message);
      }
    }

    // Try known users fallback
    // if (this.knownUsers[cleanUsername]) {
    //   const userData = this.knownUsers[cleanUsername];
    //   await cacheService.setUsername(cleanUsername, userData);
    //   return userData;
    // }

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