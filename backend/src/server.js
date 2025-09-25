require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 CastPay Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});