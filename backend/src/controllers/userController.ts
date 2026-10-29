import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/response';
import { AppError } from '../utils/appError';
import { Household } from '../models/Household';
import { Appliance } from '../models/Appliance';
import { ServiceRecord } from '../models/ServiceRecord';
import { Reminder } from '../models/Reminder';
import { RefreshToken } from '../models/RefreshToken';

export class UserController {
  static async exportUserData(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw AppError.unauthorized();
      const userId = req.user._id;

      const households = await Household.find({ ownerUserId: userId });
      const householdIds = households.map((h) => h._id);

      const appliances = await Appliance.find({ householdId: { $in: householdIds } });
      const applianceIds = appliances.map((a) => a._id);

      const [services, reminders] = await Promise.all([
        ServiceRecord.find({ applianceId: { $in: applianceIds } }),
        Reminder.find({ householdId: { $in: householdIds } }),
      ]);

      const exportBundle = {
        exportedAt: new Date().toISOString(),
        profile: {
          id: req.user._id,
          email: req.user.email,
          displayName: req.user.displayName,
          createdAt: req.user.createdAt,
        },
        households,
        appliances,
        services,
        reminders,
      };

      return ApiResponse.success(res, exportBundle, 'Personal data export generated');
    } catch (error) {
      return next(error);
    }
  }

  static async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw AppError.unauthorized();
      const userId = req.user._id;

      // Revoke all refresh tokens
      await RefreshToken.updateMany({ userId }, { $set: { revokedAt: new Date() } });

      // Archive user's households
      await Household.updateMany({ ownerUserId: userId }, { $set: { archivedAt: new Date() } });

      // Anonymize user record
      req.user.displayName = 'Deleted User';
      req.user.email = `deleted_${Date.now()}_${req.user.email}`;
      req.user.passwordHash = 'DELETED';
      await req.user.save();

      return ApiResponse.success(res, null, 'Account deleted and personal data cleared');
    } catch (error) {
      return next(error);
    }
  }

  static async registerFCMToken(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw AppError.unauthorized();
      const { token } = req.body;
      if (!token || typeof token !== 'string') {
        throw AppError.badRequest('Valid FCM device token is required');
      }

      // Add token if not already in list
      if (!req.user.fcmTokens) {
        req.user.fcmTokens = [];
      }
      if (!req.user.fcmTokens.includes(token)) {
        req.user.fcmTokens.push(token);
        await req.user.save();
      }

      return ApiResponse.success(res, { registered: true }, 'FCM token registered successfully for push notifications');
    } catch (error) {
      return next(error);
    }
  }
}
