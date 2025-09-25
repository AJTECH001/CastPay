const userService = require('../services/userService');

class UserController {
  async resolveUsername(req, res) {
    try {
      const { username } = req.params;
      const resolution = await userService.resolveUsername(username);
      res.json(resolution);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }

  async getUserNonce(req, res) {
    try {
      const { address } = req.params;
      const nonce = await userService.getUserNonce(address);
      res.json(nonce);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new UserController();