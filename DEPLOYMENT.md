# Sparemate Deployment Guide

## Prerequisites

✅ Vercel account
✅ GitHub repository connected to Vercel
✅ Stripe account with API keys
✅ Resend account with API key
✅ Vercel Postgres database

## Environment Variables Required

Add these to Vercel dashboard (Settings > Environment Variables):

### Stripe
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Resend Email
```
RESEND_API_KEY=re_...
EMAIL_FROM=Sparemate <notifications@yourdomain.com>
```

### Database (Vercel Postgres)
```
POSTGRES_URL=postgres://...
POSTGRES_PRISMA_URL=postgres://...
POSTGRES_URL_NO_SSL=postgres://...
POSTGRES_URL_NON_POOLING=postgres://...
POSTGRES_USER=...
POSTGRES_HOST=...
POSTGRES_PASSWORD=...
POSTGRES_DATABASE=...
```

### Other
```
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
VERCEL_CRON_SECRET=your-random-secret
```

## Deployment Steps

### 1. Commit and Push Changes

```bash
git add .
git commit -m "Ready for production deployment"
git push origin main
```

### 2. Deploy to Vercel

```bash
vercel --prod
```

Or push to GitHub and Vercel will auto-deploy.

### 3. Set Up Database

After deployment, run the database setup:

```bash
# Connect to your Vercel Postgres database
vercel env pull .env.local

# Run the setup script
npm run setup-db
```

### 4. Configure Stripe Webhook

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://your-app.vercel.app/api/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the webhook secret to Vercel env vars

### 5. Verify Cron Job

The cron job runs every 5 minutes (`*/5 * * * *`) via Vercel Cron.

Test it manually:
```bash
curl -X POST https://your-app.vercel.app/api/cron \
  -H "Authorization: Bearer YOUR_VERCEL_CRON_SECRET"
```

### 6. Test Email Sending

```bash
npm run test-email your-email@example.com
```

## Post-Deployment Checklist

- [ ] Environment variables are set in Vercel
- [ ] Database tables are created
- [ ] Stripe webhook is configured
- [ ] Cron job is running (check Vercel dashboard)
- [ ] Test email works
- [ ] Test payment flow works
- [ ] Test notification email works

## Monitoring

- **Vercel Dashboard**: Check deployment logs and cron job logs
- **Stripe Dashboard**: Monitor webhooks and payments
- **Resend Dashboard**: Monitor email delivery

## Common Issues

### Cron job not running
- Check Vercel Cron logs in dashboard
- Verify `VERCEL_CRON_SECRET` matches in cron route

### Emails not sending
- Check `RESEND_API_KEY` is correct
- Verify email address in Resend dashboard
- Check Resend logs

### Database connection errors
- Verify all Postgres env vars are set
- Check Vercel Postgres dashboard
- Ensure database tables are created

### Stripe webhook failing
- Check `STRIPE_WEBHOOK_SECRET` matches
- Verify endpoint URL is correct
- Check Stripe webhook logs

## Support

For issues, contact: support@antichris.llc
