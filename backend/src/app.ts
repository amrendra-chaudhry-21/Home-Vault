import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { env } from './config/env';
import { apiLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { getDbStatus } from './config/database';
import v1Routes from './routes/v1';
import { AppError } from './utils/appError';

export const createApp = () => {
  const app = express();

  // Security Middleware
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGINS === '*' ? true : env.CORS_ORIGINS.split(','),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static files for local uploads (if needed)
  const uploadsPath = path.resolve(process.cwd(), env.LOCAL_UPLOAD_DIR);
  app.use('/uploads', express.static(uploadsPath));

  // Global Rate Limiting
  app.use('/api', apiLimiter);

  // Health Check Endpoint
  app.get('/health', (_req: Request, res: Response) => {
    const dbStatus = getDbStatus();
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'HomeVault API',
      version: '1.0.0',
      database: dbStatus,
    });
  });

  // Mount API v1 Master Router
  app.use('/api/v1', v1Routes);

  // 404 Handler
  app.use((req: Request, _res: Response, next) => {
    next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};
