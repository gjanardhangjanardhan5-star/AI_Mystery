const mongoose = require('mongoose');
const { mongoUri } = require('./config');

async function connectDatabase() {
  if (!mongoUri) {
    return false;
  }

  await mongoose.connect(mongoUri);
  return true;
}

module.exports = { connectDatabase };
