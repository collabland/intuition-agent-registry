# GitHub Secrets Setup Template

This file provides a template for setting up GitHub Secrets required for automated Heroku deployment.

## 📝 Required Secrets

Add these secrets to your GitHub repository at:
**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

### 1. HEROKU_API_KEY

**How to get it:**

```bash
# Using Heroku CLI (recommended)
heroku auth:token
```

Or from Heroku Dashboard:

1. Go to [Account Settings](https://dashboard.heroku.com/account)
2. Scroll to "API Key" section
3. Click "Reveal"
4. Copy the key

**Format:** `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

**Example value:**

```
12345678-90ab-cdef-1234-567890abcdef
```

---

### 2. HEROKU_APP_NAME

**How to get it:**

```bash
# List your Heroku apps
heroku apps
```

This is the name you used when creating your Heroku app:

```bash
heroku create your-app-name  # "your-app-name" is the HEROKU_APP_NAME
```

**Format:** lowercase with hyphens, no spaces

**Example value:**

```
agent-registry-production
```

**Note:** The app must already exist on Heroku before the workflow runs!

---

### 3. HEROKU_EMAIL

**How to get it:**

This is the email address you used to sign up for Heroku.

```bash
# Check your Heroku account email
heroku auth:whoami
```

**Format:** Valid email address

**Example value:**

```
your-email@example.com
```

---

## 🚀 Quick Setup Script

Copy and paste this into your terminal to get all values:

```bash
#!/bin/bash

echo "=== GitHub Secrets for Heroku Deployment ==="
echo ""

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI not installed. Install it first:"
    echo "   brew tap heroku/brew && brew install heroku"
    exit 1
fi

# Check if logged in
if ! heroku auth:whoami &> /dev/null; then
    echo "❌ Not logged into Heroku. Run: heroku login"
    exit 1
fi

echo "✅ Heroku CLI detected and you're logged in"
echo ""
echo "Copy these values to GitHub Secrets:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get API Key
echo "1. HEROKU_API_KEY"
API_KEY=$(heroku auth:token)
echo "   Value: $API_KEY"
echo ""

# Get Email
echo "2. HEROKU_EMAIL"
EMAIL=$(heroku auth:whoami)
echo "   Value: $EMAIL"
echo ""

# List apps
echo "3. HEROKU_APP_NAME"
echo "   Choose one from your apps:"
heroku apps --json | python3 -c "import sys, json; apps = json.load(sys.stdin); [print(f'   - {app[\"name\"]}') for app in apps]" 2>/dev/null || heroku apps | grep -v "===\|^$" | awk '{print "   - "$1}'
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next steps:"
echo "1. Go to: https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions"
echo "2. Click 'New repository secret' for each value above"
echo "3. Push to main branch to trigger deployment"
echo ""
```

Save this as `get-secrets.sh`, make it executable, and run:

```bash
chmod +x get-secrets.sh
./get-secrets.sh
```

---

## 📸 Adding Secrets to GitHub (Step-by-Step)

### Step 1: Navigate to Secrets

1. Go to your GitHub repository
2. Click **Settings** (top menu)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**

### Step 2: Add Each Secret

For each secret (HEROKU_API_KEY, HEROKU_APP_NAME, HEROKU_EMAIL):

1. **Name**: Enter the secret name exactly as shown (e.g., `HEROKU_API_KEY`)
2. **Value**: Paste the corresponding value
3. Click **Add secret**
4. Repeat for remaining secrets

### Step 3: Verify

Once added, you should see three secrets listed:

- `HEROKU_API_KEY`
- `HEROKU_APP_NAME`
- `HEROKU_EMAIL`

**Security Note:** Values are masked and cannot be viewed after creation. You can only update or delete them.

---

## ✅ Verification Checklist

Before triggering deployment, verify:

- [ ] All three secrets are added to GitHub
- [ ] Secret names match exactly (case-sensitive)
- [ ] Heroku app exists and is accessible
- [ ] Environment variables are set on Heroku (`SIGNER`, `API_KEY`)
- [ ] You have push access to the main branch

---

## 🔒 Security Best Practices

1. **Never commit secrets to git**
   - Check `.gitignore` includes `.env`
   - Don't hardcode in workflow files

2. **Rotate keys periodically**

   ```bash
   # Generate new Heroku API key
   heroku authorizations:create --description "GitHub Actions $(date +%Y-%m-%d)"
   ```

3. **Use different keys for different environments**
   - Staging: `HEROKU_API_KEY_STAGING`
   - Production: `HEROKU_API_KEY_PRODUCTION`

4. **Limit repository access**
   - Only trusted contributors should have write access
   - Enable branch protection on main

5. **Monitor workflow runs**
   - Review Actions tab regularly
   - Check for unauthorized deployments

---

## ❓ Troubleshooting

### Secret not working?

1. **Check secret name** - Must match exactly (case-sensitive)
2. **Regenerate API key** - Old key may have expired

   ```bash
   heroku auth:token --refresh
   ```

3. **Verify app name** - Must be exact Heroku app name

   ```bash
   heroku apps --all | grep your-app-name
   ```

4. **Check email** - Must match Heroku account

   ```bash
   heroku auth:whoami
   ```

### Need to update a secret?

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Click the secret name
3. Click **Update secret**
4. Paste new value
5. Click **Update secret**

### Delete a secret?

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Click the secret name
3. Click **Remove secret**
4. Confirm deletion

---

## 📚 Additional Resources

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Heroku API Key Management](https://devcenter.heroku.com/articles/authentication)
- [Full Deployment Guide](../docs/GITHUB_ACTIONS_DEPLOYMENT.md)

---

**Need help?** [Open an issue](../../issues) or check the [deployment documentation](../docs/GITHUB_ACTIONS_DEPLOYMENT.md).
