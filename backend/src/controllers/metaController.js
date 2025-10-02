class MetaController {
  async getRelayer(req, res) {
    const relayer = process.env.RELAYER_PUBLIC_ADDRESS;
    if (!relayer) return res.status(500).json({ error: "RELAYER_PUBLIC_ADDRESS not set" });
    return res.json({ relayer });
  }
}

module.exports = new MetaController();