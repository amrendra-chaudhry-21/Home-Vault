import mongoose, { Document, Schema, Types } from 'mongoose';
import { HOUSEHOLD_ROLES, HouseholdRole } from '../config/constants';

export interface IHouseholdMember extends Document {
  _id: Types.ObjectId;
  householdId: Types.ObjectId;
  userId: Types.ObjectId;
  role: HouseholdRole;
  status: 'active' | 'pending' | 'revoked';
  createdAt: Date;
  updatedAt: Date;
}

const HouseholdMemberSchema = new Schema<IHouseholdMember>(
  {
    householdId: {
      type: Schema.Types.ObjectId,
      ref: 'Household',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: Object.values(HOUSEHOLD_ROLES),
      default: HOUSEHOLD_ROLES.MEMBER,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'revoked'],
      default: 'active',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce unique compound index so a user cannot be duplicated in the same household
HouseholdMemberSchema.index({ householdId: 1, userId: 1 }, { unique: true });

export const HouseholdMember = mongoose.model<IHouseholdMember>(
  'HouseholdMember',
  HouseholdMemberSchema
);
