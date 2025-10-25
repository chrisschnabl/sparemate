# Sparemate Testing Guide

This guide will help you test all integrations before and after deployment.

## Pre-Deployment Testing (Local)

### 1. Test Database Connection

```bash
npm run test-db
```

**Expected Output:**
- ✅ Database connection successful
- ✅ Tables created: users, pending_urls
- ✅ Sample data inserted and retrieved

**If it fails:**
- Check `.env.local` has correct Postgres credentials
- Verify Postgres database is accessible
- Run `npm run setup-db` to create tables

### 2. Test Email Sending

```bash
npm run test-email your-email@example.com
```

**Expected Output:**
- ✅ RESEND_API_KEY is set
- ✅ Email sent successfully
- ✅ Duration: ~200-500ms
- 📬 Email arrives in inbox within 1 minute

**If it fails:**
- Check `RESEND_API_KEY` in `.env.local`
- Verify API key is valid on Resend dashboard
- Check if email is in spam folder

### 3. Test Scraper

Create a test file: `scripts/test-scraper.ts`

```typescript
import { fetchSpareRoomAds } from '../lib/scraper';

async function test() {
  const url = 'YOUR_SPAREROOM_SEARCH_URL';
  const listings = await fetchSpareRoomAds(url);

  console.log(`Found ${listings.length} listings`);
  console.log('First listing:', listings[0]);

  // Check if images are loading
  const withImages = listings.filter(l => l.imageUrl).length;
  console.log(`${withImages}/${listings.length} listings have images`);
}

test();
```

Run: `npx tsx scripts/test-scraper.ts`

**Expected Output:**
- ✅ Listings found (>0)
- ✅ Images extracted (most should have imageUrl)
- ✅ Titles, prices, locations extracted

### 4. Test Local Build

```bash
npm run build
npm start
```

Visit `http://localhost:3000` and test:
- [ ] Homepage loads
- [ ] Can enter Spareroom URL
- [ ] Preview shows listings with blurred images
- [ ] Preview shows correct price format
- [ ] Listings count is accurate

## Post-Deployment Testing (Production)

### 1. Login to Vercel and Deploy

```bash
vercel login
vercel --prod
```

### 2. Set Environment Variables in Vercel

Go to Vercel Dashboard > Your Project > Settings > Environment Variables

Add all variables from `.env.local`:

**Required Variables:**
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
RESEND_API_KEY
EMAIL_FROM
POSTGRES_URL
POSTGRES_PRISMA_URL
POSTGRES_URL_NO_SSL
POSTGRES_URL_NON_POOLING
POSTGRES_USER
POSTGRES_HOST
POSTGRES_PASSWORD
POSTGRES_DATABASE
NEXT_PUBLIC_BASE_URL
VERCEL_CRON_SECRET
```

### 3. Test Production Database

After deployment, pull env vars and setup database:

```bash
vercel env pull .env.production
npm run setup-db
```

### 4. Test Stripe Webhook

**Setup:**
1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://your-app.vercel.app/api/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy webhook secret to Vercel env vars as `STRIPE_WEBHOOK_SECRET`
5. Redeploy: `vercel --prod`

**Test:**
- Use Stripe test mode
- Complete a test payment
- Check Vercel logs: `vercel logs`
- Verify:
  - [ ] User created in database
  - [ ] Welcome email sent
  - [ ] Success page loads with listings

### 5. Test Cron Job

**Manual Test:**
```bash
curl -X POST https://your-app.vercel.app/api/cron \
  -H "Authorization: Bearer YOUR_VERCEL_CRON_SECRET"
```

**Expected Output:**
- Check Vercel logs
- Verify cron ran
- Check if emails were sent for new listings

**Check Cron Status:**
- Vercel Dashboard > Your Project > Cron Jobs
- Should show: `*/5 * * * *` (every 5 minutes)
- Check execution history

### 6. End-to-End User Flow Test

1. **Visit Homepage**
   - [ ] Goes to `https://your-app.vercel.app`
   - [ ] Homepage loads correctly
   - [ ] Input field works

