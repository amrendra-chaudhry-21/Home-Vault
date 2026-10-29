import mongoose, { Document, Schema, Types } from 'mongoose';
import { APPLIANCE_CATEGORIES, ApplianceCategory } from '../config/constants';

export interface IAppliance extends Document {
  _id: Types.ObjectId;
  householdId: Types.ObjectId;
  name: string;
  category: ApplianceCategory;
  brand: string;
  modelNumber: string;
  serialNumber?: string;
  purchaseDate?: Date | null;
  warrantyStartDate?: Date | null;
  warrantyEndDate?: Date | null;
  purchasePrice?: number | null; // In INR (₹)
  seller?: string;
  notes?: string;
  qrTokenId?: Types.ObjectId | null;
  archivedAt?: Date | null;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ApplianceSchema = new Schema<IAppliance>(
  {
    householdId: {
      type: Schema.Types.ObjectId,
      ref: 'Household',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: APPLIANCE_CATEGORIES,
      required: true,
      index: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    modelNumber: {
      type: String,
      required: true,
      trim: true,
    },
    serialNumber: {
      type: String,
      trim: true,
      default: '',
    },
    purchaseDate: {
      type: Date,
      default: null,
    },
    warrantyStartDate: {
      type: Date,
      default: null,
    },
    warrantyEndDate: {
      type: Date,
      default: null,
      index: true,
    },
    purchasePrice: {
      type: Number,
      default: null,
    },
    seller: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    qrTokenId: {
      type: Schema.Types.ObjectId,
      ref: 'QRToken',
      default: null,
    },
    archivedAt: {
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
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : '';
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : '';
        return ret;
      },
    },
  }
);

ApplianceSchema.index({ householdId: 1, archivedAt: 1, createdAt: -1 });
ApplianceSchema.index({ householdId: 1, category: 1, archivedAt: 1 });
ApplianceSchema.index({ householdId: 1, warrantyEndDate: 1, archivedAt: 1 });

export const Appliance = mongoose.model<IAppliance>('Appliance', ApplianceSchema);
