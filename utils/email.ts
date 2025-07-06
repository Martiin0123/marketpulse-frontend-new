import { Recipient, EmailParams, MailerSend, Sender } from 'mailersend';

interface RefundRequestEmailData {
  requestId: string;
  userId: string;
  month: string;
  refundAmount: number;
  performance: number;
  positions: number;
  winRate: string;
  userEmail?: string;
}

// Initialize MailerSend
const mailersend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || '',
});

export async function sendRefundRequestEmail(data: RefundRequestEmailData) {
  try {
    // Debug logging for MailerSend configuration
    console.log('🔧 MailerSend Configuration Debug:', {
      hasApiKey: !!process.env.MAILERSEND_API_KEY,
      apiKeyLength: process.env.MAILERSEND_API_KEY?.length || 0,
      apiKeyPrefix: process.env.MAILERSEND_API_KEY?.substring(0, 10) + '...' || 'none',
      nodeEnv: process.env.NODE_ENV
    });

    // Check if MailerSend is properly configured
    if (!process.env.MAILERSEND_API_KEY) {
      console.error('❌ MAILERSEND_API_KEY is not set in environment variables');
      return false;
    }

    // Create sender and recipients
    const sender = new Sender('noreply@marketpulse.com', 'MarketPulse');
    const recipients = [
      new Recipient(data.userEmail || 'zangerl.martin@hotmail.com', 'Admin')
    ];

    // Create email parameters
    const emailParams = new EmailParams()
      .setFrom(sender)
      .setTo(recipients)
      .setSubject(`🔔 Performance Guarantee Refund Request - $${data.refundAmount.toFixed(2)}`)
      .setHtml(`
        <h2>Performance Guarantee Refund Request</h2>
        <p><strong>Request ID:</strong> ${data.requestId}</p>
        <p><strong>User ID:</strong> ${data.userId}</p>
        <p><strong>Refund Amount:</strong> $${data.refundAmount.toFixed(2)}</p>
        <p><strong>Performance:</strong> $${data.performance.toFixed(2)}</p>
        <p><strong>Positions:</strong> ${data.positions}</p>
        <p><strong>Win Rate:</strong> ${data.winRate}%</p>
        <p>This is a basic email test from MailerSend.</p>
      `)
      .setText(`
Performance Guarantee Refund Request

Request ID: ${data.requestId}
User ID: ${data.userId}
Refund Amount: $${data.refundAmount.toFixed(2)}
Performance: $${data.performance.toFixed(2)}
Positions: ${data.positions}
Win Rate: ${data.winRate}%

This is a basic email test from MailerSend.
      `);

    console.log('📧 Attempting to send email with MailerSend:', {
      from: 'noreply@marketpulse.com',
      to: data.userEmail || 'admin@marketpulse.com',
      subject: `🔔 Performance Guarantee Refund Request - $${data.refundAmount.toFixed(2)}`
    });

    const result = await mailersend.email.send(emailParams);
    
    console.log('📧 Refund request email sent via MailerSend:', result);
    return true;

  } catch (error: any) {
    console.error('❌ Error sending refund request email via MailerSend:', error);
    console.error('🔍 Full error details:', {
      message: error.message,
      status: error.status,
      response: error.response
    });
    
    return false;
  }
}

export async function sendWelcomeEmail(userEmail: string, userName?: string) {
  try {
    const sender = new Sender('noreply@marketpulse.com', 'MarketPulse');
    const recipients = [
      new Recipient(userEmail, userName || 'User')
    ];

    const emailParams = new EmailParams()
      .setFrom(sender)
      .setTo(recipients)
      .setSubject('🎉 Welcome to MarketPulse!')
      .setHtml(`
        <h2>Welcome to MarketPulse!</h2>
        <p>Hi ${userName || 'there'},</p>
        <p>Welcome to MarketPulse! We're excited to have you on board.</p>
        <p>This is a basic welcome email test from MailerSend.</p>
      `)
      .setText(`
Welcome to MarketPulse!

Hi ${userName || 'there'},

Welcome to MarketPulse! We're excited to have you on board.

This is a basic welcome email test from MailerSend.
      `);

    const result = await mailersend.email.send(emailParams);
    console.log('📧 Welcome email sent via MailerSend:', result);
    return true;
  } catch (error) {
    console.error('❌ Error sending welcome email via MailerSend:', error);
    return false;
  }
}

export async function sendRefundProcessedEmail(userEmail: string, refundAmount: number, month: string) {
  try {
    const sender = new Sender('noreply@marketpulse.com', 'MarketPulse');
    const recipients = [
      new Recipient(userEmail, 'User')
    ];

    const emailParams = new EmailParams()
      .setFrom(sender)
      .setTo(recipients)
      .setSubject(`✅ Refund Processed - $${refundAmount.toFixed(2)}`)
      .setHtml(`
        <h2>Refund Processed</h2>
        <p>Good news! Your performance guarantee refund has been processed.</p>
        <p><strong>Amount:</strong> $${refundAmount.toFixed(2)}</p>
        <p><strong>Period:</strong> ${month}</p>
        <p>This is a basic refund processed email test from MailerSend.</p>
      `)
      .setText(`
Refund Processed

Good news! Your performance guarantee refund has been processed.

Amount: $${refundAmount.toFixed(2)}
Period: ${month}

This is a basic refund processed email test from MailerSend.
      `);

    const result = await mailersend.email.send(emailParams);
    console.log('📧 Refund processed email sent via MailerSend:', result);
    return true;
  } catch (error) {
    console.error('❌ Error sending refund processed email via MailerSend:', error);
    return false;
  }
}