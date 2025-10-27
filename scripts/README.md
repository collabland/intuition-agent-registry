# Scripts

Utility scripts for the Agent Registry project.

## 📋 get-heroku-secrets.sh

Helper script to retrieve Heroku credentials needed for GitHub Actions deployment.

### Usage

```bash
./scripts/get-heroku-secrets.sh
```

Or using npm/pnpm:

```bash
pnpm run get-secrets
```

### What it does

1. Checks if Heroku CLI is installed and you're logged in
2. Retrieves your Heroku API key
3. Gets your Heroku account email
4. Lists all your Heroku apps
5. Verifies environment variables are set on each app
6. Provides formatted output ready to copy to GitHub Secrets

### Output

The script outputs three values needed for GitHub Secrets:

- `HEROKU_API_KEY` - Your Heroku authentication token
- `HEROKU_EMAIL` - Your Heroku account email
- `HEROKU_APP_NAME` - Name of your Heroku app (choose from list)

### Prerequisites

- Heroku CLI installed
- Logged into Heroku (`heroku login`)
- At least one Heroku app created

### Example Output

```
╔════════════════════════════════════════════════════════════════╗
║  GitHub Secrets Helper for Heroku Deployment                  ║
╚════════════════════════════════════════════════════════════════╝

✅ Heroku CLI detected
✅ Logged into Heroku

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Copy these values to GitHub Secrets:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  HEROKU_API_KEY
   12345678-90ab-cdef-1234-567890abcdef

2️⃣  HEROKU_EMAIL
   your-email@example.com

3️⃣  HEROKU_APP_NAME
   Choose one from your apps:
   • agent-registry-production
   • agent-registry-staging
```

### Next Steps

After running this script:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add each secret with the values from the script output
4. Push to main branch to trigger deployment

### Troubleshooting

**"Heroku CLI not installed"**

```bash
# macOS
brew tap heroku/brew && brew install heroku

# Ubuntu/Debian
curl https://cli-assets.heroku.com/install-ubuntu.sh | sh
```

**"Not logged into Heroku"**

```bash
heroku login
```

**"No apps found"**

```bash
# Create a new Heroku app
heroku create agent-registry-production

# Set required environment variables
heroku config:set SIGNER=0xyour_private_key --app agent-registry-production
heroku config:set API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") --app agent-registry-production
```

## 📚 Related Documentation

- [GitHub Actions Deployment Guide](../docs/GITHUB_ACTIONS_DEPLOYMENT.md)
- [GitHub Secrets Template](../.github/SECRETS_TEMPLATE.md)
- [Deployment Checklist](../.github/DEPLOYMENT_CHECKLIST.md)
- [General Deployment Guide](../docs/DEPLOYMENT.md)
