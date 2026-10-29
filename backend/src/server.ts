import http from 'http';
import { createApp } from './app';
import { connectDatabase } from './config/database';
import { SeedService } from './services/seedService';
import { env } from './config/env';
import { logger } from './utils/logger';

const startServer = async () => {
  try {
    // 1. Connect to Database
    await connectDatabase();

    // 2. Ensure initial demo data with appliances and QR tokens is seeded
    await SeedService.seedDemoDataIfEmpty();

    // 2. Initialize Express App
    const app = createApp();
    const server = http.createServer(app);

    // 3. Start Listening
    server.listen(env.PORT, () => {
      logger.info(`🚀 HomeVault Backend running on port ${env.PORT} in [${env.NODE_ENV}] mode`);
      logger.info(`🌐 Health check available at: http://localhost:${env.PORT}/health`);
      logger.info(`📡 API v1 root available at: http://localhost:${env.PORT}/api/v1`);
    });

    // 4. Graceful Shutdown Handlers
    const handleShutdown = (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });

      // Force shutdown after 10s timeout
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (error: any) {
    logger.error('Fatal bootstrap error:', error);
    process.exit(1);
  }
};

startServer();
