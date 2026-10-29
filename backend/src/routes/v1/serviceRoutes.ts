import { Router } from 'express';
import { ServiceController } from '../../controllers/serviceController';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { updateServiceRecordSchema } from '../../validators/serviceValidator';

const router = Router();

router.use(authenticate);

router.get('/:serviceId', ServiceController.getServiceById);
router.patch('/:serviceId', validate(updateServiceRecordSchema), ServiceController.updateServiceRecord);
router.delete('/:serviceId', ServiceController.deleteServiceRecord);

export default router;
