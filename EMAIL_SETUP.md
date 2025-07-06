# Email Setup Guide - MailerSend

This guide will help you configure email notifications using MailerSend.

## Environment Variables

Add the following variable to your `.env.local` file:

```bash
# MailerSend Configuration
MAILERSEND_API_KEY=your-mailersend-api-key
```

## MailerSend Setup

1. **Create a MailerSend account** at https://www.mailersend.com/
2. **Get your API key** from the MailerSend dashboard
3. **Add your domain** to MailerSend (optional but recommended)
4. **Use the API key** in your environment variables

## Getting Your API Key

1. **Sign up** at https://www.mailersend.com/
2. **Go to your dashboard**
3. **Navigate to Settings → API Keys**
4. **Create a new API key** or use the default one
5. **Copy the API key** and add it to your `.env.local` file

## Testing

1. **Start the application** with the new configuration
2. **Request a refund** from the Performance Guarantee tab
3. **Check the logs** for email sending status
4. **Verify** that you receive the email notification

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify your API key is correct
   - Check that the API key is properly set in environment variables
   - Ensure the API key has the necessary permissions

2. **Email Not Received**
   - Check spam/junk folder
   - Verify the recipient email address
   - Check MailerSend dashboard for delivery status

3. **Domain Issues**
   - If using a custom domain, ensure it's properly configured in MailerSend
   - For testing, you can use the default MailerSend domain

### Debug Information

The application will log detailed information about:

- MailerSend configuration status
- API key validation
- Email sending attempts
- Any errors encountered

## Security Notes

- Never commit your `.env.local` file to version control
- Use environment-specific API keys
- Regularly rotate your API keys
- Monitor your MailerSend usage

## Migration from Previous Email Services

The system now uses MailerSend instead of previous email services:

- ✅ Simple API key configuration
- ✅ Reliable delivery
- ✅ Good deliverability rates
- ✅ Comprehensive analytics
- ✅ Easy setup and management

## Basic Email Test

The current implementation sends basic emails for testing. Once you confirm the basic emails work, we can enhance them with better design and formatting.
