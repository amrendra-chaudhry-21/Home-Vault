import { Router } from 'express';
import { HouseholdController } from '../../controllers/householdController';
import { ApplianceController } from '../../controllers/applianceController';
import { ReminderController } from '../../controllers/reminderController';
import { DashboardController } from '../../controllers/dashboardController';
import { authenticate } from '../../middleware/auth';
import { requireHouseholdAccess } from '../../middleware/householdAuth';
import { validate } from '../../middleware/validate';
import {
  createHouseholdSchema,
  updateHouseholdSchema,
  inviteMemberSchema,
} from '../../validators/householdValidator';
import { createApplianceSchema, listAppliancesQuerySchema } from '../../validators/applianceValidator';
import { HOUSEHOLD_ROLES } from '../../config/constants';

const router = Router();

router.use(authenticate);

// Household CRUD
router.post('/', validate(createHouseholdSchema), HouseholdController.createHousehold);
router.get('/', HouseholdController.getUserHouseholds);
router.get('/:householdId', requireHouseholdAccess(HOUSEHOLD_ROLES.MEMBER), HouseholdController.getHouseholdById);
router.patch(
  '/:householdId',
  requireHouseholdAccess(HOUSEHOLD_ROLES.ADMIN),
  validate(updateHouseholdSchema),
  HouseholdController.updateHousehold
);
router.delete(
  '/:householdId',
  requireHouseholdAccess(HOUSEHOLD_ROLES.OWNER),
  HouseholdController.archiveHousehold
);

// Household Membership
router.get('/:householdId/members', requireHouseholdAccess(HOUSEHOLD_ROLES.MEMBER), HouseholdController.getMembers);
router.post(
  '/:householdId/invitations',
  requireHouseholdAccess(HOUSEHOLD_ROLES.ADMIN),
  validate(inviteMemberSchema),
  HouseholdController.inviteMember
);

// Household Dashboard
router.get('/:householdId/dashboard', requireHouseholdAccess(HOUSEHOLD_ROLES.MEMBER), DashboardController.getDashboard);

// Household Appliances
router.get(
  '/:householdId/appliances',
  requireHouseholdAccess(HOUSEHOLD_ROLES.MEMBER),
  validate(listAppliancesQuerySchema),
  ApplianceController.getHouseholdAppliances
);
router.post(
  '/:householdId/appliances',
  requireHouseholdAccess(HOUSEHOLD_ROLES.MEMBER),
  validate(createApplianceSchema),
  ApplianceController.createAppliance
);

// Household Reminders
router.get(
  '/:householdId/reminders',
  requireHouseholdAccess(HOUSEHOLD_ROLES.MEMBER),
  ReminderController.getHouseholdReminders
);

export default router;
