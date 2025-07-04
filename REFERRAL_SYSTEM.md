# Referral System Implementation

## Overview

This document describes the complete referral system implementation for the MarketPulse platform. The system tracks referrals, manages payouts with a 1-month waiting period, and handles subscription lifecycle events.

## Database Schema

### Core Tables

#### `referral_codes`

- Stores unique referral codes for each user
- Tracks clicks and conversions
- Fields: `id`, `user_id`, `code`, `clicks`, `conversions`, `is_active`, `created_at`, `updated_at`

#### `referrals`

- Tracks individual referral relationships
- Manages status transitions: pending → subscribed → active → cancelled
- Fields: `id`, `referrer_id`, `referee_id`, `referral_code`, `status`, `subscribed_at`, `eligible_at`, `cancelled_at`, `subscription_id`, `reward_amount`, `reward_currency`, `created_at`, `updated_at`

#### `referral_rewards`

- Manages payout tracking with status: pending → eligible → paid → cancelled
- Fields: `id`, `referral_id`, `user_id`, `amount`, `currency`, `status`, `reward_type`, `stripe_transfer_id`, `eligible_at`, `paid_at`, `created_at`

#### `referral_clicks`

- Analytics table for tracking referral link clicks
- Fields: `id`, `referral_code`, `ip_address`, `user_agent`, `clicked_at`

### Status Flow

#### Referral Status

1. **pending**: User registered with referral code, but hasn't subscribed yet
2. **subscribed**: User has subscribed, waiting for 1-month period
3. **active**: 1-month period completed, eligible for payout
4. **cancelled**: Subscription cancelled/refunded within 1 month

#### Reward Status

1. **pending**: Created when user subscribes, waiting for 1-month period
2. **eligible**: 1-month period completed, ready for payout
3. **paid**: Payout completed via Stripe
4. **cancelled**: Cancelled due to refund/cancellation within 1 month

## API Endpoints

### Referral Tracking

- `POST /api/referrals/track` - Track referral link clicks
- `GET /api/referrals/list` - List user's referrals
- `GET /api/referrals/stats` - Get referral statistics

### Cron Jobs

- `POST /api/cron/check-referral-payouts` - Daily check for eligible payouts

### Webhooks

- `POST /api/webhook/stripe` - Handle Stripe subscription events

## Workflow

### 1. User Registration with Referral

1. User visits `/ref/:code`
2. Referral code is stored in cookie/URL param
3. During signup, referral relationship is created with status 'pending'

### 2. Subscription Event

1. Stripe webhook `checkout.session.completed` triggers
2. Referral status updated to 'subscribed'
3. Pending reward created with €39 amount

### 3. 1-Month Waiting Period

1. Daily cron job checks for eligible rewards
2. After 1 month, rewards become 'eligible'
3. Referral status updated to 'active'

### 4. Payout Processing

1. Eligible rewards can be processed via Stripe transfers
2. Status updated to 'paid' when transfer completes

### 5. Cancellation Handling

1. Stripe webhooks detect subscription cancellations/refunds
2. Pending rewards are cancelled
3. Referral status updated to 'cancelled'

## Database Functions

### `check_eligible_rewards()`

- Called daily via cron job
- Updates rewards from 'pending' to 'eligible' after 1 month
- Updates referral status from 'subscribed' to 'active'

### `get_referral_stats(user_id)`

- Returns referral statistics for dashboard
- Calculates total earnings, pending amounts, clicks, etc.

### Triggers

- `update_referral_on_subscription()` - Auto-updates referral when subscription created
- `cancel_referral_rewards()` - Auto-cancels rewards when subscription cancelled

## Dashboard Features

### `/referrals` Page Shows:

- **Total Earnings**: Sum of all paid rewards
- **Pending Amount**: Sum of eligible rewards waiting for payout
- **Total Clicks**: Number of times referral link was clicked
- **Pending Referrals**: Users who registered but haven't subscribed
- **Active Referrals**: Users eligible for payout

## Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CRON_SECRET_TOKEN=your-secret-token
```

## Setup Instructions

1. **Run Migration**: Apply the SQL migration to update schema
2. **Configure Stripe Webhooks**: Point to `/api/webhook/stripe`
3. **Set Up Cron Job**: Configure daily call to `/api/cron/check-referral-payouts`
4. **Update Frontend**: Implement referral tracking and dashboard

## Security Considerations

- Webhook signature verification
- Cron job authentication
- Rate limiting on referral endpoints
- Input validation for referral codes

## Monitoring

- Track webhook delivery success/failure
- Monitor cron job execution
- Log referral status transitions
- Alert on payout processing errors
