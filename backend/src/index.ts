import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { connectDB } from './config/db';
import { initElasticsearch } from './services/elasticsearch.service';
import { emailQueue } from './services/queue.service';
import { initWorker } from './services/worker.service';

import emailRoutes from './routes/email.routes';
import searchRoutes from './routes/search.routes';
import slackRoutes from './routes/slack.routes';
import authRoutes from './routes/auth.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Setup Bull Board UI at /admin/queues
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

try {
  createBullBoard({
    queues: [new BullMQAdapter(emailQueue)],
    serverAdapter,
  });
  app.use('/admin/queues', serverAdapter.getRouter());
} catch (err: any) {
  console.warn('Bull Board adapter warning:', err.message);
}

// API Routes
app.use('/api/emails', emailRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/auth', authRoutes);

// Healthcheck
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'ReachInbox Full-stack Email Job Scheduler',
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  await connectDB();
  await initElasticsearch();
  initWorker();

  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 ReachInbox Email Scheduler API live on http://localhost:${PORT}`);
    console.log(`📊 BullMQ Dashboard UI: http://localhost:${PORT}/admin/queues`);
    console.log(`=======================================================`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
