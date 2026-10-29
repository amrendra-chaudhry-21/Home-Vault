import { Router } from 'express';
import { DocumentController } from '../../controllers/documentController';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/:documentId/download', DocumentController.downloadDocument);
router.delete('/:documentId', DocumentController.deleteDocument);

export default router;
