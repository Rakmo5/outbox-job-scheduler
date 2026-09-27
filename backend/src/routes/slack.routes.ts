import { Router, Request, Response } from 'express';
import { prisma } from '../config/db';
import axios from 'axios';

const router = Router();

router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { webhookUrl, email } = req.body;

    if (!webhookUrl || typeof webhookUrl !== 'string') {
      return res.status(400).json({ error: 'Valid Slack Webhook URL is required' });
    }

    process.env.SLACK_WEBHOOK_URL = webhookUrl;

    const userEmail = email || 'oliver.brown@domain.io';

    let user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (user) {
      user = await prisma.user.update({
        where: { email: userEmail },
        data: { slackWebhookUrl: webhookUrl },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: userEmail,
          name: 'Oliver Brown',
          slackWebhookUrl: webhookUrl,
        },
      });
    }

    try {
      await axios.post(webhookUrl, {
        text: '🟢 *Slack Connection Successful!* ReachInbox Email Scheduler is now connected to this channel for rate limit alerts.',
      });
    } catch (testErr: any) {
      console.warn('Slack verification ping failed:', testErr.message);
    }

    res.json({
      message: 'Slack webhook connected successfully',
      slackWebhookUrl: user.slackWebhookUrl,
      connected: true,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    process.env.SLACK_WEBHOOK_URL = '';

    await prisma.user.updateMany({
      data: { slackWebhookUrl: null },
    });

    res.json({
      message: 'Slack disconnected',
      connected: false,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/status', async (req: Request, res: Response) => {
  try {
    let webhook = process.env.SLACK_WEBHOOK_URL;
    if (!webhook) {
      const user = await prisma.user.findFirst({
        where: { slackWebhookUrl: { not: null } },
      });
      if (user) webhook = user.slackWebhookUrl || undefined;
    }

    res.json({
      connected: Boolean(webhook && webhook.length > 0),
      webhookUrl: webhook || null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
