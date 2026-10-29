import { Router } from 'express';
import { UserController } from '../../controllers/userController';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/me/export', UserController.exportUserData);
router.delete('/me', UserController.deleteAccount);
router.post('/fcm-token', UserController.registerFCMToken);

export default router;
