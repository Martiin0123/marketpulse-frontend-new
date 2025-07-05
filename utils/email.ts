import nodemailer from 'nodemailer';

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

export async function sendRefundRequestEmail(data: RefundRequestEmailData) {
  try {
    // Create transporter (you'll need to configure this with your email service)
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">🔔 New Performance Guarantee Refund Request</h2>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Request Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Request ID:</td>
              <td style="padding: 8px 0;">${data.requestId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">User ID:</td>
              <td style="padding: 8px 0;">${data.userId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Month:</td>
              <td style="padding: 8px 0;">${data.month}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Refund Amount:</td>
              <td style="padding: 8px 0; color: #dc2626; font-weight: bold;">$${data.refundAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Performance:</td>
              <td style="padding: 8px 0; color: ${data.performance >= 0 ? '#059669' : '#dc2626'};">
                ${data.performance >= 0 ? '+' : ''}$${data.performance.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Total Positions:</td>
              <td style="padding: 8px 0;">${data.positions}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Win Rate:</td>
              <td style="padding: 8px 0;">${data.winRate}%</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; color: #92400e;">
            <strong>Action Required:</strong> Please review this refund request and process it manually if approved.
          </p>
        </div>

        <div style="margin-top: 20px; padding: 15px; background-color: #f9fafb; border-radius: 8px;">
          <p style="margin: 0; font-size: 14px; color: #6b7280;">
            This is an automated notification from your MarketPulse performance guarantee system.
          </p>
        </div>
      </div>
    `;

    const emailText = `
🔔 New Performance Guarantee Refund Request

Request ID: ${data.requestId}
User ID: ${data.userId}
Month: ${data.month}
Refund Amount: $${data.refundAmount.toFixed(2)}
Performance: ${data.performance >= 0 ? '+' : ''}$${data.performance.toFixed(2)}
Total Positions: ${data.positions}
Win Rate: ${data.winRate}%

Action Required: Please review this refund request and process it manually if approved.
    `;

    // Send email
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"MarketPulse" <noreply@marketpulse.com>',
      to: 'zangerl.martin@hotmail.com',
      subject: `🔔 Performance Guarantee Refund Request - $${data.refundAmount.toFixed(2)}`,
      text: emailText,
      html: emailHtml,
    });

    console.log('📧 Refund request email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error sending refund request email:', error);
    return false;
  }
} 