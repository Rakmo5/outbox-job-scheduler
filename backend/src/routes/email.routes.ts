import { Router, Request, Response } from 'express';
import multer from 'multer';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { prisma } from '../config/db';
import { addEmailToQueue } from '../services/queue.service';
import { indexEmailInEs } from '../services/elasticsearch.service';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

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
    } = req.body;

    if (!recipients || !subject || !bodyHtml) {
      return res.status(400).json({ error: 'Missing required fields: recipients, subject, bodyHtml' });
    }

    let recipientList: string[] = [];
    if (Array.isArray(recipients)) {
      recipientList = recipients.map((r) => r.trim()).filter((r) => r.length > 0);
    } else if (typeof recipients === 'string') {
      recipientList = recipients.split(',').map((r) => r.trim()).filter((r) => r.length > 0);
    }

    if (recipientList.length === 0) {
      return res.status(400).json({ error: 'No valid recipient email addresses provided' });
    }

    const sender = senderEmail || 'oliver.brown@domain.io';
    const scheduleTime = scheduledAt ? new Date(scheduledAt) : new Date();
    const delay = delayBetweenMs !== undefined ? parseInt(delayBetweenMs, 10) : 2000;
    const hourlyLimit = maxEmailsPerHour !== undefined ? parseInt(maxEmailsPerHour, 10) : 50;

    const createdSchedules: any[] = [];

    for (let i = 0; i < recipientList.length; i++) {
      const recipient = recipientList[i];
      const targetTime = new Date(scheduleTime.getTime() + i * delay);

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

      await indexEmailInEs(scheduleRecord);

      createdSchedules.push(scheduleRecord);
    }

    res.status(201).json({
      message: `Successfully scheduled ${createdSchedules.length} email(s)`,
      count: createdSchedules.length,
      schedules: createdSchedules,
    });
  } catch (error: any) {
    console.error('Error scheduling emails:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/scheduled', async (req: Request, res: Response) => {
  try {
    const scheduledEmails = await prisma.emailSchedule.findMany({
      where: {
        status: { in: ['SCHEDULED', 'RESCHEDULED'] },
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
