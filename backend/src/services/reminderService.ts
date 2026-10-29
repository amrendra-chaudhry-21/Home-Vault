import { Types } from 'mongoose';
import { Reminder } from '../models/Reminder';
import { Appliance } from '../models/Appliance';
import { REMINDER_STATUS, ReminderStatus, ReminderType } from '../config/constants';
import { AppError } from '../utils/appError';

export class ReminderService {
  static async getHouseholdReminders(
    householdId: string,
    status?: string
  ) {
    const filter: any = {
      householdId: new Types.ObjectId(householdId),
    };

    if (status) {
      filter.status = status;
    }

    const reminders = await Reminder.find(filter)
      .populate<{ applianceId: { _id: Types.ObjectId; name: string; brand: string; category: string } }>(
        'applianceId',
        'name brand category'
      )
      .sort({ dueAt: 1 });

    return reminders.map((r) => ({
      id: r._id.toString(),
      householdId: r.householdId.toString(),
      applianceId: r.applianceId?._id ? r.applianceId._id.toString() : null,
      applianceName: r.applianceId ? `${r.applianceId.brand} ${r.applianceId.name}` : 'Unknown Appliance',
      applianceCategory: r.applianceId?.category || '',
      type: r.type,
      title: r.title,
      notes: r.notes,
      dueAt: r.dueAt,
      status: r.status,
      completedAt: r.completedAt,
      dismissedAt: r.dismissedAt,
      createdAt: r.createdAt,
    }));
  }

  static async createReminder(
    applianceId: string,
    userId: string,
    data: {
      type: ReminderType;
      title: string;
      notes?: string;
      dueAt: string | Date;
    }
  ) {
    const appliance = await Appliance.findOne({
      _id: applianceId,
      archivedAt: null,
    });

    if (!appliance) {
      throw AppError.notFound('Appliance not found');
    }

    const reminder = await Reminder.create({
      householdId: appliance.householdId,
      applianceId: appliance._id,
      type: data.type,
      title: data.title,
      notes: data.notes || '',
      dueAt: new Date(data.dueAt),
      status: REMINDER_STATUS.PENDING,
      createdBy: new Types.ObjectId(userId),
    });

    return {
      id: reminder._id.toString(),
      householdId: reminder.householdId.toString(),
      applianceId: reminder.applianceId.toString(),
      type: reminder.type,
      title: reminder.title,
      notes: reminder.notes,
      dueAt: reminder.dueAt,
      status: reminder.status,
      createdAt: reminder.createdAt,
    };
  }

  static async updateReminderStatus(
    reminderId: string,
    status: ReminderStatus
  ) {
    const reminder = await Reminder.findById(reminderId);
    if (!reminder) {
      throw AppError.notFound('Reminder not found');
    }

    reminder.status = status;
    if (status === REMINDER_STATUS.COMPLETED) {
      reminder.completedAt = new Date();
      reminder.dismissedAt = null;
    } else if (status === REMINDER_STATUS.DISMISSED) {
      reminder.dismissedAt = new Date();
      reminder.completedAt = null;
    } else {
      reminder.completedAt = null;
      reminder.dismissedAt = null;
    }

    await reminder.save();

    return {
      id: reminder._id.toString(),
      status: reminder.status,
      completedAt: reminder.completedAt,
      dismissedAt: reminder.dismissedAt,
    };
  }

  static async deleteReminder(reminderId: string) {
    const result = await Reminder.findByIdAndDelete(reminderId);
    if (!result) {
      throw AppError.notFound('Reminder not found');
    }
    return { message: 'Reminder deleted successfully' };
  }

  static async checkAndDispatchDueAlerts() {
    const now = new Date();
    // 1. Service Maintenance Reminders Due
    const dueReminders = await Reminder.find({
      status: REMINDER_STATUS.PENDING,
      dueAt: { $lte: now },
    }).populate<{ applianceId: { _id: Types.ObjectId; name: string; brand: string } }>('applianceId');

    let remindersSent = 0;
    const { HouseholdMember } = await import('../models/HouseholdMember');
    const { User } = await import('../models/User');
    const { FCMNotificationService } = await import('./fcmNotificationService');

    for (const reminder of dueReminders) {
      const members = await HouseholdMember.find({ householdId: reminder.householdId, status: 'active' });
      const userIds = members.map((m) => m.userId);
      const users = await User.find({ _id: { $in: userIds } });

      const applianceName = reminder.applianceId
        ? `${reminder.applianceId.brand} ${reminder.applianceId.name}`
        : 'Appliance';

      for (const user of users) {
        await FCMNotificationService.sendServiceDueAlert(
          user,
          applianceName,
          reminder.title,
          reminder._id.toString()
        );
      }
      remindersSent++;
    }

    // 2. Warranty Expiry Alerts (30 days, 7 days, 1 day)
    const activeAppliances = await Appliance.find({
      archivedAt: null,
      warrantyEndDate: { $exists: true, $ne: null },
    });

    let warrantyAlertsSent = 0;
    for (const app of activeAppliances) {
      if (!app.warrantyEndDate) continue;
      const msLeft = new Date(app.warrantyEndDate).getTime() - now.getTime();
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

      // Alert triggers at 30 days, 7 days, 1 day, or 0 (today)
      if ([30, 7, 1, 0].includes(daysLeft)) {
        const members = await HouseholdMember.find({ householdId: app.householdId, status: 'active' });
        const userIds = members.map((m) => m.userId);
        const users = await User.find({ _id: { $in: userIds } });

        for (const user of users) {
          await FCMNotificationService.sendWarrantyAlert(
            user,
            `${app.brand} ${app.name}`,
            daysLeft,
            app._id.toString()
          );
        }
        warrantyAlertsSent++;
      }
    }

    return {
      remindersSent,
      warrantyAlertsSent,
      timestamp: new Date().toISOString(),
    };
  }
}
