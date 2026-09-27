import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface EmailScheduleItem {
  id: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  bodyHtml: string;
  scheduledAt: string;
  delayBetweenMs: number;
  maxEmailsPerHour: number;
  status: 'SCHEDULED' | 'SENT' | 'FAILED' | 'RESCHEDULED';
  sentAt?: string | null;
  etherealMessageUrl?: string | null;
  error?: string | null;
  createdAt: string;
}

export const fetchScheduledEmails = async (): Promise<EmailScheduleItem[]> => {
  const res = await api.get('/emails/scheduled');
  return res.data.data;
};

export const fetchSentEmails = async (): Promise<EmailScheduleItem[]> => {
  const res = await api.get('/emails/sent');
  return res.data.data;
};

export const searchEmails = async (query: string, status?: string): Promise<EmailScheduleItem[]> => {
  const res = await api.get('/search', { params: { q: query, status } });
  return res.data.data;
};

export const scheduleEmailBatch = async (payload: {
  senderEmail: string;
  recipients: string[];
  subject: string;
  bodyHtml: string;
  scheduledAt: string;
  delayBetweenMs: number;
  maxEmailsPerHour: number;
}) => {
  const res = await api.post('/emails/schedule', payload);
  return res.data;
};

export const parseCsvFile = async (file: File): Promise<{ count: number; emails: string[] }> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/emails/parse-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const connectSlackWebhook = async (webhookUrl: string) => {
  const res = await api.post('/slack/webhook', { webhookUrl });
  return res.data;
};

export const getSlackStatus = async () => {
  const res = await api.get('/slack/status');
  return res.data;
};
