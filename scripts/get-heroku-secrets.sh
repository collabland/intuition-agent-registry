#!/bin/bash

# Helper script to get Heroku credentials for GitHub Secrets setup
# Usage: ./scripts/get-heroku-secrets.sh

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  GitHub Secrets Helper for Heroku Deployment                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI not installed"
    echo ""
    echo "Install it with:"
    echo "  macOS:    brew tap heroku/brew && brew install heroku"
    echo "  Ubuntu:   curl https://cli-assets.heroku.com/install-ubuntu.sh | sh"
    echo "  Windows:  Download from https://devcenter.heroku.com/articles/heroku-cli"
    echo ""
    exit 1
fi

echo "✅ Heroku CLI detected"

# Check if logged in
if ! heroku auth:whoami &> /dev/null; then
    echo "❌ Not logged into Heroku"
    echo ""
    echo "Please login first:"
    echo "  heroku login"
    echo ""
    exit 1
fi

echo "✅ Logged into Heroku"
echo ""

# Get credentials
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Copy these values to GitHub Secrets:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. API Key
echo "1️⃣  HEROKU_API_KEY"
API_KEY=$(heroku auth:token 2>/dev/null)
if [ -n "$API_KEY" ]; then
    echo "   $API_KEY"
else
    echo "   ❌ Failed to get API key"
fi
echo ""

# 2. Email
echo "2️⃣  HEROKU_EMAIL"
EMAIL=$(heroku auth:whoami 2>/dev/null)
if [ -n "$EMAIL" ]; then
    echo "   $EMAIL"
else
    echo "   ❌ Failed to get email"
fi
echo ""

# 3. App Name
echo "3️⃣  HEROKU_APP_NAME"
echo "   Choose one from your apps:"
echo ""

# Get list of apps
APPS=$(heroku apps 2>/dev/null | grep -v "===\|^$" | awk '{print $1}')

if [ -z "$APPS" ]; then
    echo "   ⚠️  No apps found. Create one with:"
    echo "      heroku create your-app-name"
else
    echo "$APPS" | while read -r app; do
        echo "   • $app"
    done
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Instructions
echo "📝 Next steps:"
echo ""
echo "1. Go to your GitHub repository"
echo "2. Navigate to: Settings → Secrets and variables → Actions"
echo "3. Click 'New repository secret' for each value above:"
echo "   • Name: HEROKU_API_KEY"
echo "   • Name: HEROKU_APP_NAME"
echo "   • Name: HEROKU_EMAIL"
echo "4. Push to main branch to trigger deployment"
echo ""

# Quick verification
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Quick verification:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if we have apps
if [ -n "$APPS" ]; then
    APP_COUNT=$(echo "$APPS" | wc -l | tr -d ' ')
    echo "✅ Found $APP_COUNT Heroku app(s)"
    
    # Check each app's config
    echo ""
    echo "Checking environment variables for each app..."
    echo ""
    
    echo "$APPS" | while read -r app; do
        echo "App: $app"
        
        # Check for required env vars
        HAS_SIGNER=$(heroku config:get SIGNER --app "$app" 2>/dev/null)
        HAS_API_KEY=$(heroku config:get API_KEY --app "$app" 2>/dev/null)
        
        if [ -n "$HAS_SIGNER" ]; then
            echo "  ✅ SIGNER is set"
        else
            echo "  ⚠️  SIGNER not set (required for blockchain transactions)"
        fi
        
        if [ -n "$HAS_API_KEY" ]; then
            echo "  ✅ API_KEY is set"
        else
            echo "  ⚠️  API_KEY not set (required for webhook authentication)"
        fi
        
        echo ""
    done
else
    echo "⚠️  No Heroku apps found"
    echo ""
    echo "Create one with:"
    echo "  heroku create agent-registry-production"
    echo "  heroku config:set SIGNER=0xyour_private_key --app agent-registry-production"
    echo "  heroku config:set API_KEY=\$(node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\") --app agent-registry-production"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 Documentation:"
echo "   • Full guide: docs/GITHUB_ACTIONS_DEPLOYMENT.md"
echo "   • Secrets template: .github/SECRETS_TEMPLATE.md"
echo "   • Checklist: .github/DEPLOYMENT_CHECKLIST.md"
echo ""
echo "✨ Ready to deploy? Push to main branch and watch it deploy!"
echo ""

