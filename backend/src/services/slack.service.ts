import axios from 'axios';
import { prisma } from '../config/db';

export async function sendSlackRateLimitNotification(senderEmail: string, hourlyLimit: number, deferredJobsCount: number, nextWindowTime: Date) {
  try {
    let webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
      const userWithSlack = await prisma.user.findFirst({
        where: { slackWebhookUrl: { not: null } },
      });
      if (userWithSlack && userWithSlack.slackWebhookUrl) {
        webhookUrl = userWithSlack.slackWebhookUrl;
      }
    }

    if (!webhookUrl || webhookUrl.trim() === '') {
      console.log(`ℹ️ Slack notification skipped (No Slack webhook connected for rate limit hit on ${senderEmail}).`);
      return false;
    }

    const nextFormatted = nextWindowTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const payload = {
      text: `⚠️ *Hourly Rate Limit Reached for Sender: ${senderEmail}*`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚠️ ReachInbox Hourly Rate Limit Reached',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Sender:*\n\`${senderEmail}\``,
            },
            {
              type: 'mrkdwn',
              text: `*Hourly Limit:*\n\`${hourlyLimit} emails/hr\``,
            },
            {
              type: 'mrkdwn',
              text: `*Deferred Jobs:*\n\`${deferredJobsCount} pending job(s)\``,
            },
            {
              type: 'mrkdwn',
              text: `*Next Available Window:*\n\`${nextFormatted}\``,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '🚀 *ReachInbox Queue Engine*: Jobs rescheduled preserving strict execution order without losing any data.',
            },
          ],
        },
      ],
    };

    const response = await axios.post(webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    console.log(`🔔 Live Slack notification dispatched to Slack webhook! Status: ${response.status}`);
    return true;
  } catch (error: any) {
    console.error('❌ Failed to send Slack rate limit notification:', error.message);
    return false;
  }
}
