# Deploying to Vercel

This guide explains how to deploy the SpareRoom Monitor Python cron job to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI** (optional): `npm i -g vercel`
3. **Database Considerations**: Since Vercel serverless functions are stateless, you have two options:
   - **Option A**: Use Vercel Blob Storage or mount a persistent volume (limited availability)
   - **Option B**: Use a remote database (recommended - see below)

## Database Options for Vercel

### Option 1: Vercel Postgres (Recommended)

Migrate your SQLite database to Vercel Postgres:

```bash
# Install Vercel Postgres
npm i @vercel/postgres

# Create a Postgres database in your Vercel dashboard
# Update your Python code to use postgres instead of sqlite3
```

### Option 2: Turso (Recommended)

[Turso](https://turso.tech/) is a distributed SQLite that works perfectly with serverless:

```bash
# Sign up at turso.tech
turso db create spareroom-monitor
turso db show spareroom-monitor

# Get your database URL and auth token
# Add to Vercel environment variables
```

Update `src/database.py` to use Turso:
```python
import libsql_experimental as libsql

conn = libsql.connect("your-turso-url", auth_token="your-token")
```

### Option 3: Neon, PlanetScale, or Railway

Any PostgreSQL or MySQL compatible service works. Update the database module accordingly.

## Deployment Steps

### 1. Prepare Your Project

Ensure your project structure looks like:
```
python-cron/
├── api/
│   └── cron.py          # Vercel serverless function
├── src/
│   ├── config.py
│   ├── database.py
│   ├── scraper.py
│   └── ...
├── requirements.txt
├── vercel.json
└── .vercelignore
```

### 2. Set Environment Variables

Go to your Vercel project settings → Environment Variables and add:

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=SpareRoom Monitor <noreply@yourdomain.com>
CRON_SECRET=your-random-secret-here
DATABASE_PATH=/tmp/spareroom.db  # or your remote DB connection string
REQUEST_TIMEOUT=30
DELAY_BETWEEN_USERS=1.0
LOG_LEVEL=INFO
```

### 3. Deploy via GitHub (Recommended)

1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Add Python cron job"
   git remote add origin https://github.com/yourusername/yourrepo.git
   git push -u origin main
   ```

2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your GitHub repository
4. Vercel will auto-detect the Python project
5. Click "Deploy"

### 4. Deploy via Vercel CLI

```bash
cd python-cron
vercel

# Follow the prompts
# Link to your project or create new one
```

### 5. Enable Cron Jobs

The `vercel.json` already includes cron configuration:

```json
"crons": [
  {
    "path": "/api/cron",
    "schedule": "*/5 * * * *"  // Every 5 minutes
  }
]
```

**Note**: Cron jobs are only available on Pro plans ($20/month). On Hobby plans, you can:
- Manually trigger: `curl https://yourproject.vercel.app/api/cron -H "Authorization: Bearer YOUR_CRON_SECRET"`
- Use GitHub Actions or external cron services (cron-job.org, EasyCron)

## Vercel Configuration

### vercel.json Explained

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/cron.py",
      "use": "@vercel/python"  // Use Python runtime
    }
  ],
  "routes": [
    {
      "src": "/api/cron",
      "dest": "api/cron.py"    // Route requests to function
    }
  ],
  "crons": [
    {
      "path": "/api/cron",     // Endpoint to call
      "schedule": "*/5 * * * *" // Cron schedule (every 5 minutes)
    }
  ]
}
```

### Cron Schedule Formats

- `*/5 * * * *` - Every 5 minutes
- `0 * * * *` - Every hour at minute 0
- `0 */2 * * *` - Every 2 hours
- `0 9 * * *` - Every day at 9:00 AM
- `0 9 * * 1` - Every Monday at 9:00 AM

## Testing

### Local Testing

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
vercel dev

# In another terminal, trigger the cron
curl http://localhost:3000/api/cron \
  -H "Authorization: Bearer your-cron-secret"
```

### Production Testing

```bash
# Trigger your deployed function
curl https://yourproject.vercel.app/api/cron \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Monitoring

### View Logs

1. Go to your Vercel dashboard
2. Select your project
3. Click "Deployments" → Select latest deployment
4. Click "Functions" → Select `api/cron.py`
5. View real-time logs

### Check Cron Execution

In your Vercel dashboard:
1. Go to "Crons" tab
2. See execution history, success/failure rates

## Limitations on Vercel

### Execution Limits

- **Hobby Plan**: 10-second timeout
- **Pro Plan**: 60-second timeout (Serverless Functions)
- **Pro Plan**: 300-second timeout (Background Functions - beta)

If your cron job takes longer than these limits, consider:
1. Processing users in batches
2. Using a queue system (BullMQ, Inngest)
3. Moving to a traditional server

### Cold Starts

Serverless functions may have cold starts (1-3 seconds). This is normal.

### File System

The `/tmp` directory is the only writable location and is ephemeral. Use a remote database.

## Troubleshooting

### "Module not found" errors

Make sure `requirements.txt` is in the project root and includes all dependencies.

### "Database is locked" errors

SQLite doesn't work well with serverless. Switch to Turso or Postgres.

### Timeout errors

Your function is taking too long. Consider:
- Optimizing scraping logic
- Processing fewer users per invocation
- Upgrading to Pro plan

### "Unauthorized" responses

Check your `CRON_SECRET` environment variable matches what you're sending.

## Alternative: GitHub Actions (Free Cron)

If you don't want to pay for Vercel Pro, use GitHub Actions to trigger your Vercel endpoint:

Create `.github/workflows/cron.yml`:
```yaml
name: Trigger Cron Job
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:  # Manual trigger

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Vercel Function
        run: |
          curl -X GET https://yourproject.vercel.app/api/cron \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

Add `CRON_SECRET` to your GitHub repository secrets.

## Cost Estimation

### Vercel Pricing

- **Hobby**: Free
  - No cron jobs
  - 100GB bandwidth/month
  - 100 serverless function executions/day

- **Pro**: $20/month
  - Cron jobs included
  - 1TB bandwidth/month
  - Unlimited function executions

### Recommended Setup for Production

- **Vercel Pro**: $20/month (for cron)
- **Turso**: Free tier (9GB storage)
- **Resend**: Free tier (100 emails/day) or $20/month (50k emails)

**Total**: ~$20-40/month

## Next Steps

1. ✅ Deploy to Vercel
2. ✅ Set up environment variables
3. ✅ Test the cron endpoint
4. ✅ Monitor first few executions
5. ✅ Set up alerts (optional)

For issues, check Vercel docs: https://vercel.com/docs/functions/serverless-functions/runtimes/python
