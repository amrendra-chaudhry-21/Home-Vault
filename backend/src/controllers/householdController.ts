import { Request, Response, NextFunction } from 'express';
import { HouseholdService } from '../services/householdService';
import { ApiResponse } from '../utils/response';
import { AppError } from '../utils/appError';

export class HouseholdController {
  static async createHousehold(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw AppError.unauthorized();
      const household = await HouseholdService.createHousehold(
        req.user._id.toString(),
        req.body
      );
      return ApiResponse.created(res, household, 'Household created successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async getUserHouseholds(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw AppError.unauthorized();
      const households = await HouseholdService.getUserHouseholds(
        req.user._id.toString()
      );
      return ApiResponse.success(res, households);
    } catch (error) {
      return next(error);
    }
  }

  static async getHouseholdById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw AppError.unauthorized();
      const household = await HouseholdService.getHouseholdById(
        req.params.householdId,
        req.user._id.toString()
      );
      return ApiResponse.success(res, household);
    } catch (error) {
      return next(error);
    }
  }

  static async updateHousehold(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await HouseholdService.updateHousehold(
        req.params.householdId,
        req.body
      );
      return ApiResponse.success(res, updated, 'Household updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async archiveHousehold(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw AppError.unauthorized();
      const result = await HouseholdService.archiveHousehold(
        req.params.householdId,
        req.user._id.toString()
      );
      return ApiResponse.success(res, result);
    } catch (error) {
      return next(error);
    }
  }

  static async getMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const members = await HouseholdService.getMembers(req.params.householdId);
      return ApiResponse.success(res, members);
    } catch (error) {
      return next(error);
    }
  }

  static async inviteMember(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, role } = req.body;
      const member = await HouseholdService.inviteMember(
        req.params.householdId,
        email,
        role
      );
      return ApiResponse.created(res, member, 'Member added to household successfully');
    } catch (error) {
      return next(error);
    }
  }
}
