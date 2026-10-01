import 'dotenv/config';
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { supabaseAdmin } from './supabase.js';
import { HealthResponse } from '@researchos/shared-types';

// Route Handlers
import profileRoutes from './routes/profile.routes.js';
import supervisorRoutes from './routes/supervisor.routes.js';
import adminRoutes from './routes/admin.routes.js';
import projectRoutes from './routes/project.routes.js';
import inviteRoutes from './routes/invite.routes.js';
import milestoneRoutes from './routes/milestone.routes.js';
import taskRoutes from './routes/task.routes.js';
import messageRoutes from './routes/message.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import paperRoutes from './routes/paper.routes.js';
import collectionRoutes from './routes/collection.routes.js';
import { experimentRouter } from './routes/experiment.routes.js';
import { manuscriptRouter } from './routes/manuscript.routes.js';
import { forumRouter } from './routes/forum.routes.js';
import { directMessageRouter } from './routes/directMessage.routes.js';
import { communityRouter } from './routes/community.routes.js';
import { marketplaceRouter } from './routes/marketplace.routes.js';
import aiRoutes from './routes/ai.routes.js';

const app: Express = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Start time for uptime reporting
const startTime = Date.now();

/**
 * Public Health Check Endpoint
 * Spec 00 Acceptance Criteria: Returns { status: "ok", supabase: boolean }
 */
app.get('/health', async (_req: Request, res: Response<HealthResponse>) => {
  let supabaseHealthy = false;

  try {
    const { error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    supabaseHealthy = !error;
  } catch {
    supabaseHealthy = false;
  }

  const response: HealthResponse = {
    status: supabaseHealthy ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    environment: process.env.NODE_ENV || 'development',
    supabase: supabaseHealthy,
  };

  return res.status(supabaseHealthy ? 200 : 503).json(response);
});

// Spec 01 API Route Mounts
app.use('/', profileRoutes);
app.use('/', supervisorRoutes);
app.use('/admin', adminRoutes);

// Spec 02 API Route Mounts
app.use('/projects', projectRoutes);
app.use('/invites', inviteRoutes);
app.use('/', milestoneRoutes);
app.use('/', taskRoutes);
app.use('/', messageRoutes);
app.use('/notifications', notificationRoutes);

// Spec 03 API Route Mounts
app.use('/', paperRoutes);
app.use('/collections', collectionRoutes);

// Spec 04 API Route Mounts
app.use('/', experimentRouter);

// Spec 05 API Route Mounts (Manuscript Writing & Internal Peer Review)
app.use('/', manuscriptRouter);

// Spec 06 API Route Mounts (Discussion Forum & Research Community)
app.use('/forum', forumRouter);
app.use('/messages', directMessageRouter);
app.use('/', communityRouter);

// Spec 07 API Route Mounts (Academic Marketplace & Compute Sharing)
app.use('/marketplace', marketplaceRouter);

// Spec 08 API Route Mounts (AI Research Assistant)
app.use('/ai', aiRoutes);


// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Centralized Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const isTestRunner = process.env.NODE_ENV === 'test' || process.argv.some(arg => arg.includes('test'));

if (!isTestRunner) {
  app.listen(port, () => {
    console.log(`🚀 ResearchOS API running on http://localhost:${port}`);
    console.log(`📡 Health check available at http://localhost:${port}/health`);
  });
}

export default app;
