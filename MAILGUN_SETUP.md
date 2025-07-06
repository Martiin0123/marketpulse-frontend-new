# Mailgun Setup Guide

## 🚀 Getting Started with Mailgun

### 1. Create Mailgun Account

1. Go to [mailgun.com](https://mailgun.com)
2. Sign up for a free account
3. Verify your email address

### 2. Add Your Domain

1. In Mailgun dashboard, go to "Sending" → "Domains"
2. Click "Add New Domain"
3. Choose "Custom Domain" (recommended) or use Mailgun's sandbox domain
4. Follow the DNS configuration instructions

### 3. Get Your API Key

1. Go to "Settings" → "API Keys"
2. Copy your Private API Key
3. Keep this secure - never commit it to version control

**⚠️ API Key Format:**

- **Correct format**: `key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Example**: `key-6d5bd527-9a28accd-12345678-abcdef12`
- **Your key**: `6d5bd527-9a28accd` (missing `key-` prefix)

**To verify your API key:**

1. Go to Mailgun dashboard → "Settings" → "API Keys"
2. Look for the "Private API Key" section
3. The key should start with `key-`
4. If it doesn't, you might be looking at a different field

### 4. Environment Variables

Add these to your `.env.local` file:

```env
# Mailgun Configuration
MAILGUN_API_KEY=key-6d5bd527-9a28accd-xxxxxxxx-xxxxxxxx
MAILGUN_DOMAIN=your-domain.com
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Note**: Make sure to include the `key-` prefix in your API key!

### 5. Domain Configuration (if using custom domain)

#### DNS Records to Add:

```
Type: TXT
Name: @
Value: v=spf1 include:mailgun.org ~all
```

```
Type: CNAME
Name: email
Value: mxa.mailgun.org
```

```
Type: CNAME
Name: email
Value: mxb.mailgun.org
```

### 6. Testing Your Setup

You can test the email functionality by:

1. **Testing the refund request email:**
   - Go to your performance guarantee page
   - Request a refund (if eligible)
   - Check your email for the notification

2. **Testing welcome emails:**
   - Create a new user account
   - The welcome email will be sent automatically

### 7. Email Templates Available

The system now includes these email templates:

- **Refund Request Notifications**: Sent to admin when users request refunds
- **Welcome Emails**: Sent to new users
- **Refund Processed Emails**: Sent to users when refunds are processed

### 8. Production Considerations

For production deployment:

1. **Use a custom domain** instead of Mailgun's sandbox
2. **Set up proper SPF/DKIM records** for better deliverability
3. **Monitor email logs** in Mailgun dashboard
4. **Set up webhooks** for delivery tracking (optional)

### 9. Troubleshooting

#### Common Issues:

1. **"Invalid API key"**
   - Check your MAILGUN_API_KEY environment variable
   - Ensure the key is correct and active

2. **"Domain not found"**
   - Verify your MAILGUN_DOMAIN environment variable
   - Ensure the domain is properly configured in Mailgun

3. **Emails not sending**
   - Check Mailgun logs in the dashboard
   - Verify your domain's DNS records
   - Check server logs for error messages

### 10. Mailgun Free Tier Limits

- **5,000 emails per month** for first 3 months
- **100 emails per day** after 3 months
- Perfect for testing and small-scale usage

### 11. Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate API keys** regularly
4. **Monitor email logs** for suspicious activity

### 12. Next Steps

Once configured, you can:

1. **Customize email templates** in `utils/email.ts`
2. **Add more email types** as needed
3. **Set up email tracking** and analytics
4. **Implement email preferences** for users

## 📧 Email Functions Available

```typescript
// Send refund request notification
await sendRefundRequestEmail({
  requestId: '123',
  userId: 'user-id',
  month: '2025-07',
  refundAmount: 29.99,
  performance: -150.5,
  positions: 15,
  winRate: '60.0'
});

// Send welcome email
await sendWelcomeEmail('user@example.com', 'John Doe');

// Send refund processed confirmation
await sendRefundProcessedEmail('user@example.com', 29.99, '2025-07');
```

## 🎯 Benefits of Mailgun

- **High deliverability** rates
- **Detailed analytics** and logs
- **Webhook support** for real-time tracking
- **Template management** (optional)
- **Rate limiting** and spam protection
- **Professional email infrastructure**
