import { Types } from 'mongoose';
import { Household, IHousehold } from '../models/Household';
import { HouseholdMember } from '../models/HouseholdMember';
import { User } from '../models/User';
import { HOUSEHOLD_ROLES, HouseholdRole } from '../config/constants';
import { AppError } from '../utils/appError';

export class HouseholdService {
  static async createHousehold(
    userId: string,
    data: { name: string; address?: string; timezone?: string }
  ): Promise<IHousehold> {
    const household = await Household.create({
      name: data.name,
      address: data.address || '',
      timezone: data.timezone || 'Asia/Kolkata',
      ownerUserId: new Types.ObjectId(userId),
    });

    await HouseholdMember.create({
      householdId: household._id,
      userId: new Types.ObjectId(userId),
      role: HOUSEHOLD_ROLES.OWNER,
      status: 'active',
    });

    return household;
  }

  static async getUserHouseholds(userId: string) {
    const memberships = await HouseholdMember.find({
      userId: new Types.ObjectId(userId),
      status: 'active',
    }).populate<{ householdId: IHousehold }>('householdId');

    const households = memberships
      .filter((m) => m.householdId && !m.householdId.archivedAt)
      .map((m) => ({
        id: m.householdId._id.toString(),
        name: m.householdId.name,
        address: m.householdId.address,
        timezone: m.householdId.timezone,
        role: m.role,
        isOwner: m.role === HOUSEHOLD_ROLES.OWNER,
        createdAt: m.householdId.createdAt,
      }));

    return households;
  }

  static async getHouseholdById(householdId: string, userId: string) {
    const household = await Household.findOne({
      _id: householdId,
      archivedAt: null,
    });

    if (!household) {
      throw AppError.notFound('Household not found');
    }

    const membership = await HouseholdMember.findOne({
      householdId: household._id,
      userId: new Types.ObjectId(userId),
      status: 'active',
    });

    if (!membership && !household.ownerUserId.equals(new Types.ObjectId(userId))) {
      throw AppError.forbidden('You do not have access to this household');
    }

    const role = household.ownerUserId.equals(new Types.ObjectId(userId))
      ? HOUSEHOLD_ROLES.OWNER
      : membership?.role;

    return {
      id: household._id.toString(),
      name: household.name,
      address: household.address,
      timezone: household.timezone,
      role,
      isOwner: role === HOUSEHOLD_ROLES.OWNER,
      createdAt: household.createdAt,
    };
  }

  static async updateHousehold(
    householdId: string,
    data: { name?: string; address?: string; timezone?: string }
  ) {
    const household = await Household.findOneAndUpdate(
      { _id: householdId, archivedAt: null },
      { $set: data },
      { new: true }
    );

    if (!household) {
      throw AppError.notFound('Household not found');
    }

    return household;
  }

  static async archiveHousehold(householdId: string, userId: string) {
    const household = await Household.findOne({
      _id: householdId,
      archivedAt: null,
    });

    if (!household) {
      throw AppError.notFound('Household not found');
    }

    if (!household.ownerUserId.equals(new Types.ObjectId(userId))) {
      throw AppError.forbidden('Only the household owner can delete the household');
    }

    household.archivedAt = new Date();
    await household.save();

    return { message: 'Household archived successfully' };
  }

  static async getMembers(householdId: string) {
    const members = await HouseholdMember.find({
      householdId: new Types.ObjectId(householdId),
      status: 'active',
    }).populate<{ userId: { _id: Types.ObjectId; displayName: string; email: string } }>(
      'userId',
      'displayName email'
    );

    return members.map((m) => ({
      id: m._id.toString(),
      userId: m.userId?._id?.toString(),
      displayName: m.userId?.displayName || 'Unknown',
      email: m.userId?.email || '',
      role: m.role,
      status: m.status,
      joinedAt: m.createdAt,
    }));
  }

  static async inviteMember(
    householdId: string,
    email: string,
    role: HouseholdRole
  ) {
    const userToInvite = await User.findOne({ email: email.toLowerCase() });
    if (!userToInvite) {
      throw AppError.notFound('User with this email not registered yet');
    }

    const existing = await HouseholdMember.findOne({
      householdId: new Types.ObjectId(householdId),
      userId: userToInvite._id,
    });

    if (existing) {
      if (existing.status === 'active') {
        throw AppError.conflict('User is already a member of this household');
      }
      existing.status = 'active';
      existing.role = role;
      await existing.save();
      return existing;
    }

    const newMember = await HouseholdMember.create({
      householdId: new Types.ObjectId(householdId),
      userId: userToInvite._id,
      role,
      status: 'active',
    });

    return newMember;
  }
}
