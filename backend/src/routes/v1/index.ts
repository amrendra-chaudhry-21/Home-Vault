import { Router } from 'express';
import authRoutes from './authRoutes';
import householdRoutes from './householdRoutes';
import applianceRoutes from './applianceRoutes';
import serviceRoutes from './serviceRoutes';
import reminderRoutes from './reminderRoutes';
import documentRoutes from './documentRoutes';
import qrRoutes from './qrRoutes';
import userRoutes from './userRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/households', householdRoutes);
router.use('/appliances', applianceRoutes);
router.use('/services', serviceRoutes);
router.use('/reminders', reminderRoutes);
router.use('/documents', documentRoutes);
router.use('/qr', qrRoutes);
router.use('/users', userRoutes);

export default router;
