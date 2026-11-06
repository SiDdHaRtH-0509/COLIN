/**
 * COLIN API v1 Central Router
 * Phase 4A.2.2.3: Backend Core Service & API Architecture
 */

import { Router } from 'express';
import healthRoutes from './routes/health.routes';
import systemRoutes from './routes/system.routes';

const v1Router = Router();

v1Router.use('/health', healthRoutes);
v1Router.use('/system', systemRoutes);

export default v1Router;
