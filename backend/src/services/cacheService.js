class CacheService {
  constructor() {
    this.usernameCache = new Map();
    this.userNonces = new Map();
    this.cacheTtl = 5 * 60 * 1000; // 5 minutes
  }

  async getUsername(username) {
    const cached = this.usernameCache.get(username);
    if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
      return cached.data;
    }
    return null;
  }

  async setUsername(username, data) {
    this.usernameCache.set(username, {
      data,
      timestamp: Date.now()
    });
  }

  async getUserNonce(address) {
    return this.userNonces.get(address.toLowerCase()) || 0;
  }

  async setUserNonce(address, nonce) {
    this.userNonces.set(address.toLowerCase(), nonce);
  }

  async incrementUserNonce(address) {
    const current = await this.getUserNonce(address);
    await this.setUserNonce(address, current + 1);
    return current + 1;
  }

  cleanupExpired() {
    const now = Date.now();
    for (const [key, value] of this.usernameCache.entries()) {
      if (now - value.timestamp > this.cacheTtl) {
        this.usernameCache.delete(key);
      }
    }
  }
}

const cacheService = new CacheService();
setInterval(() => cacheService.cleanupExpired(), 60 * 60 * 1000); // Cleanup every hour

module.exports = cacheService;