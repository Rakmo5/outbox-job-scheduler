import { Router, Request, Response } from 'express';
import multer from 'multer';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { prisma } from '../config/db';
import { addEmailToQueue } from '../services/queue.service';
import { indexEmailInEs } from '../services/elasticsearch.service';
import { processSingleEmailSchedule } from '../services/worker.service';
import { redisClient } from '../config/redis';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

router.post('/clear-rate-limits', async (req: Request, res: Response) => {
  try {
    const keys = await redisClient.keys('rate_limit:*');
    for (const k of keys) {
      await redisClient.del(k);
    }
    res.json({ message: 'Rate limit counters reset to 0' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/parse-csv', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const fileContent = req.file.buffer.toString('utf-8');
    const detectedEmails = new Set<string>();

    const matches = fileContent.match(EMAIL_REGEX);
    if (matches) {
      matches.forEach((email) => detectedEmails.add(email.toLowerCase().trim()));
    }

    const stream = Readable.from(fileContent);
    stream
      .pipe(csvParser())
      .on('data', (row: any) => {
        Object.values(row).forEach((val: any) => {
          if (typeof val === 'string') {
            const valMatches = val.match(EMAIL_REGEX);
            if (valMatches) {
              valMatches.forEach((e) => detectedEmails.add(e.toLowerCase().trim()));
            }
          }
        });
      })
      .on('end', () => {
        const emailsArray = Array.from(detectedEmails);
        console.log(`📄 CSV Parsed: ${emailsArray.length} lead emails detected.`);
        res.json({
          count: emailsArray.length,
          emails: emailsArray,
        });
      });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/schedule', async (req: Request, res: Response) => {
  try {
    const {
      senderEmail,
      recipients,
      subject,
      bodyHtml,
      bodyText,
      scheduledAt,
      delayBetweenMs,
      maxEmailsPerHour,
      userId,
      isSendNow,
    } = req.body;

    console.log(`\n=======================================================`);
    console.log(`📩 [API REQUEST] Schedule email batch received.`);
    console.log(`   Sender: ${senderEmail || 'oliver.brown@domain.io'}`);
    console.log(`   isSendNow: ${Boolean(isSendNow)}`);

    if (!recipients || !subject || !bodyHtml) {
      return res.status(400).json({ error: 'Missing required fields: recipients, subject, bodyHtml' });
    }

    let recipientList: string[] = [];
    if (Array.isArray(recipients)) {
      recipientList = recipients.map((r) => r.trim()).filter((r) => r.length > 0);
    } else if (typeof recipients === 'string') {
      recipientList = recipients.split(',').map((r) => r.trim()).filter((r) => r.length > 0);
    }

    recipientList = recipientList.map((r) => {
      if (!r.includes('@')) {
        return `${r}@example.com`;
      }
      return r;
    });

    if (recipientList.length === 0) {
      return res.status(400).json({ error: 'No valid recipient email addresses provided' });
    }

    const sender = senderEmail || 'oliver.brown@domain.io';
    const now = new Date();
    const scheduleTime = isSendNow
      ? now
      : (scheduledAt ? new Date(scheduledAt) : now);

    const delay = delayBetweenMs !== undefined ? parseInt(delayBetweenMs, 10) : 2000;
    const hourlyLimit = maxEmailsPerHour !== undefined ? parseInt(maxEmailsPerHour, 10) : 50;

    console.log(`   Hourly Limit: ${hourlyLimit} emails/hr | Inter-Email Delay: ${delay}ms`);

    const createdSchedules: any[] = [];

    for (let i = 0; i < recipientList.length; i++) {
      const recipient = recipientList[i];
      const targetTime = isSendNow ? now : new Date(scheduleTime.getTime() + i * delay);

      const scheduleRecord = await prisma.emailSchedule.create({
        data: {
          userId: userId || null,
          senderEmail: sender,
          recipientEmail: recipient,
          subject,
          bodyHtml,
          bodyText: bodyText || null,
          scheduledAt: targetTime,
          delayBetweenMs: delay,
          maxEmailsPerHour: hourlyLimit,
          status: 'SCHEDULED',
        },
      });

      console.log(`📌 [DB CREATED] Email ID: ${scheduleRecord.id} | Recipient: ${recipient}`);

      try {
        await addEmailToQueue({
          emailScheduleId: scheduleRecord.id,
          senderEmail: sender,
          recipientEmail: recipient,
          subject,
          bodyHtml,
          scheduledAt: targetTime.toISOString(),
          delayBetweenMs: delay,
          maxEmailsPerHour: hourlyLimit,
        });
      } catch (queueErr: any) {
        console.warn(`📌 Redis queue bypass for job ${scheduleRecord.id}`);
      }

      await indexEmailInEs(scheduleRecord);
      createdSchedules.push(scheduleRecord);
    }

    if (isSendNow) {
      (async () => {
        for (const schedule of createdSchedules) {
          await processSingleEmailSchedule(schedule.id);
        }
      })();
    }

    console.log(`=======================================================\n`);

    res.status(201).json({
      message: `Successfully scheduled ${createdSchedules.length} email(s)`,
      count: createdSchedules.length,
      schedules: createdSchedules,
    });
  } catch (error: any) {
    console.error('❌ Error scheduling emails:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/scheduled', async (req: Request, res: Response) => {
  try {
    const scheduledEmails = await prisma.emailSchedule.findMany({
      where: {
        status: { in: ['SCHEDULED', 'RESCHEDULED', 'PROCESSING'] },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    res.json({
      count: scheduledEmails.length,
      data: scheduledEmails,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sent', async (req: Request, res: Response) => {
  try {
    const sentEmails = await prisma.emailSchedule.findMany({
      where: {
        status: { in: ['SENT', 'FAILED'] },
      },
      orderBy: { sentAt: 'desc' },
    });

    res.json({
      count: sentEmails.length,
      data: sentEmails,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const email = await prisma.emailSchedule.findUnique({
      where: { id: req.params.id },
    });

    if (!email) {
      return res.status(404).json({ error: 'Email schedule not found' });
    }

    res.json(email);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
