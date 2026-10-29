import path from 'path';
import fs from 'fs';
import { Types } from 'mongoose';
import { DocumentModel } from '../models/Document';
import { Appliance } from '../models/Appliance';
import { DocumentType } from '../config/constants';
import { env } from '../config/env';
import { AppError } from '../utils/appError';

export class DocumentService {
  static async uploadDocument(
    applianceId: string,
    userId: string,
    file: Express.Multer.File,
    documentType: DocumentType
  ) {
    const appliance = await Appliance.findOne({
      _id: applianceId,
      archivedAt: null,
    });

    if (!appliance) {
      // Remove uploaded file if appliance not found
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw AppError.notFound('Appliance not found');
    }

    const document = await DocumentModel.create({
      householdId: appliance.householdId,
      applianceId: appliance._id,
      storageKey: file.filename,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      documentType,
      uploadedBy: new Types.ObjectId(userId),
    });

    return {
      id: document._id.toString(),
      originalFilename: document.originalFilename,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      documentType: document.documentType,
      createdAt: document.createdAt,
    };
  }

  static async getApplianceDocuments(applianceId: string) {
    const docs = await DocumentModel.find({
      applianceId: new Types.ObjectId(applianceId),
    }).sort({ createdAt: -1 });

    return docs.map((d) => ({
      id: d._id.toString(),
      applianceId: d.applianceId.toString(),
      originalFilename: d.originalFilename,
      mimeType: d.mimeType,
      fileSize: d.fileSize,
      documentType: d.documentType,
      createdAt: d.createdAt,
    }));
  }

  static async getDocumentForDownload(documentId: string) {
    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
      throw AppError.notFound('Document not found');
    }

    const uploadDir = path.resolve(process.cwd(), env.LOCAL_UPLOAD_DIR);
    const resolvedPath = path.resolve(uploadDir, doc.storageKey);

    // Prevent Path Traversal
    if (!resolvedPath.startsWith(uploadDir)) {
      throw AppError.forbidden('Invalid document path');
    }

    if (!fs.existsSync(resolvedPath)) {
      throw AppError.notFound('File not found on storage server');
    }

    return {
      filePath: resolvedPath,
      mimeType: doc.mimeType,
      originalFilename: doc.originalFilename,
      householdId: doc.householdId.toString(),
    };
  }

  static async deleteDocument(documentId: string) {
    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
      throw AppError.notFound('Document not found');
    }

    const uploadDir = path.resolve(process.cwd(), env.LOCAL_UPLOAD_DIR);
    const resolvedPath = path.resolve(uploadDir, doc.storageKey);
    if (fs.existsSync(resolvedPath)) {
      try {
        fs.unlinkSync(resolvedPath);
      } catch (err) {
        console.warn('Could not delete file from disk:', resolvedPath);
      }
    }

    await doc.deleteOne();
    return { message: 'Document deleted successfully' };
  }
}
