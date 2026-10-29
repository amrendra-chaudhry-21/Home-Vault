import crypto from 'crypto';
import QRCode from 'qrcode';
import { Types } from 'mongoose';
import { QRToken } from '../models/QRToken';
import { Appliance } from '../models/Appliance';
import { HouseholdMember } from '../models/HouseholdMember';
import { HOUSEHOLD_ROLES } from '../config/constants';
import { AppError } from '../utils/appError';

export class QRService {
  /**
   * Generates a cryptographically secure QR code for an appliance.
   * Invalidates any previously active QR token for this appliance.
   */
  static async generateApplianceQR(applianceId: string, userId: string) {
    const appliance = await Appliance.findOne({
      _id: applianceId,
      archivedAt: null,
    });

    if (!appliance) {
      throw AppError.notFound('Appliance not found');
    }

    // Revoke previous tokens
    await QRToken.updateMany(
      { applianceId: appliance._id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );

    // Generate 32 bytes cryptographically secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const qrTokenDoc = await QRToken.create({
      applianceId: appliance._id,
      householdId: appliance.householdId,
      tokenHash,
      createdBy: new Types.ObjectId(userId),
    });

    appliance.qrTokenId = qrTokenDoc._id;
    await appliance.save();

    // Direct 64-char token payload for crisp QR and 100% universal camera scan compatibility
    const qrPayload = rawToken;

    // Render as high-res Data URL PNG
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 400,
      color: {
        dark: '#0A0A0A',
        light: '#FFFFFF',
      },
    });

    return {
      token: rawToken,
      qrDataUrl,
      applianceId: appliance._id.toString(),
      applianceName: appliance.name,
      brand: appliance.brand,
    };
  }

  /**
   * Resolves a QR token securely.
   * Accepts raw 64-char token, JSON payload, or deep link.
   * If the user scans a valid appliance QR pass, grants authorized access so they can view the digital passport and analytics.
   */
  static async resolveQRToken(inputToken: string, userId: string) {
    let rawToken = inputToken.trim();

    // 1. JSON payload with token key
    const jsonMatch = rawToken.match(/"token"\s*:\s*"([a-fA-F0-9]{32,64})"/);
    if (jsonMatch && jsonMatch[1]) {
      rawToken = jsonMatch[1].trim();
    } else {
      try {
        if (rawToken.includes('{') && rawToken.includes('}')) {
          const slice = rawToken.slice(rawToken.indexOf('{'), rawToken.lastIndexOf('}') + 1);
          const parsed = JSON.parse(slice);
          if (parsed && parsed.token && typeof parsed.token === 'string') {
            rawToken = parsed.token.trim();
          }
        }
      } catch (_) {}
    }

    // 2. URL / deep-link
    const urlMatch = rawToken.match(/\/qr\/([a-fA-F0-9]{32,64})/i) || rawToken.match(/[?&]token=([a-fA-F0-9]{32,64})/i);
    if (urlMatch && urlMatch[1]) {
      rawToken = urlMatch[1];
    }

    // 3. Extract 64-char or 32-char hex token
    const hex64 = rawToken.match(/([a-fA-F0-9]{64})/);
    if (hex64 && hex64[1]) {
      rawToken = hex64[1];
    } else {
      const hex32 = rawToken.match(/([a-fA-F0-9]{32})/);
      if (hex32 && hex32[1]) {
        rawToken = hex32[1];
      }
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const tokenDoc = await QRToken.findOne({
      tokenHash,
      revokedAt: null,
    });

    if (!tokenDoc) {
      throw AppError.notFound('QR code pass is invalid, revoked, or expired');
    }

    // Authorization: Verify user is a member of the household
    let membership = await HouseholdMember.findOne({
      householdId: tokenDoc.householdId,
      userId: new Types.ObjectId(userId),
    });

    if (!membership) {
      // Auto-authorize user as household member via physical QR pass possession
      membership = await HouseholdMember.create({
        householdId: tokenDoc.householdId,
        userId: new Types.ObjectId(userId),
        role: HOUSEHOLD_ROLES.MEMBER,
        status: 'active',
      });
    } else if (membership.status !== 'active') {
      membership.status = 'active';
      await membership.save();
    }

    const appliance = await Appliance.findOne({
      _id: tokenDoc.applianceId,
      archivedAt: null,
    });

    if (!appliance) {
      throw AppError.notFound('Appliance record is no longer available');
    }

    return {
      applianceId: appliance._id.toString(),
      householdId: appliance.householdId.toString(),
      name: appliance.name,
      brand: appliance.brand,
      category: appliance.category,
      modelNumber: appliance.modelNumber,
    };
  }
}
