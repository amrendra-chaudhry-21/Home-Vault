import mongoose from 'mongoose';
import { env } from './env';

export const connectDatabase = async (): Promise<boolean> => {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 20,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      driverInfo: {
        name: 'nodejs-mongoose',
        version: '9.11.2',
      },
    } as any);

    const maskedUri = env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    console.log(`📦 MongoDB connected successfully to: ${maskedUri}`);
    return true;
  } catch (error: any) {
    console.error('❌ MongoDB connection error:', error.message);
    return false;
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected. Attempting reconnection...');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB reconnected successfully.');
});

export const getDbStatus = (): {
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'ERROR';
  uri: string;
  databaseName: string;
} => {
  const state = mongoose.connection.readyState;
  let statusStr: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'ERROR' = 'DISCONNECTED';

  switch (state) {
    case 1:
      statusStr = 'CONNECTED';
      break;
    case 2:
      statusStr = 'CONNECTING';
      break;
    default:
      statusStr = 'DISCONNECTED';
  }

  return {
    status: statusStr,
    uri: env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
    databaseName: mongoose.connection.name || 'home_memory_db',
  };
};
