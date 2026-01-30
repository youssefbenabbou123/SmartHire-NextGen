import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

interface EmailRequest {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, html, text, cc, bcc } = req.body as EmailRequest;

    // Validate required fields
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ 
        error: 'Missing required fields: to, subject, and html/text are required' 
      });
    }

    // Get SMTP configuration from environment variables
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;

    if (!smtpUser || !smtpPassword) {
      return res.status(500).json({ 
        error: 'SMTP configuration missing. Please set SMTP_USER and SMTP_PASSWORD in environment variables.' 
      });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    // Verify connection
    await transporter.verify();

    // Prepare email options
    const mailOptions = {
      from: `"Capgemini Smart Hire" <${smtpUser}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html: html || undefined,
      text: text || undefined,
      cc: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : undefined,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    return res.status(200).json({ 
      success: true,
      messageId: info.messageId,
      message: 'Email sent successfully' 
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return res.status(500).json({ 
      error: 'Failed to send email',
      details: error.message 
    });
  }
}
