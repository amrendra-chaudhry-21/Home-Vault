import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IHousehold extends Document {
  _id: Types.ObjectId;
  name: string;
  address?: string;
  timezone: string;
  ownerUserId: Types.ObjectId;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const HouseholdSchema = new Schema<IHousehold>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    ownerUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

HouseholdSchema.index({ ownerUserId: 1, archivedAt: 1 });

export const Household = mongoose.model<IHousehold>('Household', HouseholdSchema);
