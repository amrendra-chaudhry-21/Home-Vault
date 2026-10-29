import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { ApiResponse } from '../utils/response';
import { AppError } from '../utils/appError';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const userAgent = req.headers['user-agent'] || '';
      const ipAddress = req.ip || '';
      const result = await AuthService.register(req.body, userAgent, ipAddress);
      return ApiResponse.created(res, result, 'User registered successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const userAgent = req.headers['user-agent'] || '';
      const ipAddress = req.ip || '';
      const result = await AuthService.login(req.body, userAgent, ipAddress);
      return ApiResponse.success(res, result, 'Login successful');
    } catch (error) {
      return next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const userAgent = req.headers['user-agent'] || '';
      const ipAddress = req.ip || '';
      const tokens = await AuthService.refreshTokens(refreshToken, userAgent, ipAddress);
      return ApiResponse.success(res, tokens, 'Tokens refreshed successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      await AuthService.logout(refreshToken);
      return ApiResponse.success(res, null, 'Logged out successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw AppError.unauthorized('User not found');
      }
      const user = {
        id: req.user._id.toString(),
        email: req.user.email,
        displayName: req.user.displayName,
        emailVerified: req.user.emailVerified,
        notificationPreferences: req.user.notificationPreferences,
        createdAt: req.user.createdAt,
      };
      return ApiResponse.success(res, user);
    } catch (error) {
      return next(error);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      // Return safe message without exposing whether email exists
      return ApiResponse.success(
        res,
        null,
        'If an account exists with this email, instructions have been sent.'
      );
    } catch (error) {
      return next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      return ApiResponse.success(res, null, 'Password reset successfully');
    } catch (error) {
      return next(error);
    }
  }
}
