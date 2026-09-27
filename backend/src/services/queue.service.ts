import { Queue } from 'bullmq';
import { redisOptions } from '../config/redis';

export const EMAIL_QUEUE_NAME = 'email-queue';

export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: false,
    removeOnFail: false,
  },
});

export interface ScheduleJobData {
  emailScheduleId: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  bodyHtml: string;
  scheduledAt: string;
  delayBetweenMs: number;
  maxEmailsPerHour: number;
}

export async function addEmailToQueue(jobData: ScheduleJobData) {
  const targetTime = new Date(jobData.scheduledAt).getTime();
  const now = Date.now();
  const delay = Math.max(0, targetTime - now);

  const job = await emailQueue.add(
    'send-email-job',
    jobData,
    {
      delay,
      jobId: jobData.emailScheduleId,
    }
  );

  console.log(`📌 Enqueued email job ${job.id} for ${jobData.recipientEmail} with ${delay}ms delay`);
  return job;
}
