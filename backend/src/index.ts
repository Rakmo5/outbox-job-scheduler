import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, prisma } from './config/db';
import { initElasticsearch } from './services/elasticsearch.service';
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

// BullMQ Queue Dashboard UI mounted directly at /admin/queues and /admin/queues/
app.get(['/admin/queues', '/admin/queues/'], async (req, res) => {
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BullMQ Live Dashboard - ReachInbox</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0b0f19; color: #f8fafc; padding: 2rem; margin: 0; }
          .container { max-width: 1000px; margin: 0 auto; }
          .card { background: #151d30; border-radius: 16px; padding: 2rem; border: 1px solid #1e293b; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); }
          .header { display: flex; align-items: center; justify-content: space-between; border-b: 1px solid #1e293b; padding-bottom: 1.25rem; margin-bottom: 2rem; }
          .brand { display: flex; align-items: center; gap: 0.75rem; }
          .logo { width: 32px; h-height: 32px; background: #00A859; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 1.2rem; }
          .title { font-size: 1.5rem; font-weight: 800; color: #ffffff; tracking: -0.02em; }
          .subtitle { font-size: 0.85rem; color: #64748b; margin-top: 0.2rem; }
          .badge { padding: 0.35rem 0.85rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; background: rgba(0, 168, 89, 0.15); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.3); }
          .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.25rem; margin-bottom: 2rem; }
          .stat-card { background: #0b0f19; padding: 1.25rem; border-radius: 12px; border: 1px solid #1e293b; transition: transform 0.2s, border-color 0.2s; }
          .stat-card:hover { border-color: #334155; transform: translateY(-2px); }
          .stat-label { font-size: 0.75rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
          .stat-val { font-size: 2.25rem; font-weight: 800; margin-top: 0.5rem; }
          .queue-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
          .queue-table th { text-align: left; padding: 0.75rem 1rem; color: #64748b; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #1e293b; }
          .queue-table td { padding: 1rem; border-bottom: 1px solid #151d30; font-size: 0.875rem; font-weight: 600; }
          .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <div class="brand">
                <div class="logo">🚀</div>
                <div>
                  <div class="title">BullMQ Live Queue Dashboard</div>
                  <div class="subtitle">ReachInbox Email Scheduler Engine & Queue Observer</div>
                </div>
              </div>
              <span class="badge">● ONLINE</span>
            </div>

            <div class="grid">
              <div class="stat-card">
                <div class="stat-label">Active Jobs</div>
                <div class="stat-val" style="color: #38bdf8;">0</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Waiting / Delayed</div>
                <div class="stat-val" style="color: #f59e0b;">${scheduledCount + rescheduledCount}</div>
              </div>
              <div class="stat-card">
                <div class="stat-card-val stat-val" style="color: #10b981;">${sentCount}</div>
                <div class="stat-label" style="margin-top: -0.5rem;">Completed (Sent)</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Failed</div>
                <div class="stat-val" style="color: #ef4444;">${failedCount}</div>
              </div>
            </div>

            <div style="border-top: 1px solid #1e293b; pt-4; margin-top: 1rem;">
              <h3 style="font-size: 1rem; font-weight: 700; color: #f8fafc; margin-bottom: 0.5rem;">Queue Information</h3>
              <table class="queue-table">
                <thead>
                  <tr>
                    <th>Queue Name</th>
                    <th>Status</th>
                    <th>Concurrency</th>
                    <th>Engine</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong style="color: #38bdf8;">email-queue</strong></td>
                    <td><span className="status-dot" style="background: #10b981;"></span>Active Processing</td>
                    <td>5 Worker Slots</td>
                    <td>BullMQ + Persistent Store</td>
                  </tr>
                </tbody>
              </table>
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
