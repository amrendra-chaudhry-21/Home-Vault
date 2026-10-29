import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { logger } from '../utils/logger';
import { IUser } from '../models/User';

let isFirebaseInitialized = false;

// Check if credentials exist in environment
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    let serviceAccount: any;
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (parseErr: any) {
      // If it's a file path
      try {
        serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT);
      } catch (requireErr: any) {
        logger.warn(`Could not parse or load service account key: ${requireErr.message}`);
      }
    }

    initializeApp({
      credential: cert(serviceAccount),
    });
    isFirebaseInitialized = true;
    logger.info('Firebase Admin SDK initialized successfully for free FCM push notifications.');
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp({
      credential: applicationDefault(),
    });
    isFirebaseInitialized = true;
    logger.info('Firebase Admin SDK initialized via GOOGLE_APPLICATION_CREDENTIALS.');
  } else {
    logger.info('Firebase Cloud Messaging is running in Free Sandbox Mode. (Set FIREBASE_SERVICE_ACCOUNT in .env to connect your free Firebase project).');
  }
} catch (error: any) {
  logger.warn(`Firebase initialization warning: ${error.message}. Running in Free Sandbox Mode.`);
}

export class FCMNotificationService {
  /**
   * Send FCM Push Notification to device tokens
   */
  static async sendPushNotification(
    tokens: string[],
    title: string,
    body: string,
    dataPayload?: Record<string, string>
  ): Promise<{ successCount: number; failureCount: number }> {
    if (!tokens || tokens.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    if (isFirebaseInitialized) {
      try {
        const message = {
          notification: {
            title,
            body,
          },
          data: dataPayload || {},
          tokens,
        };

        const response = await getMessaging().sendEachForMulticast(message);
        logger.info(`FCM Sent: ${response.successCount} succeeded, ${response.failureCount} failed.`);
        return {
          successCount: response.successCount,
          failureCount: response.failureCount,
        };
      } catch (error: any) {
        logger.error(`FCM sending error: ${error.message}`);
        return { successCount: 0, failureCount: tokens.length };
      }
    } else {
      // Free Sandbox Mode logging
      logger.info(`[FREE FCM SANDBOX] Push Notification to [${tokens.length} devices]:
  Title: "${title}"
  Body: "${body}"
  Payload: ${JSON.stringify(dataPayload || {})}`);
      return { successCount: tokens.length, failureCount: 0 };
    }
  }

  /**
   * Send warranty expiry notification
   */
  static async sendWarrantyAlert(
    user: IUser,
    applianceName: string,
    daysLeft: number,
    applianceId: string
  ) {
    if (!user.notificationPreferences?.push || !user.notificationPreferences?.warrantyAlerts) {
      return;
    }

    const tokens = user.fcmTokens || [];
    if (tokens.length === 0) return;

    const title = daysLeft > 0
      ? `⏳ Warranty Expiring: ${applianceName}`
      : `⚠️ Warranty Expired: ${applianceName}`;

    const body = daysLeft > 0
      ? `Warranty for your ${applianceName} expires in ${daysLeft} days. Check invoices or schedule maintenance now.`
      : `Warranty for your ${applianceName} has expired. Review digital service history in HomeVault.`;

    await this.sendPushNotification(tokens, title, body, {
      type: 'WARRANTY_EXPIRY',
      applianceId,
      daysLeft: String(daysLeft),
    });
  }

  /**
   * Send maintenance service due notification
   */
  static async sendServiceDueAlert(
    user: IUser,
    applianceName: string,
    titleText: string,
    reminderId: string
  ) {
    if (!user.notificationPreferences?.push || !user.notificationPreferences?.serviceReminders) {
      return;
    }

    const tokens = user.fcmTokens || [];
    if (tokens.length === 0) return;

    const title = `🛠️ Maintenance Due: ${applianceName}`;
    const body = `Scheduled service "${titleText}" is due today. Open HomeVault to log repair or update reminder.`;

    await this.sendPushNotification(tokens, title, body, {
      type: 'SERVICE_DUE',
      reminderId,
    });
  }
}
