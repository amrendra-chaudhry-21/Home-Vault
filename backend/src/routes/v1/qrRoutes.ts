import { Router } from 'express';
import { QRController } from '../../controllers/qrController';
import { authenticate } from '../../middleware/auth';

const router = Router();

// Scanning / resolving a QR code requires authentication and household verification
router.get('/:token', authenticate, QRController.resolveQR);

export default router;
