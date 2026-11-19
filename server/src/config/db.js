import mongoose from 'mongoose';
import messages from '../constants/messages.js';

async function connectDB() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error(messages.error.MISSING_MONGO_URI);
  }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log(messages.log.DATABASE_CONNECTED);
}

export default connectDB;
