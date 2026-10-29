import { Router } from 'express';
import { ReminderController } from '../../controllers/reminderController';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { updateReminderStatusSchema } from '../../validators/reminderValidator';

const router = Router();

router.use(authenticate);

router.patch('/:reminderId', validate(updateReminderStatusSchema), ReminderController.updateReminderStatus);
router.delete('/:reminderId', ReminderController.deleteReminder);
router.post('/dispatch-alerts', ReminderController.dispatchAlerts);

export default router;
