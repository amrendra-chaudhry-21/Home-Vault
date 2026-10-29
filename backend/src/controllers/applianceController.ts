import { Request, Response, NextFunction } from 'express';
import { ApplianceService } from '../services/applianceService';
import { ApiResponse } from '../utils/response';
import { AppError } from '../utils/appError';

export class ApplianceController {
  static async createAppliance(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw AppError.unauthorized();
      const appliance = await ApplianceService.createAppliance(
        req.params.householdId,
        req.user._id.toString(),
        req.body
      );
      return ApiResponse.created(res, appliance, 'Appliance added successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async getHouseholdAppliances(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ApplianceService.getHouseholdAppliances(
        req.params.householdId,
        req.query as any
      );
      return ApiResponse.success(res, result.items, 'Appliances retrieved', 200, result.pagination);
    } catch (error) {
      return next(error);
    }
  }

  static async getApplianceById(req: Request, res: Response, next: NextFunction) {
    try {
      const appliance = await ApplianceService.getApplianceById(req.params.applianceId);
      return ApiResponse.success(res, appliance);
    } catch (error) {
      return next(error);
    }
  }

  static async updateAppliance(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await ApplianceService.updateAppliance(
        req.params.applianceId,
        req.body
      );
      return ApiResponse.success(res, updated, 'Appliance updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async archiveAppliance(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ApplianceService.archiveAppliance(req.params.applianceId);
      return ApiResponse.success(res, result);
    } catch (error) {
      return next(error);
    }
  }
}