2. **Enter Spareroom URL**
   - [ ] Paste valid Spareroom search URL
   - [ ] Click "Preview Your Search"
   - [ ] Listings appear with images (blurred)
   - [ ] Prices are partially blurred
   - [ ] Warning shows "X of Y listings posted in last hour"

3. **Complete Payment (Test Mode)**
   - [ ] Click Stripe button
   - [ ] Redirects to Stripe checkout
   - [ ] Use test card: `4242 4242 4242 4242`
   - [ ] Complete payment
   - [ ] Redirects to success page

4. **Success Page**
   - [ ] Shows "You're all set!" popup
   - [ ] Popup fades out after 5 seconds
   - [ ] Lists all current listings (unblurred)
   - [ ] Shows images properly
   - [ ] "Refresh" button works
   - [ ] "Test Email" button works
   - [ ] Email toggle works

5. **Check Emails**
   - [ ] Welcome email received
   - [ ] Welcome email has success page link
   - [ ] Welcome email has Stripe portal link
   - [ ] Support email shown: support@antichris.llc
   - [ ] Test email works from success page

### 7. Test Notification System

**Wait for cron to run (up to 5 minutes)** OR manually trigger:

```bash
curl -X POST https://your-app.vercel.app/api/cron \
  -H "Authorization: Bearer YOUR_VERCEL_CRON_SECRET"
```

**If new listings appear:**
- [ ] Notification email sent within 1 minute
- [ ] Email shows new listings
- [ ] Email formatted correctly
- [ ] Support email in footer

### 8. Database Verification

Check Vercel Postgres dashboard:
- [ ] Users table has test user
- [ ] `spareroom_url` is saved
- [ ] `last_checked_ad_id` updates after cron runs
- [ ] `emails_enabled` is true
- [ ] `subscription_status` is 'active' or 'trialing'

### 9. Monitor Logs

```bash
# Real-time logs
vercel logs --follow

# Or check in Vercel dashboard
```

Look for:
- ✅ Successful cron executions
- ✅ Email send confirmations
- ✅ No error messages
- ✅ Database queries working

### 10. Performance Testing

- [ ] Homepage loads < 2 seconds
- [ ] Listings preview loads < 3 seconds
- [ ] Success page loads < 2 seconds
- [ ] Emails arrive < 1 minute after trigger

## Common Issues & Solutions

### Issue: Cron not running
**Solution:**
- Verify `VERCEL_CRON_SECRET` in env vars
- Check `/api/cron/route.ts` uses correct auth
- Redeploy after env var changes
- Check Vercel cron logs

### Issue: Emails not sending
**Solution:**
- Verify `RESEND_API_KEY` is correct
- Check Resend dashboard for errors
- Verify `EMAIL_FROM` is authorized in Resend
- Check Vercel logs for email errors

### Issue: Database errors
**Solution:**
- Verify all Postgres env vars are set
- Run `npm run setup-db` to create tables
- Check Vercel Postgres dashboard
- Verify connection pooling settings

### Issue: Stripe webhook failing
**Solution:**
- Verify `STRIPE_WEBHOOK_SECRET` matches
- Check webhook URL is correct in Stripe dashboard
- Test webhook with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhook`
- Check Vercel logs for webhook errors

### Issue: Images not loading
**Solution:**
- Check scraper logs for image extraction
- Verify Spareroom HTML structure hasn't changed
- Check browser console for CORS errors
- Test with different Spareroom URLs

## Success Criteria

All tests passing means:
✅ Database connected and tables created
✅ Emails sending successfully
✅ Scraper extracting listings correctly
✅ Payment flow working
✅ Cron job running every 5 minutes
✅ Notifications arriving within 1 minute
✅ All user flows working end-to-end

## Support

If issues persist, check:
- Vercel deployment logs
- Stripe webhook logs
- Resend email logs
- GitHub Actions (if enabled)

Contact: support@antichris.llc
