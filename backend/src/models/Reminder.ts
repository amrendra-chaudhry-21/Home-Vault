import mongoose, { Document, Schema, Types } from 'mongoose';
import { REMINDER_STATUS, REMINDER_TYPES, ReminderStatus, ReminderType } from '../config/constants';

export interface IReminder extends Document {
  _id: Types.ObjectId;
  householdId: Types.ObjectId;
  applianceId: Types.ObjectId;
  type: ReminderType;
  title: string;
  notes?: string;
  dueAt: Date;
  status: ReminderStatus;
  completedAt?: Date | null;
  dismissedAt?: Date | null;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ReminderSchema = new Schema<IReminder>(
  {
    householdId: {
      type: Schema.Types.ObjectId,
      ref: 'Household',
      required: true,
      index: true,
    },
    applianceId: {
      type: Schema.Types.ObjectId,
      ref: 'Appliance',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(REMINDER_TYPES),
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    dueAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(REMINDER_STATUS),
      default: REMINDER_STATUS.PENDING,
      required: true,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    dismissedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

ReminderSchema.index({ householdId: 1, status: 1, dueAt: 1 });
ReminderSchema.index({ applianceId: 1, type: 1, dueAt: 1 });

export const Reminder = mongoose.model<IReminder>('Reminder', ReminderSchema);
