import mongoose, { Document, Schema, Types } from 'mongoose';
import { DOCUMENT_TYPES, DocumentType } from '../config/constants';

export interface IDocument extends Document {
  _id: Types.ObjectId;
  householdId: Types.ObjectId;
  applianceId: Types.ObjectId;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  documentType: DocumentType;
  uploadedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
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
    storageKey: {
      type: String,
      required: true,
      unique: true,
    },
    originalFilename: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    documentType: {
      type: String,
      enum: Object.values(DOCUMENT_TYPES),
      default: DOCUMENT_TYPES.INVOICE,
      required: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

DocumentSchema.index({ applianceId: 1, createdAt: -1 });
DocumentSchema.index({ householdId: 1, createdAt: -1 });

export const DocumentModel = mongoose.model<IDocument>('Document', DocumentSchema);
