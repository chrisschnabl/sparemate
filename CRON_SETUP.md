# Cron Job Setup Guide

This guide explains how to set up the automated notification system that checks for new SpareRoom listings every 5 minutes.

## Overview

The cron job system:
- Runs automatically every 5 minutes via Vercel Cron
- Fetches all active subscribers from the database
- Checks each user's custom SpareRoom URL for new listings
- Sends email notifications via Resend when new properties are found
- Tracks the last seen listing to avoid duplicate notifications

## Prerequisites

Before setting up the cron job, ensure you have:
1. ✅ Stripe integration working (users can subscribe)
2. ✅ Users in database with active subscriptions
3. ✅ Users have provided their SpareRoom search URLs

## Step 1: Set Up Resend Email Service

### Create a Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account (3,000 emails/month included)
3. Verify your email address

### Get Your API Key

1. Go to [API Keys](https://resend.com/api-keys)
2. Click "Create API Key"
3. Name it "Sparemate Production" (or similar)
4. Select "Full Access" permissions
5. Copy the API key (starts with `re_`)

### Configure Your Domain (Optional but Recommended)

For production, you should verify your domain:

1. Go to [Domains](https://resend.com/domains)
2. Click "Add Domain"
3. Enter your domain (e.g., `sparemate.com`)
4. Add the DNS records provided by Resend
5. Wait for verification (usually takes a few minutes)

**Note:** For testing, you can use the default Resend domain, but emails may be marked as spam.

### Update Email Sender

If you verified a custom domain, update the "from" address in `lib/email.ts`:

```typescript
from: 'Sparemate <notifications@yourdomain.com>',
```

## Step 2: Generate Cron Secret

The cron endpoint needs to be protected from unauthorized access. Generate a secure random secret:

```bash
openssl rand -base64 32
```

Copy the output - you'll need it for environment variables.

## Step 3: Configure Environment Variables

### Local Development

Update your `.env.local` file:

```bash
# Add these new variables
RESEND_API_KEY=re_your_actual_api_key_here
CRON_SECRET=your_generated_secret_here
```

### Vercel Production

Add the environment variables in your Vercel project:

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

| Name | Value | Environment |
|------|-------|-------------|
| `RESEND_API_KEY` | `re_...` (your Resend API key) | Production, Preview, Development |
| `CRON_SECRET` | `your-secret-key` (generated secret) | Production, Preview, Development |

Make sure all other variables are also set:
- `STRIPE_SECRET_KEY` (live key for production)
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID`
- `NEXT_PUBLIC_BASE_URL` (your production URL)

## Step 4: Deploy to Vercel

### Option 1: Deploy via Git

1. Commit all changes:
   ```bash
   git add .
   git commit -m "Add cron job notification system"
   git push
   ```

2. Vercel will automatically deploy when you push to your main branch

### Option 2: Deploy via Vercel CLI

```bash
vercel --prod
```

## Step 5: Verify Cron Job is Running

### Check Vercel Dashboard

1. Go to your project in Vercel Dashboard
2. Click on **Deployments**
3. Find your latest deployment
4. Click on **Functions** tab
5. You should see `/api/cron` listed
6. After 5 minutes, check the function logs

### Monitor Cron Execution

1. Go to **Logs** in your Vercel Dashboard
2. Filter by `/api/cron`
3. You should see logs every 5 minutes showing:
   ```
   🔄 Cron job started at [timestamp]
   📊 Found X active user(s)
   🔍 Checking listings for user@example.com...
   ✅ Cron job completed
   ```

### Check Email Delivery

1. Wait for a new listing to be posted on SpareRoom
2. Within 5 minutes, the cron job should detect it
3. Subscribers should receive an email notification
4. Check Resend Dashboard → **Logs** to see sent emails

## Step 6: Testing the Cron Job Locally

To test the cron job on your local machine:

```bash
# Make sure your .env.local is configured
npm run dev

# In another terminal, trigger the cron job manually:
curl http://localhost:3000/api/cron \
  -H "Authorization: Bearer your-cron-secret-here"
```

You should see output showing:
- Active users found
- SpareRoom URLs being checked
- New listings detected (if any)
- Emails sent

## Troubleshooting

### No Emails Being Sent

**Check 1: Verify Resend API Key**
```bash
# Test your API key
curl https://api.resend.com/domains \
  -H "Authorization: Bearer re_your_api_key"
```

**Check 2: Check Vercel Logs**
- Go to Vercel Dashboard → Logs
- Look for errors in `/api/cron` execution
- Common errors:
  - "RESEND_API_KEY is not configured"
  - "Invalid API key"

**Check 3: Verify Email Template**
- Check Resend Dashboard → Logs
- Look for failed email attempts
- Check spam folder in recipient's email

### Cron Job Not Running

**Check 1: Verify vercel.json**
Ensure `vercel.json` has the cron configuration:
```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Check 2: Verify Deployment**
- Cron jobs only work in **production** deployments
- Preview deployments don't run cron jobs
- Make sure you've deployed to production (`vercel --prod`)

**Check 3: Check Vercel Dashboard**
- Go to **Settings** → **Cron Jobs**
- You should see `/api/cron` listed with schedule `*/5 * * * *`

### Users Not Getting Notifications

**Check 1: Verify User Has SpareRoom URL**
```bash
npm run view-users
```
Ensure users have:
- `subscription_status` = "active"
- `spareroom_url` is not null

**Check 2: Verify SpareRoom URL Format**
URLs should start with:
```
https://www.spareroom.co.uk/flatshare/
```

**Check 3: Check User's Last Checked Ad ID**
- Users only get notified of NEW listings
- If `last_checked_ad_id` is already the newest ad, no email will be sent
- This is expected behavior to prevent spam

## Monitoring & Maintenance

### Daily Monitoring

Check these metrics daily:

1. **Vercel Function Logs**
   - Error rate should be < 5%
   - Success rate should be > 95%

2. **Resend Email Logs**
   - Delivery rate should be > 95%
   - Bounce rate should be < 2%

3. **Database Health**
   - Monitor number of active users
   - Check for users with missing SpareRoom URLs

### Weekly Tasks

1. Review error logs and fix any recurring issues
2. Check email deliverability metrics in Resend
3. Verify cron job is running every 5 minutes

### Monthly Tasks

1. Review Resend usage (free tier = 3,000 emails/month)
2. If approaching limit, consider upgrading to paid plan
3. Check for any users who haven't received notifications in a while

## Cost Breakdown

| Service | Free Tier | Cost After Free Tier |
|---------|-----------|---------------------|
| **Vercel** | 100GB-hours/month | $20/month (Pro plan) |
| **Resend** | 3,000 emails/month | $20/month for 50k emails |
| **Total** | Free for first ~600 users | $40/month |

### Calculations:
- 600 active users × 5 emails/week = 3,000 emails/month (within free tier)
- Cron runs 8,640 times/month (every 5 min)
- Each run takes ~5-10 seconds
- Total: ~24 GB-hours/month (within Vercel free tier)

## Advanced Configuration

### Change Cron Frequency

Edit `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "*/2 * * * *"  // Every 2 minutes (faster)
    }
  ]
}
```

Or for less frequent checks:

```json
"schedule": "*/10 * * * *"  // Every 10 minutes
```

### Add Multiple Email Providers (Failover)

If Resend fails, automatically use a backup service:

1. Install SendGrid: `npm install @sendgrid/mail`
2. Update `lib/email.ts` with fallback logic
3. Add `SENDGRID_API_KEY` to environment variables

## Support

For issues:
1. Check Vercel Function Logs
2. Check Resend Email Logs
3. Review this guide's troubleshooting section
4. Contact support if problem persists

## Next Steps

Once the cron job is working:
1. ✅ Monitor for 24 hours to ensure stability
2. ✅ Test with real users
3. ✅ Set up alerting for cron job failures
4. ✅ Consider adding a dashboard to view cron job statistics
