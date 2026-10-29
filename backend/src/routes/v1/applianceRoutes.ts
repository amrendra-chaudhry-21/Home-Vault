import { Router } from 'express';
import { ApplianceController } from '../../controllers/applianceController';
import { ServiceController } from '../../controllers/serviceController';
import { ReminderController } from '../../controllers/reminderController';
import { DocumentController } from '../../controllers/documentController';
import { QRController } from '../../controllers/qrController';
import { authenticate } from '../../middleware/auth';
import { requireHouseholdAccess } from '../../middleware/householdAuth';
import { validate } from '../../middleware/validate';
import { uploadDocumentMiddleware } from '../../middleware/upload';
import { updateApplianceSchema } from '../../validators/applianceValidator';
import { createServiceRecordSchema } from '../../validators/serviceValidator';
import { createReminderSchema } from '../../validators/reminderValidator';
import { HOUSEHOLD_ROLES } from '../../config/constants';

const router = Router();

router.use(authenticate);

// Appliance Specific
router.get('/:applianceId', requireHouseholdAccess(HOUSEHOLD_ROLES.MEMBER), ApplianceController.getApplianceById);
router.patch(
  '/:applianceId',
  requireHouseholdAccess(HOUSEHOLD_ROLES.MEMBER),
  validate(updateApplianceSchema),
  ApplianceController.updateAppliance
);
router.delete(
  '/:applianceId',
  requireHouseholdAccess(HOUSEHOLD_ROLES.ADMIN),
  ApplianceController.archiveAppliance
);

// Services for Appliance
router.post(
  '/:applianceId/services',
  requireHouseholdAccess(HOUSEHOLD_ROLES.MEMBER),
  validate(createServiceRecordSchema),
  ServiceController.createServiceRecord
);
router.get(
  '/:applianceId/services',
  requireHouseholdAccess(HOUSEHOLD_ROLES.MEMBER),
  ServiceController.getApplianceServices
);

// Reminders for Appliance
router.post(
  '/:applianceId/reminders',
  requireHouseholdAccess(HOUSEHOLD_ROLES.MEMBER),
  validate(createReminderSchema),
  ReminderController.createReminder
);

// Documents for Appliance
router.post(
  '/:applianceId/documents',
  requireHouseholdAccess(HOUSEHOLD_ROLES.MEMBER),
  uploadDocumentMiddleware.single('file'),
  DocumentController.uploadDocument
);
router.get(
  '/:applianceId/documents',
  requireHouseholdAccess(HOUSEHOLD_ROLES.MEMBER),
  DocumentController.getApplianceDocuments
);

// QR Generation for Appliance
router.post(
  '/:applianceId/qr',
  requireHouseholdAccess(HOUSEHOLD_ROLES.MEMBER),
  QRController.generateQR
);

export default router;
