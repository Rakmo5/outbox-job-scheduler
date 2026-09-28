import { Worker, Job } from 'bullmq';
import { redisClient, mockRedisClient } from '../config/redis';
import { EMAIL_QUEUE_NAME, ScheduleJobData } from './queue.service';
import { sendEmail } from './email.service';
import { prisma } from '../config/db';
import { indexEmailInEs } from './elasticsearch.service';
import { sendSlackRateLimitNotification } from './slack.service';

const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);

export async function processSingleEmailSchedule(emailScheduleId: string) {
  try {
    const record = await prisma.emailSchedule.findUnique({
      where: { id: emailScheduleId },
    });

    if (!record || record.status === 'SENT') return;

    const { senderEmail, recipientEmail, subject, bodyHtml, delayBetweenMs, maxEmailsPerHour } = record;

    // 1. Minimum Inter-Email Delay Throttling
    const minDelay = Math.max(delayBetweenMs || 2000, parseInt(process.env.MIN_EMAIL_DELAY_MS || '2000', 10));
    await new Promise((resolve) => setTimeout(resolve, minDelay));

    // 2. Atomic Hourly Rate Limiting via Redis INCR
    const now = new Date();
    const windowKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}`;
    const rateLimitKey = `rate_limit:${senderEmail}:${windowKey}`;

    const hourlyLimit = maxEmailsPerHour || parseInt(process.env.DEFAULT_MAX_EMAILS_PER_HOUR || '50', 10);

    // Atomically increment counter
    const currentCount = await redisClient.incr(rateLimitKey);
    if (currentCount === 1) {
      await redisClient.expire(rateLimitKey, 3600); // 1 hour TTL
    }

    if (currentCount > hourlyLimit) {
      console.warn(`🛑 Hourly rate limit hit for sender ${senderEmail} (Count=${currentCount}, Limit=${hourlyLimit}). Rescheduling...`);
      
      // Rollback counter so this failed check doesn't pollute next quota
      await redisClient.decr(rateLimitKey);

      const nextWindow = new Date(now);
      nextWindow.setHours(nextWindow.getHours() + 1, 0, 0, 0);

      await prisma.emailSchedule.update({
        where: { id: emailScheduleId },
        data: {
          status: 'RESCHEDULED',
          scheduledAt: nextWindow,
        },
      });

      await sendSlackRateLimitNotification(senderEmail, hourlyLimit, 1, nextWindow);
      return;
    }

    console.log(`⚡ Rate limit check passed for ${recipientEmail} (${currentCount}/${hourlyLimit} sent this hour)`);

    // 3. Send Email via SMTP
    const sendResult = await sendEmail({
      from: senderEmail,
      to: recipientEmail,
      subject,
      html: bodyHtml,
    });

    // 4. Update DB record to SENT
    const updatedRecord = await prisma.emailSchedule.update({
      where: { id: emailScheduleId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        etherealMessageUrl: sendResult.previewUrl || null,
      },
    });

    // 5. Index in Elasticsearch
    await indexEmailInEs(updatedRecord);
    console.log(`✅ Email ${emailScheduleId} sent successfully to ${recipientEmail}`);
  } catch (err: any) {
    console.error(`❌ Failed to process email schedule ${emailScheduleId}:`, err.message);
    await prisma.emailSchedule.update({
      where: { id: emailScheduleId },
      data: {
        status: 'FAILED',
        error: err.message,
      },
    });
  }
}

export function initWorker() {
  try {
    const worker = new Worker<ScheduleJobData>(
      EMAIL_QUEUE_NAME,
      async (job: Job<ScheduleJobData>) => {
        await processSingleEmailSchedule(job.data.emailScheduleId);
      },
      {
        connection: mockRedisClient as any,
        concurrency,
      }
    );

    worker.on('completed', (job) => console.log(`✅ BullMQ Job ${job.id} completed`));
    worker.on('failed', (job, err) => console.error(`❌ BullMQ Job ${job?.id} failed:`, err.message));
  } catch (err: any) {
    console.warn('⚠️ BullMQ worker connection warning:', err.message);
  }

  // Persistent Polling Loop to process due scheduled emails reliably
  setInterval(async () => {
    try {
      const dueSchedules = await prisma.emailSchedule.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: { lte: new Date() },
        },
        take: 10,
      });

      for (const schedule of dueSchedules) {
        await processSingleEmailSchedule(schedule.id);
      }
    } catch (err: any) {
      // ignore transient db lock
    }
  }, 3000);

  console.log(`🚀 Email Scheduler Worker initialized (Concurrency=${concurrency})`);
}
