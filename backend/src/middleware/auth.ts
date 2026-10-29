import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models/User';
import { AppError } from '../utils/appError';

interface JwtPayload {
  userId: string;
  email: string;
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    let token = '';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) {
      return next(AppError.unauthorized('Authorization header with Bearer token or token query required'));
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return next(AppError.unauthorized('Access token has expired', { expired: true }));
      }
      return next(AppError.unauthorized('Invalid access token'));
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(AppError.unauthorized('User not found or no longer active'));
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};
