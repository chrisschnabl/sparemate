# Stripe Setup Guide

This guide will walk you through setting up Stripe for your Sparemate subscription service.

## Step 1: Create a Stripe Account

1. Go to https://stripe.com
2. Click "Sign up" or "Start now"
3. Complete the registration process

## Step 2: Get Your API Keys

1. Go to https://dashboard.stripe.com/apikeys
2. You'll see two keys:
   - **Publishable key** (starts with `pk_test_`) - Not needed for this project
   - **Secret key** (starts with `sk_test_`) - Copy this!
3. Click "Reveal test key" for the Secret key
4. Copy the Secret key and save it for later

⚠️ **Important**: Keep your secret key private! Never commit it to Git or share it publicly.

## Step 3: Create a Product and Price

1. Go to https://dashboard.stripe.com/products
2. Click "Add product"
3. Fill in the details:
   - **Name**: Sparemate Weekly Subscription
   - **Description**: Instant notifications for new Spareroom listings
   - **Pricing model**: Standard pricing
   - **Price**: 10.00
   - **Currency**: GBP (£)
   - **Billing period**: Weekly
   - **Payment type**: Recurring
4. Click "Save product"
5. Copy the **Price ID** (starts with `price_`) - you'll need this!

## Step 4: Set Up Webhook (for Local Testing)

For local development, you'll use the Stripe CLI to forward webhooks to your local server.

### Install Stripe CLI

**macOS:**
```bash
brew install stripe/stripe-cli/stripe
```

**Windows:**
Download from https://github.com/stripe/stripe-cli/releases/latest

**Linux:**
```bash
wget https://github.com/stripe/stripe-cli/releases/download/v1.19.5/stripe_1.19.5_linux_x86_64.tar.gz
tar -xvf stripe_1.19.5_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin
```

### Login and Forward Webhooks

```bash
# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/webhook
```

This command will output a webhook signing secret (starts with `whsec_`) - copy this!

Keep this terminal window open while testing.

## Step 5: Set Up Webhook (for Production)

When you deploy to production:

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your webhook URL: `https://your-domain.vercel.app/api/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click "Add endpoint"
6. Copy the **Signing secret** (starts with `whsec_`)

## Step 6: Configure Environment Variables

Create a `.env.local` file in your project root:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your keys:

```env
# From Step 2
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx

# From Step 4 (local) or Step 5 (production)
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

# From Step 3
STRIPE_PRICE_ID=price_xxxxxxxxxxxx

# Your local URL (or production URL when deployed)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Step 7: Test the Payment Flow

1. Start your development server:
   ```bash
   npm run dev
   ```

2. In another terminal, start webhook forwarding (if testing locally):
   ```bash
   stripe listen --forward-to localhost:3000/api/webhook
   ```

3. Open http://localhost:3000 in your browser

4. Enter an email and click the subscription button

5. Use Stripe test cards:
   - **Card number**: 4242 4242 4242 4242
   - **Expiry**: Any future date (e.g., 12/25)
   - **CVC**: Any 3 digits (e.g., 123)
   - **ZIP**: Any 5 digits (e.g., 12345)

6. Complete the checkout

7. You should be redirected to the success page

8. Check your database:
   ```bash
   npm run view-users
   ```

## Switching to Production

When you're ready to go live:

1. Switch to **Live mode** in Stripe dashboard (toggle in top right)
2. Get your **Live API keys** (starts with `sk_live_`)
3. Create the same product in Live mode
4. Set up the webhook endpoint with your production URL
5. Update environment variables in Vercel with live keys

⚠️ **Never use test keys in production or live keys in development!**

## Useful Stripe Test Cards

- **Success**: 4242 4242 4242 4242
- **Requires authentication**: 4000 0025 0000 3155
- **Declined**: 4000 0000 0000 0002
- **Insufficient funds**: 4000 0000 0000 9995

## Troubleshooting

### Webhook not receiving events
- Make sure `stripe listen` is running for local testing
- Check that the webhook URL is correct in production
- Verify the signing secret matches your environment variable

### Payment succeeds but user not added to database
- Check the webhook endpoint logs in Stripe dashboard
- Verify database file permissions
- Check server logs for errors

### "Invalid API key" error
- Make sure you copied the full key including the `sk_test_` prefix
- Verify there are no extra spaces or quotes
- Check that the key is in the `.env.local` file

## Support

For Stripe-specific issues, check:
- Stripe documentation: https://stripe.com/docs
- Stripe support: https://support.stripe.com
