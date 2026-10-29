import { Request, Response, NextFunction } from 'express';
import { ApplianceService } from '../services/applianceService';
import { ApiResponse } from '../utils/response';

export class DashboardController {
  static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const dashboard = await ApplianceService.getDashboard(req.params.householdId);
      return ApiResponse.success(res, dashboard);
    } catch (error) {
      return next(error);
    }
  }
}
