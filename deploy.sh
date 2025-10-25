#!/bin/bash

# Sparemate Deployment Script
# This script helps deploy to Vercel and verify integrations

set -e

echo "🚀 Sparemate Deployment Script"
echo "================================"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm i -g vercel
fi

# Check if logged in to Vercel
echo "🔐 Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    echo "⚠️  Not logged in to Vercel. Please log in:"
    vercel login
fi

echo "✅ Logged in to Vercel as: $(vercel whoami)"
echo ""

# Run build test
echo "🔨 Testing build..."
npm run build
echo "✅ Build successful"
echo ""

# Deploy to production
echo "📦 Deploying to production..."
echo "⚠️  Make sure you've set all environment variables in Vercel dashboard!"
echo "   See DEPLOYMENT.md for the full list"
echo ""
read -p "Continue with deployment? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    vercel --prod
    echo ""
    echo "✅ Deployment complete!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Set environment variables in Vercel dashboard"
    echo "2. Configure Stripe webhook"
    echo "3. Run database setup: vercel env pull && npm run setup-db"
    echo "4. Test the deployment: See TESTING_GUIDE.md"
    echo ""
    echo "🔗 View your app: $(vercel --prod 2>&1 | grep -o 'https://[^ ]*')"
else
    echo "❌ Deployment cancelled"
    exit 1
fi
