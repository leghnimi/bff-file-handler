import express from 'express';
import { authRoutes } from './auth.routes';
import { fileRoutes } from './file.routes';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/files', fileRoutes);

export const apiRoutes = router;