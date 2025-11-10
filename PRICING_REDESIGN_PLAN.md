# Pricing Redesign Plan: Two Product System

## Overview
Redesign the pricing section to offer two separate products:
1. **Trading Signals Bot** - AI-powered trading signals
2. **Trading Journal with TradeSyncer** - Advanced journal with copy trading

## Current Setup

### Database Structure
- `products` table - Stores product information (synced from Stripe)
- `prices` table - Stores pricing tiers (monthly/yearly) linked to products
- `subscriptions` table - User subscriptions linked to prices
- Products are identified by `name` field (e.g., "Premium", "VIP")

### Access Control
- Currently checks if product name includes "premium" or "vip"
- Used in: dashboard access, Discord callback, Bybit whitelist

## Implementation Plan

### 1. Product Structure in Stripe
Create two product categories in Stripe:

**Trading Signals Bot:**
- Product: "Trading Signals Premium" / "Trading Signals VIP"
- Metadata: `{ "product_type": "signals", "category": "signals" }`

**Trading Journal:**
- Product: "Trading Journal Pro" / "Trading Journal Enterprise"
- Metadata: `{ "product_type": "journal", "category": "journal" }`

### 2. Database Changes
- Use `products.metadata` field to store product type
- Add helper functions to check subscription access by product type

### 3. Pricing Page Updates
- Create tabbed interface or two-column layout
- Show "Trading Signals" products in one section
- Show "Trading Journal" products in another section
- Allow users to subscribe to either or both

### 4. Access Control Updates
- Update access checks to look for specific product types
- Dashboard: Requires "signals" product
- Journal: Requires "journal" product
- Copy Trading: Requires "journal" product

### 5. Subscription Management
- Users can have multiple active subscriptions (one for each product type)
- Update subscription fetching to handle multiple product types
- Show subscription status for each product separately

## Files to Modify

1. `app/pricing/page.tsx` - Update to show two product categories
2. `components/ui/PricingPlans/PricingPlans.tsx` - Add product category filtering
3. `utils/supabase/queries.ts` - Add helper functions for product type checking
4. Access control files - Update to check specific product types

## Helper Functions Needed

```typescript
// Check if user has signals subscription
hasSignalsAccess(subscription)

// Check if user has journal subscription  
hasJournalAccess(subscription)

// Get all user subscriptions grouped by product type
getSubscriptionsByType(userId)
```

