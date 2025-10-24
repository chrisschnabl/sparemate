# Sparemate - Instant Spareroom Notifications

A Next.js landing page with Stripe integration for Sparemate, a service that sends instant notifications when new properties are listed on Spareroom.

## Features

- **Modern Landing Page** - Beautiful, responsive design with Tailwind CSS
- **Stripe Integration** - Secure subscription payments with 3-day free trial
- **Database Storage** - SQLite database to store paying users
- **Webhook Handler** - Automatically adds users to database on successful payment
- **Automated Notifications** - Cron job checks for new listings every 5 minutes
- **Email Service** - Beautiful HTML emails sent via Resend
- **Vercel Ready** - Configured for easy deployment to Vercel

## Pricing

- 3-day free trial
- £10/week after trial
- Cancel anytime with 100% refund guarantee

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Stripe** - Payment processing
- **better-sqlite3** - SQLite database
- **Vercel** - Deployment platform

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` and add your Stripe credentials:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Set Up Stripe

1. **Create a Stripe Account**: Go to https://stripe.com and sign up
2. **Get API Keys**:
   - Go to https://dashboard.stripe.com/apikeys
   - Copy your Secret Key (starts with `sk_test_`)
3. **Create a Product**:
   - Go to https://dashboard.stripe.com/products
   - Click "Add product"
   - Name: "Sparemate Weekly Subscription"
   - Billing period: Weekly
   - Price: £10.00
   - Copy the Price ID (starts with `price_`)
4. **Set Up Webhook**:
   - Go to https://dashboard.stripe.com/webhooks
   - Click "Add endpoint"
   - URL: `https://your-domain.com/api/webhook`
   - Events to send: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the Signing Secret (starts with `whsec_`)

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page.

### 5. Test the Payment Flow

Use Stripe test cards:
- **Success**: 4242 4242 4242 4242
- **Requires authentication**: 4000 0025 0000 3155
- Any future expiry date and any 3-digit CVC

## Database Schema

The `users.db` SQLite database has the following schema:

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  subscription_status TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Accessing User Data

You can query the database to get active users for your notification system:

```typescript
import { getActiveUsers, getAllUsers } from './lib/db';

// Get all users with active subscriptions
const activeUsers = getActiveUsers();

// Get all users
const allUsers = getAllUsers();
```

## Deployment to Vercel

### Option 1: Deploy via Vercel CLI

```bash
npm install -g vercel
vercel
```

### Option 2: Deploy via GitHub

1. Push your code to GitHub
2. Go to https://vercel.com
3. Import your repository
4. Add environment variables in Vercel dashboard
5. Deploy

### Important: Configure Environment Variables in Vercel

In your Vercel project settings, add these environment variables:

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
```

**Note**: Switch to live Stripe keys for production!

### Configure Stripe Webhook for Production

After deploying, update your Stripe webhook URL:
1. Go to https://dashboard.stripe.com/webhooks
2. Update the endpoint URL to: `https://your-domain.vercel.app/api/webhook`

## Automated Notification System

The project includes a fully automated cron job that runs every 5 minutes to check for new SpareRoom listings and notify subscribers.

### How It Works

1. **Vercel Cron** triggers `/api/cron` every 5 minutes
2. System fetches all active subscribers from the database
3. For each user, it scrapes their custom SpareRoom URL
4. Compares current listings with `last_checked_ad_id` to find new ads
5. Sends beautiful HTML email notifications via Resend
6. Updates `last_checked_ad_id` to prevent duplicate notifications

### Setup Instructions

See [CRON_SETUP.md](./CRON_SETUP.md) for detailed setup instructions.

Quick setup:
1. Sign up at [resend.com](https://resend.com) (free tier: 3,000 emails/month)
2. Get your API key and add to `.env.local`:
   ```bash
   RESEND_API_KEY=re_...
   CRON_SECRET=your-secret-key  # Generate with: openssl rand -base64 32
   ```
3. Deploy to Vercel - cron jobs automatically start in production

### Monitoring

Check cron job execution in Vercel Dashboard:
- Go to your project → **Logs**
- Filter by `/api/cron`
- Should see execution logs every 5 minutes

## Architecture

The notification system is fully integrated and automated:

```
User subscribes → Stripe webhook → Database updated
                                       ↓
Vercel Cron (every 5 min) → Fetch active users → Scrape SpareRoom URLs
                                       ↓
                         Check for new listings → Send emails via Resend
                                       ↓
                         Update last_checked_ad_id → Next cycle
```

### Legacy Python Script

The original `check_spareroom.py` script is kept for reference but is no longer needed. The TypeScript version in `lib/scraper.ts` provides the same functionality and is fully integrated with the cron job.

## Project Structure

```
spareroom/
├── app/
│   ├── api/
│   │   ├── checkout/
│   │   │   └── route.ts      # Stripe checkout session creation
│   │   ├── webhook/
│   │   │   └── route.ts      # Stripe webhook handler
│   │   └── cron/
│   │       └── route.ts      # Cron job handler (checks listings every 5 min)
│   ├── success/
│   │   └── page.tsx          # Success page after payment
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Landing page
├── components/
│   └── PricingCard.tsx       # Pricing section component
├── lib/
│   ├── db.ts                 # Database functions
│   ├── scraper.ts            # SpareRoom scraping logic
│   └── email.ts              # Email service (Resend integration)
├── check_spareroom.py        # Legacy Python script (reference only)
├── .env.local.example        # Environment variables template
├── next.config.js            # Next.js configuration
├── tailwind.config.ts        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
├── vercel.json               # Vercel deployment & cron configuration
├── CRON_SETUP.md             # Detailed cron job setup guide
└── STRIPE_SETUP.md           # Stripe setup instructions
```

## API Endpoints

### POST /api/checkout
Creates a Stripe checkout session for new subscriptions.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

### POST /api/webhook
Handles Stripe webhook events. Automatically processes:
- `checkout.session.completed` - Creates user in database
- `customer.subscription.updated` - Updates subscription status
- `customer.subscription.deleted` - Marks subscription as canceled

### GET /api/cron
Cron job endpoint triggered by Vercel every 5 minutes. Protected by authorization header.

**Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "processed": 10,
  "successful": 9,
  "failed": 1,
  "notifications": 3,
  "errors": []
}
```

**What it does:**
1. Fetches all active subscribers
2. Scrapes each user's SpareRoom URL
3. Detects new listings
4. Sends email notifications
5. Updates `last_checked_ad_id` for each user

## License

ISC

## Support

For issues or questions, please contact support.
