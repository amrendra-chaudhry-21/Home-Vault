import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IServiceRecord extends Document {
  _id: Types.ObjectId;
  applianceId: Types.ObjectId;
  householdId: Types.ObjectId;
  serviceDate: Date;
  issueDescription: string;
  workPerformed: string;
  cost?: number | null; // In INR (₹)
  technicianName?: string;
  providerName?: string;
  notes?: string;
  nextServiceDate?: Date | null;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceRecordSchema = new Schema<IServiceRecord>(
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
    serviceDate: {
      type: Date,
      required: true,
      index: true,
    },
    issueDescription: {
      type: String,
      required: true,
      trim: true,
    },
    workPerformed: {
      type: String,
      required: true,
      trim: true,
    },
    cost: {
      type: Number,
      default: null,
    },
    technicianName: {
      type: String,
      trim: true,
      default: '',
    },
    providerName: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    nextServiceDate: {
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

ServiceRecordSchema.index({ applianceId: 1, serviceDate: -1 });
ServiceRecordSchema.index({ householdId: 1, serviceDate: -1 });

export const ServiceRecord = mongoose.model<IServiceRecord>(
  'ServiceRecord',
  ServiceRecordSchema
);
