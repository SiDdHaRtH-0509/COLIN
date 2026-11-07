/**
 * COLIN API v1 Central Router
 * Phase 4A.2.3: Authentication & Authorization Integration
 */

import { Router } from 'express';
import healthRoutes from './routes/health.routes';
import systemRoutes from './routes/system.routes';
import authRoutes from './routes/auth.routes';
import studentRoutes from './routes/student.routes';
import ownerRoutes from './routes/owner.routes';
import ownerPropertyRoutes from './routes/owner.property.routes';
import publicPropertyRoutes from './routes/public.property.routes';
import adminPropertyRoutes from './routes/admin.property.routes';
import storageRoutes from './routes/storage.routes';
import locationRoutes from './routes/location.routes';
import webhookRoutes from './routes/webhook.routes';

const v1Router = Router();

v1Router.use('/health', healthRoutes);
v1Router.use('/system', systemRoutes);
v1Router.use('/auth', authRoutes);
v1Router.use('/students', studentRoutes);
v1Router.use('/owners', ownerRoutes);
v1Router.use('/owner/properties', ownerPropertyRoutes);
v1Router.use('/properties', publicPropertyRoutes);
v1Router.use('/admin/properties', adminPropertyRoutes);
v1Router.use('/storage', storageRoutes);
v1Router.use('/location', locationRoutes);
v1Router.use('/webhooks', webhookRoutes);

export default v1Router;
