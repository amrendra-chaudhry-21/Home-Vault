import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, IUser } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { Household } from '../models/Household';
import { HouseholdMember } from '../models/HouseholdMember';
import { HOUSEHOLD_ROLES } from '../config/constants';
import { env } from '../config/env';
import { AppError } from '../utils/appError';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  defaultHouseholdId?: string;
  household?: {
    id: string;
    name: string;
    timezone: string;
    role: string;
    isOwner: boolean;
    createdAt: Date | string;
  } | null;
  user: {
    id: string;
    email: string;
    displayName: string;
    notificationPreferences: IUser['notificationPreferences'];
  };
}

export class AuthService {
  private static generateAccessToken(user: IUser): string {
    return jwt.sign(
      { userId: user._id.toString(), email: user.email },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
  }

  private static async createRefreshToken(
    userId: string,
    userAgent = '',
    ipAddress = ''
  ): Promise<string> {
    const rawToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await RefreshToken.create({
      userId,
      tokenHash,
      expiresAt,
      userAgent,
      ipAddress,
    });

    return rawToken;
  }

  static async register(
    data: { email: string; password: string; displayName: string },
    userAgent = '',
    ipAddress = ''
  ): Promise<AuthTokens & { defaultHouseholdId: string }> {
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      throw AppError.conflict('An account with this email address already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await User.create({
      email: data.email,
      passwordHash,
      displayName: data.displayName,
      emailVerified: false,
    });

    // Auto-create default household for the user
    const defaultHousehold = await Household.create({
      name: `${data.displayName}'s Home`,
      address: '',
      timezone: 'Asia/Kolkata',
      ownerUserId: user._id,
    });

    await HouseholdMember.create({
      householdId: defaultHousehold._id,
      userId: user._id,
      role: HOUSEHOLD_ROLES.OWNER,
      status: 'active',
    });

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.createRefreshToken(user._id.toString(), userAgent, ipAddress);

    return {
      accessToken,
      refreshToken,
      defaultHouseholdId: defaultHousehold._id.toString(),
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        notificationPreferences: user.notificationPreferences,
      },
    };
  }

  static async login(
    data: { email: string; password: string },
    userAgent = '',
    ipAddress = ''
  ): Promise<AuthTokens> {
    const user = await User.findOne({ email: data.email });
    if (!user) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.createRefreshToken(user._id.toString(), userAgent, ipAddress);

    // Fetch primary household in parallel to eliminate extra frontend roundtrip
    const membership = await HouseholdMember.findOne({ userId: user._id, status: 'active' })
      .populate<{ householdId: any }>('householdId')
      .lean();
    const h = membership?.householdId as any;

    return {
      accessToken,
      refreshToken,
      defaultHouseholdId: h?._id ? h._id.toString() : undefined,
      household: h ? {
        id: h._id.toString(),
        name: h.name,
        timezone: h.timezone || 'Asia/Kolkata',
        role: membership?.role || 'owner',
        isOwner: membership?.role === HOUSEHOLD_ROLES.OWNER,
        createdAt: h.createdAt,
      } : null,
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        notificationPreferences: user.notificationPreferences,
      },
    };
  }

  static async refreshTokens(
    rawRefreshToken: string,
    userAgent = '',
    ipAddress = ''
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    const tokenDoc = await RefreshToken.findOne({
      tokenHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!tokenDoc) {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }

    // Revoke old refresh token (rotation)
    tokenDoc.revokedAt = new Date();
    await tokenDoc.save();

    const user = await User.findById(tokenDoc.userId);
    if (!user) {
      throw AppError.unauthorized('User not found');
    }

    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = await this.createRefreshToken(
      user._id.toString(),
      userAgent,
      ipAddress
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  static async logout(rawRefreshToken: string): Promise<void> {
    if (!rawRefreshToken) return;
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    await RefreshToken.updateOne({ tokenHash }, { revokedAt: new Date() });
  }
}
