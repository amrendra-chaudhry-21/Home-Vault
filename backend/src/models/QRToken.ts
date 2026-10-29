import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IQRToken extends Document {
  _id: Types.ObjectId;
  applianceId: Types.ObjectId;
  householdId: Types.ObjectId;
  tokenHash: string;
  revokedAt?: Date | null;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const QRTokenSchema = new Schema<IQRToken>(
  {
    applianceId: {
      type: Schema.Types.ObjectId,
      ref: 'Appliance',
      required: true,
      index: true,
    },
    householdId: {
      type: Schema.Types.ObjectId,
      ref: 'Household',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const QRToken = mongoose.model<IQRToken>('QRToken', QRTokenSchema);
