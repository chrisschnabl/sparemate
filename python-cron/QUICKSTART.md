# Quick Start - Deploy to Vercel in 5 Minutes

## Step 1: Push to GitHub

```bash
cd python-cron
git init
git add .
git commit -m "Add Python cron job for SpareRoom Monitor"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## Step 2: Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your repository
4. Click "Import"

## Step 3: Configure Environment Variables

In Vercel project settings, add:

| Variable | Value | Example |
|----------|-------|---------|
| `RESEND_API_KEY` | Your Resend API key | `re_xxxxx...` |
| `EMAIL_FROM` | Sender email | `SpareRoom <noreply@yoursite.com>` |
| `CRON_SECRET` | Random secret | Generate with `openssl rand -hex 32` |
| `DATABASE_PATH` | Database location | See note below ⚠️ |

### ⚠️ Important: Database Setup

**SQLite doesn't work well with Vercel serverless functions** (they're stateless).

**Quick Solution**: Use [Turso](https://turso.tech) (free tier available):

```bash
# Install Turso CLI
brew install tursodatabase/tap/turso  # macOS
# or: curl -sSfL https://get.tur.so/install.sh | bash

# Create account and database
turso auth signup
turso db create spareroom-monitor

# Get connection details
turso db show spareroom-monitor

# Copy your existing database
turso db shell spareroom-monitor < path/to/schema.sql
```

Then set `DATABASE_PATH` in Vercel to your Turso URL and update `src/database.py` to use Turso SDK.

**Alternative**: Use Vercel Postgres, Neon, or PlanetScale.

## Step 4: Enable Cron (Pro Plan Required)

Vercel Cron requires a Pro plan ($20/month).

**Pro Plan**: Cron will automatically run based on `vercel.json` schedule.

**Hobby Plan (Free)**: Use GitHub Actions instead:

Create `.github/workflows/cron.yml` in your main repo:

```yaml
name: Trigger SpareRoom Cron
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
  workflow_dispatch:

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl https://your-project.vercel.app/api/cron \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

Add `CRON_SECRET` to GitHub repository secrets.

## Step 5: Test

```bash
# Test the endpoint
curl https://your-project.vercel.app/api/cron \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# You should see JSON response with job results
```

## Step 6: Monitor

- **View logs**: Vercel Dashboard → Your Project → Functions → `api/cron.py`
- **Check cron runs**: Vercel Dashboard → Your Project → Crons tab (Pro only)

## Troubleshooting

**"Module not found"**: Make sure `requirements.txt` is in the project root.

**"Database locked"**: You need to use a remote database (Turso, Postgres, etc.)

**Timeout errors**: Function is taking too long. Optimize or upgrade to Pro (60s timeout).

**"Unauthorized"**: Check `CRON_SECRET` environment variable matches your request header.

## Cost Summary

### Free Option (Hobby Plan + GitHub Actions)
- Vercel: $0 (no cron, triggered by GitHub Actions)
- GitHub Actions: $0 (2000 minutes/month free)
- Turso: $0 (9GB storage on free tier)
- Resend: $0 (100 emails/day) or $20/month

**Total: $0-20/month**

### Pro Option (Built-in Cron)
- Vercel Pro: $20/month (includes cron)
- Turso: $0 (free tier)
- Resend: $0 (100 emails/day) or $20/month

**Total: $20-40/month**

## Next Steps

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed configuration options and advanced setup.
