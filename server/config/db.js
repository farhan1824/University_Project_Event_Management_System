require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
  const connUri = process.env.MONGODB_URI;

  if (!connUri) {
    console.error('[MongoDB Error] MONGODB_URI is not defined in server/.env');
    process.exit(1);
  }

  try {
    const maskedUri = connUri.includes('@') ? connUri.replace(/:([^:@]+)@/, ':****@') : connUri;
    console.log(`[MongoDB] Connecting to Cloud Database: ${maskedUri}`);

    const conn = await mongoose.connect(connUri);

    console.log(`====================================================`);
    console.log(`🍃 MongoDB Atlas Connected!`);
    console.log(`🍃 Host: ${conn.connection.host}`);
    console.log(`🍃 Database: ${conn.connection.name}`);
    console.log(`====================================================`);
    return conn;
  } catch (error) {
    console.error(`====================================================`);
    console.error(`❌ MongoDB Atlas Connection Error: ${error.message}`);
    console.error(`====================================================`);
    throw error;
  }
};

module.exports = connectDB;
