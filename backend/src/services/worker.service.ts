import { Worker, Job } from 'bullmq';
import { redisOptions, redisClient } from '../config/redis';
import { EMAIL_QUEUE_NAME, ScheduleJobData, emailQueue } from './queue.service';
import { sendEmail } from './email.service';
import { prisma } from '../config/db';
import { indexEmailInEs } from './elasticsearch.service';
import { sendSlackRateLimitNotification } from './slack.service';

const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);

export function initWorker() {
  const worker = new Worker<ScheduleJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<ScheduleJobData>) => {
      const { emailScheduleId, senderEmail, recipientEmail, subject, bodyHtml, delayBetweenMs, maxEmailsPerHour } = job.data;

      console.log(`⚙️ Worker processing job ${job.id} for ${recipientEmail}`);

      // 1. Enforce inter-email minimum delay throttling
      const minDelay = Math.max(delayBetweenMs || 2000, parseInt(process.env.MIN_EMAIL_DELAY_MS || '2000', 10));
      await new Promise((resolve) => setTimeout(resolve, minDelay));

      // 2. Check Hourly Rate Limit in Redis (keyed by sender + hour window)
      const now = new Date();
      const windowKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}`;
      const rateLimitKey = `rate_limit:${senderEmail}:${windowKey}`;

      const currentCountStr = await redisClient.get(rateLimitKey);
      const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;
      const hourlyLimit = maxEmailsPerHour || parseInt(process.env.DEFAULT_MAX_EMAILS_PER_HOUR || '50', 10);

      if (currentCount >= hourlyLimit) {
        console.warn(`🛑 Hourly rate limit hit for sender ${senderEmail} (${currentCount}/${hourlyLimit} emails sent this hour). Rescheduling...`);

        // Calculate next hour window timestamp
        const nextWindow = new Date(now);
        nextWindow.setHours(nextWindow.getHours() + 1, 0, 0, 0);
        const delayMs = Math.max(5000, nextWindow.getTime() - Date.now());

        // Re-enqueue job for the next hour window
        const newJobId = `${emailScheduleId}_resched_${Date.now()}`;
        await emailQueue.add(
          'send-email-job',
          {
            ...job.data,
            scheduledAt: nextWindow.toISOString(),
          },
          {
            delay: delayMs,
            jobId: newJobId,
          }
        );

        // Update DB status to RESCHEDULED
        await prisma.emailSchedule.update({
          where: { id: emailScheduleId },
          data: {
            status: 'RESCHEDULED',
            scheduledAt: nextWindow,
          },
        });

        // Trigger live Slack notification
        await sendSlackRateLimitNotification(senderEmail, hourlyLimit, 1, nextWindow);

        return { status: 'RESCHEDULED', nextWindow };
      }

      // 3. Increment Redis rate limit counter
      const newCount = await redisClient.incr(rateLimitKey);
      if (newCount === 1) {
        await redisClient.expire(rateLimitKey, 3600); // 1 hour TTL
      }

      // 4. Send Email via Ethereal SMTP
      try {
        const sendResult = await sendEmail({
          from: senderEmail,
          to: recipientEmail,
          subject,
          html: bodyHtml,
        });

        // 5. Update DB record to SENT
        const updatedRecord = await prisma.emailSchedule.update({
          where: { id: emailScheduleId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            etherealMessageUrl: sendResult.previewUrl || null,
          },
        });

        // 6. Index email in Elasticsearch
        await indexEmailInEs(updatedRecord);

        return { status: 'SENT', messageId: sendResult.messageId, previewUrl: sendResult.previewUrl };
      } catch (sendError: any) {
        console.error(`❌ Email send failed for ${recipientEmail}:`, sendError.message);

        await prisma.emailSchedule.update({
          where: { id: emailScheduleId },
          data: {
            status: 'FAILED',
            error: sendError.message,
          },
        });

        throw sendError;
      }
    },
    {
      connection: redisOptions,
      concurrency,
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed with error:`, err.message);
  });

  console.log(`🚀 BullMQ Worker initialized with concurrency=${concurrency}`);
  return worker;
}
