/**
 * COLIN API v1 Central Router
 * Phase 4A.2.3: Authentication & Authorization Integration
 */

import { Router } from 'express';
import healthRoutes from './routes/health.routes';
import systemRoutes from './routes/system.routes';
import authRoutes from './routes/auth.routes';

const v1Router = Router();

v1Router.use('/health', healthRoutes);
v1Router.use('/system', systemRoutes);
v1Router.use('/auth', authRoutes);

export default v1Router;
