import { Request, Response, NextFunction } from 'express';
import { ReminderService } from '../services/reminderService';
import { ApiResponse } from '../utils/response';
import { AppError } from '../utils/appError';

export class ReminderController {
  static async getHouseholdReminders(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const reminders = await ReminderService.getHouseholdReminders(
        req.params.householdId,
        status
      );
      return ApiResponse.success(res, reminders);
    } catch (error) {
      return next(error);
    }
  }

  static async createReminder(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw AppError.unauthorized();
      const reminder = await ReminderService.createReminder(
        req.params.applianceId,
        req.user._id.toString(),
        req.body
      );
      return ApiResponse.created(res, reminder, 'Reminder created successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async updateReminderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const updated = await ReminderService.updateReminderStatus(
        req.params.reminderId,
        status
      );
      return ApiResponse.success(res, updated, 'Reminder updated');
    } catch (error) {
      return next(error);
    }
  }

  static async deleteReminder(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ReminderService.deleteReminder(req.params.reminderId);
      return ApiResponse.success(res, result);
    } catch (error) {
      return next(error);
    }
  }

  static async dispatchAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ReminderService.checkAndDispatchDueAlerts();
      return ApiResponse.success(res, result, 'FCM alerts checked and dispatched successfully');
    } catch (error) {
      return next(error);
    }
  }
}
