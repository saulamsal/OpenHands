# Stripe Setup Guide for OpenHands SaaS

## Quick Start

1. **Create a Stripe Account**
   - Go to https://stripe.com and sign up
   - For testing, use the test mode (toggle in dashboard)

2. **Get Your API Keys**
   - Go to https://dashboard.stripe.com/apikeys
   - Copy your test keys:
     - Secret key: `sk_test_...`
     - Publishable key: `pk_test_...`

3. **Configure Environment Variables**
   Add these to your `.env` file:
   ```
   STRIPE_SECRET_KEY=sk_test_your_test_secret_key
   STRIPE_PUBLISHABLE_KEY=pk_test_your_test_publishable_key
   ```

4. **Set Up Webhook (Optional for now)**
   - Go to https://dashboard.stripe.com/webhooks
   - Add endpoint: `https://yourdomain.com/api/billing/webhook`
   - Select events: `checkout.session.completed`, `customer.subscription.created`
   - Copy webhook secret to `STRIPE_WEBHOOK_SECRET` in `.env`

## Testing

Use these test card numbers:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires authentication: `4000 0025 0000 3155`

Any future date for expiry, any 3 digits for CVC, any ZIP code.

## Production Checklist

- [ ] Switch to live API keys
- [ ] Set up proper webhook endpoints
- [ ] Configure subscription products in Stripe
- [ ] Set up customer portal
- [ ] Enable tax collection if needed
- [ ] Configure fraud protection rules

## Current Implementation

The billing system currently supports:
- Creating Stripe customers
- Setting up payment methods
- Creating checkout sessions for credit purchases
- Basic balance tracking (needs database tables)

## Next Steps

1. Create database tables for:
   - User subscriptions
   - Credit balances
   - Transaction history

2. Implement webhook handlers for:
   - Successful payments
   - Subscription updates
   - Failed payments

3. Add subscription plans in Stripe dashboard
4. Implement usage-based billing if needed