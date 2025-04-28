import express from 'express';
import { authRoutes } from './auth.routes';
import { fileRoutes } from './file.routes';
import { healthRoutes } from './health.routes';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/files', fileRoutes);
router.use('/health', healthRoutes);

export const apiRoutes = router;