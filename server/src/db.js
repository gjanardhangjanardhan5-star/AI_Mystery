const mongoose = require('mongoose');
const { mongoUri } = require('./config');

async function connectDatabase() {
  if (!mongoUri) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MONGODB_URI must be configured in production.');
    }
    return false;
  }

  await mongoose.connect(mongoUri);
  return true;
}

module.exports = { connectDatabase };
