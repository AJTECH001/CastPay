class UserCache {
  constructor(data) {
    this.username = data.username;
    this.address = data.address;
    this.displayName = data.displayName;
    this.fid = data.fid;
    this.source = data.source;
    this.cachedAt = data.cachedAt || new Date();
  }

  isExpired(ttl = 5 * 60 * 1000) {
    return Date.now() - this.cachedAt.getTime() > ttl;
  }

  toJSON() {
    return {
      username: this.username,
      address: this.address,
      displayName: this.displayName,
      fid: this.fid,
      source: this.source,
      cachedAt: this.cachedAt
    };
  }
}

module.exports = UserCache;