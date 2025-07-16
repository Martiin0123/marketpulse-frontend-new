# Pricing Analytics Tracking Guide

## Overview
Your pricing section now has comprehensive Amplitude analytics tracking to help you understand user behavior and optimize conversions.

## Events Being Tracked

### 1. **Pricing Section Viewed**
**When:** Component mounts and user views pricing section
**Data Captured:**
- `page_location`: Current page URL
- `user_authenticated`: Whether user is logged in
- `has_subscription`: Whether user has active subscription
- `current_plan`: Name of current subscription plan
- `products_available`: Number of pricing plans available
- `show_timer`: Whether countdown timer is displayed
- `show_header`: Whether pricing header is shown
- `show_guarantee`: Whether guarantee section is shown
- `timestamp`: Event timestamp

### 2. **Billing Interval Changed**
**When:** User switches between Monthly/Yearly billing
**Data Captured:**
- `interval`: New billing interval (month/year)
- `previous_interval`: Previous billing interval
- `page_location`: Current page URL
- `user_authenticated`: Whether user is logged in
- `savings_highlighted`: Whether savings badge was shown (yearly only)
- `timestamp`: Event timestamp

### 3. **Pricing Card Hovered**
**When:** User hovers over a pricing card
**Data Captured:**
- `plan_type`: Type of plan (free, premium, vip)
- `price_amount`: Price in dollars (converted from cents)
- `currency`: Currency code (e.g., "eur", "usd")
- `interval`: Billing interval (month/year)
- `is_popular`: Whether card has "Most Popular" badge
- `is_current_plan`: Whether this is user's current plan
- `page_location`: Current page URL
- `user_authenticated`: Whether user is logged in
- `timestamp`: Event timestamp

### 4. **Pricing Plan Clicked** (Main Event)
**When:** User clicks on any pricing plan button
**Data Captured:**
- `plan_type`: Type of plan clicked
- `user_authenticated`: Whether user is logged in
- `price_id`: Stripe price ID
- `amount`: Price in dollars (converted from cents)
- `currency`: Currency code
- `interval`: Billing interval
- `billing_interval`: Currently selected billing interval
- `page_location`: Current page URL
- `has_subscription`: Whether user has active subscription
- `current_plan`: Name of current subscription plan
- `timestamp`: Event timestamp

### 5. **Plan-Specific Events**
**When:** User clicks on specific plan types
**Events:**
- `Free Plan Selected`
- `Premium Plan Selected`
- `VIP Plan Selected`

**Data:** Same as "Pricing Plan Clicked" event

### 6. **Pricing CTA Clicked** (Conversion Funnel)
**When:** User clicks on any pricing button
**Data Captured:**
- All data from "Pricing Plan Clicked"
- `cta_text`: Button text ("Join Community", "Get Started", "Get VIP Access")
- `next_step`: Where user will be redirected ("pricing_page" or "signin_page")

## Analytics Insights You Can Gain

### 🎯 **Conversion Funnel Analysis**
1. **Pricing Section Viewed** → **Pricing Card Hovered** → **Pricing Plan Clicked**
2. Track drop-off rates at each stage
3. Identify which plans generate most interest (hovers)
4. See which plans convert best (clicks)

### 📊 **User Behavior Insights**
- **Popular Plans**: Which plans get most hovers/clicks
- **Billing Preference**: Monthly vs Yearly selection patterns
- **User Segmentation**: Authenticated vs anonymous user behavior
- **Page Performance**: Homepage vs dedicated pricing page conversion

### 💡 **Optimization Opportunities**
- **A/B Testing**: Test different pricing structures
- **UI/UX**: Identify friction points in pricing flow
- **Messaging**: See if guarantee/timer affects conversions
- **Plan Positioning**: Understand which plans resonate most

## How to View Analytics

### In Amplitude:
1. Go to **Analytics** → **Segmentation**
2. Select any of the events above
3. Group by properties like:
   - `plan_type`
   - `billing_interval`
   - `user_authenticated`
   - `page_location`

### Sample Queries:
```
Event: "Pricing Plan Clicked"
Group by: plan_type
Filter: user_authenticated = true
```

```
Event: "Pricing Section Viewed"
Group by: page_location
Time range: Last 7 days
```

## Next Steps

1. **Set up Amplitude Dashboard** with key pricing metrics
2. **Create Conversion Funnel** from view → hover → click
3. **Set up Alerts** for significant changes in conversion rates
4. **Monitor Plan Performance** to optimize pricing strategy

## Technical Notes

- All events use your existing Amplitude setup with EU server zone
- Events are automatically tracked - no additional setup needed
- Debug logging is enabled to help troubleshoot any issues
- All price amounts are converted from cents to dollars for easier analysis