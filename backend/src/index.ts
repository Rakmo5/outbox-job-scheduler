import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { connectDB, prisma } from './config/db';
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

// Custom clean BullMQ Dashboard HTML fallback to prevent UI errors when Redis container is offline
app.get('/admin/queues/status-html', async (req, res) => {
  try {
    const sentCount = await prisma.emailSchedule.count({ where: { status: 'SENT' } });
    const scheduledCount = await prisma.emailSchedule.count({ where: { status: 'SCHEDULED' } });
    const rescheduledCount = await prisma.emailSchedule.count({ where: { status: 'RESCHEDULED' } });
    const failedCount = await prisma.emailSchedule.count({ where: { status: 'FAILED' } });

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>BullMQ Live Board - ReachInbox</title>
        <style>
          body { font-family: -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; margin: 0; }
          .card { background: #1e293b; border-radius: 12px; padding: 1.5rem; border: 1px solid #334155; margin-bottom: 1.5rem; }
          .header { display: flex; align-items: center; justify-content: space-between; border-b: 1px solid #334155; padding-bottom: 1rem; margin-bottom: 1.5rem; }
          .title { font-size: 1.25rem; font-weight: bold; color: #38bdf8; display: flex; align-items: center; gap: 0.5rem; }
          .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; }
          .stat-box { background: #0f172a; padding: 1rem; border-radius: 8px; border: 1px solid #334155; text-align: center; }
          .stat-val { font-size: 1.75rem; font-weight: bold; margin-top: 0.25rem; }
          .stat-label { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
          .badge { padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; background: #0284c7; color: white; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div class="title">🚀 BullMQ Live Queue Dashboard</div>
            <span class="badge">Queue: email-queue</span>
          </div>
          <div class="grid">
            <div class="stat-box">
              <div class="stat-label">Active Jobs</div>
              <div class="stat-val" style="color: #38bdf8;">0</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Waiting / Delayed</div>
              <div class="stat-val" style="color: #f59e0b;">${scheduledCount + rescheduledCount}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Completed (Sent)</div>
              <div class="stat-val" style="color: #10b981;">${sentCount}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Failed</div>
              <div class="stat-val" style="color: #ef4444;">${failedCount}</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (err: any) {
    res.status(500).send('Queue status error');
  }
});

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
    console.log(`📊 Fallback Queue Board: http://localhost:${PORT}/admin/queues/status-html`);
    console.log(`=======================================================`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
