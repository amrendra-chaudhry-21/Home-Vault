import { Request, Response, NextFunction } from 'express';
import { QRService } from '../services/qrService';
import { ApiResponse } from '../utils/response';
import { AppError } from '../utils/appError';

export class QRController {
  static async generateQR(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw AppError.unauthorized();
      const qrData = await QRService.generateApplianceQR(
        req.params.applianceId,
        req.user._id.toString()
      );
      return ApiResponse.success(res, qrData, 'QR Code generated successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async resolveQR(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw AppError.unauthorized();
      const { token } = req.params;
      const appliance = await QRService.resolveQRToken(
        token,
        req.user._id.toString()
      );
      return ApiResponse.success(res, appliance, 'QR code resolved successfully');
    } catch (error) {
      return next(error);
    }
  }
}
