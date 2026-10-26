import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoMemoryServer = null;

export const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      let attempts = 0;
      while (!mongoMemoryServer && attempts < 5) {
        try {
          attempts++;
          mongoMemoryServer = await MongoMemoryServer.create();
        } catch (memErr) {
          if (attempts >= 5) throw memErr;
          console.warn(`MongoMemoryServer attempt ${attempts} hit excluded port, retrying...`);
        }
      }
      mongoUri = mongoMemoryServer.getUri();
      process.env.MONGODB_URI = mongoUri;
      console.log(`✅ Embedded MongoDB initialized at: ${mongoUri}`);
    } else {
      console.log(`Connecting to configured MongoDB at: ${mongoUri.replace(/:([^:@]{4})[^:@]*@/, ':****@')}`);
    }

    const conn = await mongoose.connect(mongoUri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    throw error;
  }
};

export const closeDB = async () => {
  try {
    await mongoose.connection.close();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
    }
  } catch (error) {
    console.error(`Error closing MongoDB: ${error.message}`);
  }
};
