import { Request, Response, NextFunction } from 'express';
import { DocumentService } from '../services/documentService';
import { ApiResponse } from '../utils/response';
import { AppError } from '../utils/appError';
import { DocumentType } from '../config/constants';

export class DocumentController {
  static async uploadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw AppError.unauthorized();
      if (!req.file) {
        throw AppError.badRequest('Please upload a document or invoice file');
      }

      const documentType = (req.body.documentType || 'invoice') as DocumentType;
      const document = await DocumentService.uploadDocument(
        req.params.applianceId,
        req.user._id.toString(),
        req.file,
        documentType
      );

      return ApiResponse.created(res, document, 'Document uploaded successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async getApplianceDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const documents = await DocumentService.getApplianceDocuments(
        req.params.applianceId
      );
      return ApiResponse.success(res, documents);
    } catch (error) {
      return next(error);
    }
  }

  static async downloadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { filePath, mimeType, originalFilename } =
        await DocumentService.getDocumentForDownload(req.params.documentId);

      res.setHeader('Content-Type', mimeType);
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(originalFilename)}"`
      );

      return res.sendFile(filePath);
    } catch (error) {
      return next(error);
    }
  }

  static async deleteDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DocumentService.deleteDocument(req.params.documentId);
      return ApiResponse.success(res, result);
    } catch (error) {
      return next(error);
    }
  }
}
