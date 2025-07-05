# Email Notification Setup

To receive email notifications for refund requests, you need to configure SMTP settings in your `.env.local` file.

## Required Environment Variables

Add these to your `.env.local` file:

```bash
# Email Configuration for Refund Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=martin.ischgl@gmail.com
SMTP_PASS='mjmn giwx llml stsy'
SMTP_FROM=Primescope <noreply@primescope.com>
```

## Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
3. **Use the app password** as `SMTP_PASS`

## Alternative Email Services

### Outlook/Hotmail

```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
```

### SendGrid

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
```

## Testing

Once configured, when a user requests a refund, you'll receive an email to `zangerl.martin@hotmail.com` with:

- Request ID
- User details
- Performance data
- Refund amount
- Action required notice

## Security Notes

- Never commit your `.env.local` file to version control
- Use app passwords instead of your main password
- Consider using a dedicated email service for production
