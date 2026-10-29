import { Request, Response, NextFunction } from 'express';
import { ServiceHistoryService } from '../services/serviceHistoryService';
import { ApiResponse } from '../utils/response';
import { AppError } from '../utils/appError';

export class ServiceController {
  static async createServiceRecord(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw AppError.unauthorized();
      const service = await ServiceHistoryService.createServiceRecord(
        req.params.applianceId,
        req.user._id.toString(),
        req.body
      );
      return ApiResponse.created(res, service, 'Service record added successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async getApplianceServices(req: Request, res: Response, next: NextFunction) {
    try {
      const services = await ServiceHistoryService.getApplianceServices(
        req.params.applianceId
      );
      return ApiResponse.success(res, services);
    } catch (error) {
      return next(error);
    }
  }

  static async getServiceById(req: Request, res: Response, next: NextFunction) {
    try {
      const service = await ServiceHistoryService.getServiceById(req.params.serviceId);
      return ApiResponse.success(res, service);
    } catch (error) {
      return next(error);
    }
  }

  static async updateServiceRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await ServiceHistoryService.updateServiceRecord(
        req.params.serviceId,
        req.body
      );
      return ApiResponse.success(res, updated, 'Service record updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async deleteServiceRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ServiceHistoryService.deleteServiceRecord(req.params.serviceId);
      return ApiResponse.success(res, result);
    } catch (error) {
      return next(error);
    }
  }
}
