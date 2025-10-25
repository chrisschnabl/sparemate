# SpareRoom Monitor - Python Cron Job

A well-structured Python application that monitors SpareRoom listings and sends email notifications to subscribers.

**🚀 Deploys to Vercel!** See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for deployment instructions.

## Features

- 🏗️ **Clean Architecture**: Modular design with separation of concerns
- 🔍 **Web Scraping**: Beautiful Soup for robust HTML parsing
- 📧 **Email Notifications**: Resend integration for reliable email delivery
- 💾 **SQLite Database**: Compatible with existing Next.js app database
- 📊 **Comprehensive Logging**: Detailed logging with emoji indicators
- ⚙️ **Configurable**: Environment-based configuration
- 🛡️ **Error Handling**: Robust error handling and retry logic

## Project Structure

```
python-cron/
├── api/
│   └── cron.py              # Vercel serverless function handler
├── src/
│   ├── __init__.py          # Package initialization
│   ├── config.py            # Configuration management
│   ├── models.py            # Data models (User, SpareRoomAd, CronResult)
│   ├── logger.py            # Logging setup
│   ├── database.py          # Database operations
│   ├── scraper.py           # SpareRoom scraping logic
│   └── email_service.py     # Email sending via Resend
├── main.py                  # Standalone entry point (for local/cron)
├── requirements.txt         # Python dependencies
├── vercel.json              # Vercel configuration
├── .env.example             # Example environment variables
├── README.md                # This file
└── VERCEL_DEPLOYMENT.md     # Vercel deployment guide
```

## Installation

1. **Clone and navigate to the directory:**
   ```bash
   cd python-cron
   ```

2. **Create a virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

## Configuration

Edit `.env` with your settings:

- `DATABASE_PATH`: Path to your SQLite database (default: `../spareroom.db`)
- `RESEND_API_KEY`: Your Resend API key
- `EMAIL_FROM`: Sender email address
- `REQUEST_TIMEOUT`: HTTP request timeout in seconds (default: 30)
- `DELAY_BETWEEN_USERS`: Delay between processing users (default: 1.0 seconds)
- `LOG_LEVEL`: Logging level (DEBUG, INFO, WARNING, ERROR)

## Usage

### Run Manually

```bash
python main.py
```

### Schedule with Cron

Add to your crontab (`crontab -e`):

```bash
# Run every 5 minutes
*/5 * * * * cd /path/to/python-cron && /path/to/python-cron/venv/bin/python main.py >> /var/log/spareroom-monitor.log 2>&1
```

### Run with systemd (Linux)

Create `/etc/systemd/system/spareroom-monitor.service`:

```ini
[Unit]
Description=SpareRoom Monitor
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/python-cron
ExecStart=/path/to/python-cron/venv/bin/python /path/to/python-cron/main.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/spareroom-monitor.timer`:

```ini
[Unit]
Description=Run SpareRoom Monitor every 5 minutes

[Timer]
OnBootSec=1min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable spareroom-monitor.timer
sudo systemctl start spareroom-monitor.timer
```

## Development

### Code Structure

- **config.py**: Centralized configuration using environment variables
- **models.py**: Type-safe data models using Python dataclasses
- **database.py**: Database operations with context managers for safe connections
- **scraper.py**: Web scraping with regex-based extraction
- **email_service.py**: HTML and text email generation
- **logger.py**: Structured logging with configurable levels
- **main.py**: Orchestrates the cron job workflow

### Adding Features

1. Add configuration in `config.py`
2. Define new models in `models.py`
3. Implement logic in appropriate module
4. Update `main.py` if needed

### Testing

```bash
# Install dev dependencies
pip install pytest black flake8

# Run tests (when available)
pytest

# Format code
black .

# Lint code
flake8 src/ main.py
```

## Deployment Options

### 1. Vercel (Recommended) 🚀

Deploy as a serverless function with built-in cron scheduling:

```bash
# Deploy to Vercel
vercel

# Or connect your GitHub repo
# Vercel will auto-deploy on push
```

**See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for complete setup instructions.**

**Note**: Vercel Cron requires a Pro plan ($20/month). For free alternatives, see the deployment guide.

### 2. Traditional Server

- Deploy to any VPS (DigitalOcean, Linode, AWS EC2)
- Use cron or systemd for scheduling
- Simple and reliable

### 3. Serverless (Other)

- **AWS Lambda**: Use EventBridge for scheduling
- **Google Cloud Functions**: Use Cloud Scheduler
- **Railway/Render**: Use cron service

### 4. GitHub Actions (Free Cron)
```yaml
name: Run Cron Job
on:
  schedule:
    - cron: '*/5 * * * *'
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
      - run: pip install -r requirements.txt
      - run: python main.py
        env:
          DATABASE_PATH: ${{ secrets.DATABASE_PATH }}
          RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
```

## Advantages Over TypeScript Version

1. **Better Scraping**: BeautifulSoup is more robust than Cheerio
2. **Vercel Compatible**: Works with Vercel's Python runtime
3. **Simpler Dependencies**: Fewer transitive dependencies
4. **Better Performance**: No Node.js overhead
5. **Clearer Structure**: Explicit modules and separation of concerns
6. **Type Safety**: Dataclasses provide structure without TypeScript overhead
7. **Dual-mode**: Can run standalone or as serverless function

## Monitoring

The script logs extensively:
- 🔄 Job start/completion
- 📊 User counts
- 🔍 Processing details
- ✅ Success messages
- ❌ Error details
- 🆕 New listing counts

Use log aggregation tools (Papertrail, Loggly) for production monitoring.

## Troubleshooting

**Import errors:**
```bash
# Make sure virtual environment is activated
source venv/bin/activate
pip install -r requirements.txt
```

**Database errors:**
```bash
# Check DATABASE_PATH in .env
# Ensure the database file exists and is readable
```

**Email errors:**
```bash
# Verify RESEND_API_KEY is valid
# Check EMAIL_FROM domain is verified in Resend
```

## License

Same as parent project.
