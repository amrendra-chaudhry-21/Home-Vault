import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Household, IHousehold } from '../models/Household';
import { HouseholdMember } from '../models/HouseholdMember';
import { Appliance } from '../models/Appliance';
import { HOUSEHOLD_ROLES, HouseholdRole } from '../config/constants';
import { AppError } from '../utils/appError';

/**
 * Ensures the authenticated user has access to the specified household.
 * If requiredRole is specified, verifies that the user meets or exceeds the required role.
 */
export const requireHouseholdAccess = (
  minRole: HouseholdRole = HOUSEHOLD_ROLES.MEMBER
) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return next(AppError.unauthorized('Authentication required'));
      }

      let householdIdStr = req.params.householdId;

      // If householdId is not in params, check if applianceId is in params and resolve its household
      if (!householdIdStr && req.params.applianceId) {
        if (!Types.ObjectId.isValid(req.params.applianceId)) {
          return next(AppError.badRequest('Invalid appliance ID'));
        }
        const appliance = await Appliance.findById(req.params.applianceId).select('householdId archivedAt');
        if (!appliance || appliance.archivedAt) {
          return next(AppError.notFound('Appliance not found'));
        }
        householdIdStr = appliance.householdId.toString();
      }

      if (!householdIdStr || !Types.ObjectId.isValid(householdIdStr)) {
        return next(AppError.badRequest('Valid household ID is required'));
      }

      const household = await Household.findOne({
        _id: householdIdStr,
        archivedAt: null,
      });

      if (!household) {
        return next(AppError.notFound('Household not found'));
      }

      // Check if user is the direct owner
      const isOwner = household.ownerUserId.equals(req.user._id);

      let userRole: HouseholdRole | null = null;
      if (isOwner) {
        userRole = HOUSEHOLD_ROLES.OWNER;
      } else {
        const membership = await HouseholdMember.findOne({
          householdId: household._id,
          userId: req.user._id,
          status: 'active',
        });

        if (!membership) {
          return next(AppError.forbidden('You do not have access to this household'));
        }
        userRole = membership.role;
      }

      // Verify role hierarchy: OWNER > ADMIN > MEMBER
      const roleWeight = {
        [HOUSEHOLD_ROLES.OWNER]: 3,
        [HOUSEHOLD_ROLES.ADMIN]: 2,
        [HOUSEHOLD_ROLES.MEMBER]: 1,
      };

      if (roleWeight[userRole] < roleWeight[minRole]) {
        return next(
          AppError.forbidden(
            `Operation requires at least ${minRole} privileges in this household`
          )
        );
      }

      req.household = household;
      req.householdRole = userRole;
      return next();
    } catch (error) {
      return next(error);
    }
  };
};
