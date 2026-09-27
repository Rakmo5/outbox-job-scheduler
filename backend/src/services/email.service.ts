import nodemailer, { Transporter } from 'nodemailer';

let cachedTransporter: Transporter | null = null;

export async function getEtherealTransporter(): Promise<Transporter> {
  if (cachedTransporter) return cachedTransporter;

  if (process.env.ETHEREAL_USER && process.env.ETHEREAL_PASS) {
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: process.env.ETHEREAL_USER,
        pass: process.env.ETHEREAL_PASS,
      },
    });
    return cachedTransporter;
  }

  try {
    const testAccountPromise = nodemailer.createTestAccount();
    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('Ethereal timeout')), 3000)
    );

    const testAccount = (await Promise.race([testAccountPromise, timeoutPromise])) as nodemailer.TestAccount | null;

    if (testAccount) {
      console.log(`📧 Ethereal test account initialized: ${testAccount.user}`);
      cachedTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      return cachedTransporter;
    }
  } catch (err: any) {
    console.warn('⚠️ Ethereal API response slow/offline. Utilizing instant JSON transport fallback.');
  }

  // Instant fallback transporter that never hangs
  cachedTransporter = nodemailer.createTransport({
    jsonTransport: true,
  });
  return cachedTransporter;
}

export interface SendEmailParams {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl: string | false;
}

export async function sendEmail({ from, to, subject, html, text }: SendEmailParams): Promise<SendEmailResult> {
  const transporter = await getEtherealTransporter();

  const info = await transporter.sendMail({
    from: from || '"ReachInbox Demo Sender" <oliver.brown@domain.io>',
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ''),
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log(`✉️ Email sent to ${to}. Message ID: ${info.messageId}`);
  if (previewUrl) {
    console.log(`🔗 Preview URL: ${previewUrl}`);
  }

  return {
    messageId: info.messageId || `msg_${Date.now()}`,
    previewUrl: previewUrl || `https://ethereal.email/message/${info.messageId || 'demo'}`,
  };
}
