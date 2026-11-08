const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  async initTransporter() {
    // If custom SMTP credentials are provided in .env
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      console.log(`[Email Service] Configured with SMTP host: ${process.env.SMTP_HOST}`);
      return;
    }

    // Fallback: Use Ethereal test account or local logging transporter
    try {
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log(`[Email Service] Test transporter ready (Ethereal test user: ${testAccount.user})`);
    } catch (err) {
      console.warn('[Email Service] Could not create Ethereal test account, will use console logging fallback');
      this.transporter = null;
    }
  }

  /**
   * Send a collaboration invite email to another Event Creator
   */
  async sendCollaborationInvite({ toEmail, senderName, senderEmail, eventName, eventDate, message }) {
    const subject = `🤝 Collaboration Request: "${eventName}" from ${senderName}`;
    const formattedDate = eventDate ? new Date(eventDate).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }) : 'Scheduled Event';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
          .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 28px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { margin: 6px 0 0; opacity: 0.9; font-size: 13px; }
          .content { padding: 28px; }
          .event-card { background: #f1f5f9; border-radius: 12px; padding: 18px; margin: 20px 0; border-left: 4px solid #4f46e5; }
          .event-card h3 { margin: 0 0 6px; font-size: 16px; color: #0f172a; }
          .event-card p { margin: 3px 0; font-size: 13px; color: #475569; }
          .note-box { background: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #92400e; font-style: italic; }
          .cta-area { text-align: center; margin: 28px 0 12px; }
          .cta-btn { display: inline-block; background: #4f46e5; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3); }
          .footer { padding: 16px 28px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🤝 Collaboration Invitation</h1>
            <p>Event Operations Management System</p>
          </div>
          <div class="content">
            <p style="font-size: 15px; line-height: 1.5;">
              Hello,
            </p>
            <p style="font-size: 14px; line-height: 1.5; color: #334155;">
              Event Creator <strong>${senderName}</strong> (<em>${senderEmail}</em>) has invited you to collaborate and share volunteer resources on their event:
            </p>
            
            <div class="event-card">
              <h3>🎯 ${eventName}</h3>
              <p>📅 <strong>Date:</strong> ${formattedDate}</p>
              <p>👥 <strong>Collaboration:</strong> Volunteer pool sharing & co-management</p>
            </div>

            ${message ? `
              <div class="note-box">
                <strong>Message from ${senderName}:</strong><br>
                "${message}"
              </div>
            ` : ''}

            <p style="font-size: 13px; color: #475569;">
              When you log into your EventOps account, an invitation prompt will appear allowing you to review, accept, or decline this collaboration.
            </p>

            <div class="cta-area">
              <a href="http://localhost:5173" class="cta-btn">Log In & Review Collaboration</a>
            </div>
          </div>
          <div class="footer">
            Sent by EventOps • Automated Collaboration Notification • Please do not reply directly to this email.
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      if (!this.transporter) {
        await this.initTransporter();
      }

      if (this.transporter) {
        const info = await this.transporter.sendMail({
          from: `"EventOps Collaboration" <${process.env.SMTP_FROM || 'noreply@eventops.system'}>`,
          to: toEmail,
          subject,
          html: htmlContent
        });

        console.log(`[Email Service] Collaboration invite sent to ${toEmail}. MessageId: ${info.messageId}`);
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          console.log(`[Email Service] ✉️ Email Preview URL: ${previewUrl}`);
        }
        return { success: true, messageId: info.messageId, previewUrl };
      } else {
        // Fallback console log
        console.log(`[Email Service] [MOCK EMAIL DISPATCH] To: ${toEmail} | Subject: ${subject}`);
        return { success: true, mock: true };
      }
    } catch (err) {
      console.error('[Email Service] Error sending collaboration email:', err.message);
      return { success: false, error: err.message };
    }
  }
}

module.exports = new EmailService();

