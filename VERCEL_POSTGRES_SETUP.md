# Vercel Postgres Setup Guide

Your Sparemate application now uses **Vercel Postgres** instead of SQLite, which is required for deployment on Vercel.

## Why Vercel Postgres?

- ✅ Works with Vercel's serverless architecture
- ✅ Managed database (no server maintenance)
- ✅ Automatic backups and scaling
- ✅ Free tier available for testing

## Step 1: Create Vercel Project

If you haven't already:

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Link your project**:
   ```bash
   vercel link
   ```
   - Choose your team/account
   - Link to existing project or create new one

## Step 2: Create Vercel Postgres Database

### Option A: Via Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click **Storage** tab
4. Click **Create Database**
5. Select **Postgres**
6. Choose a name (e.g., `sparemate-db`)
7. Select region (choose closest to your users)
8. Click **Create**

### Option B: Via Vercel CLI

```bash
vercel env add POSTGRES_URL
# Follow the prompts to create a new database
```

## Step 3: Pull Environment Variables

Once your database is created, Vercel automatically sets up the connection strings. Pull them to your local environment:

```bash
vercel env pull .env.local
```

This will populate these variables in your `.env.local` file:
- `POSTGRES_URL` - Main connection string
- `POSTGRES_PRISMA_URL` - For Prisma (pooled)
- `POSTGRES_URL_NON_POOLING` - Direct connection
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

## Step 4: Initialize Database Schema

Run the setup script to create the `users` table:

```bash
npm run setup-db
```

This will:
- Create the `users` table with all required columns
- Create indexes for better performance
- Verify the database is working

## Step 5: Verify Setup

Check that everything is working:

```bash
npm run view-users
```

You should see: "No users in database yet" (which is expected for a fresh database)

## Step 6: Test Locally

1. **Start the dev server**:
   ```bash
   npm run dev
   ```

2. **Start Stripe webhook listener** (in another terminal):
   ```bash
   stripe listen --forward-to localhost:3000/api/webhook
   ```

3. **Test the flow**:
   - Visit http://localhost:3000
   - Click the Stripe Buy Button
   - Use test card: `4242 4242 4242 4242`
   - Complete payment
   - Enter Spareroom URL on success page
   - Verify user is in database: `npm run view-users`

## Step 7: Deploy to Vercel

Once local testing works:

```bash
vercel --prod
```

Vercel will:
- Build your Next.js app
- Deploy it
- Automatically connect to your Postgres database

## Important Notes

### Environment Variables on Vercel

The Postgres environment variables are **automatically set** when you create a database in Vercel. You don't need to manually configure them in the Vercel dashboard.

Your other environment variables (Stripe keys, etc.) still need to be set manually:

```bash
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add RESEND_API_KEY production
vercel env add CRON_SECRET production
```

### Webhook Configuration for Production

After deploying, update your Stripe webhook:

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Add a new webhook endpoint
3. URL: `https://your-domain.vercel.app/api/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the webhook secret
6. Update on Vercel:
   ```bash
   vercel env add STRIPE_WEBHOOK_SECRET production
   ```

### Database Management

**View database contents**:
```bash
npm run view-users
```

**Direct SQL access**:
```bash
vercel postgres connect sparemate-db
```

This opens a PostgreSQL shell where you can run SQL commands:
```sql
SELECT * FROM users;
SELECT * FROM users WHERE subscription_status = 'active';
```

## Troubleshooting

### "Missing environment variable POSTGRES_URL"

**Solution**: Run `vercel env pull .env.local` to download database credentials

### "Database connection failed"

**Solution**:
1. Verify database exists: Check Vercel Dashboard > Storage
2. Verify env vars are set: `cat .env.local | grep POSTGRES`
3. Try reconnecting: `vercel env pull .env.local --force`

### "Table 'users' does not exist"

**Solution**: Run `npm run setup-db` to create the table

### Can't connect to database locally

**Solution**: Make sure you've run `vercel env pull .env.local` and have the correct credentials

## Database Schema

The `users` table structure:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  spareroom_url TEXT,
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255),
  subscription_status VARCHAR(50),
  last_checked_ad_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX idx_subscription_status ON users(subscription_status);
```

## Migration from SQLite

Your app has been migrated from SQLite to Postgres. The main changes:

- All database functions now return Promises (use `await`)
- Using `@vercel/postgres` instead of `better-sqlite3`
- Database initialization happens via setup script
- Connection credentials managed by Vercel

The old `users.db` file is no longer used and can be safely deleted.

## Next Steps

1. ✅ Create Vercel Postgres database
2. ✅ Pull environment variables
3. ✅ Run setup script
4. ✅ Test locally
5. ✅ Deploy to Vercel
6. ✅ Configure production Stripe webhook
7. ✅ Set up cron job for checking new listings (see CRON_SETUP.md)

🎉 Your database is ready for production!
