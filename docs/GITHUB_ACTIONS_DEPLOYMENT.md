# GitHub Actions Deployment to Heroku

This guide explains how to set up automatic deployment to Heroku using GitHub Actions.

## 🚀 Overview

The GitHub Actions workflow automatically deploys your application to Heroku whenever code is pushed to the `main` branch. The workflow:

1. Checks out your code
2. Sets up Node.js and pnpm
3. Installs dependencies
4. Runs tests (if available)
5. Deploys to Heroku
6. Verifies the deployment with a health check

## 📋 Prerequisites

Before setting up the workflow, you need:

1. **A Heroku account** - Sign up at [heroku.com](https://www.heroku.com)
2. **A Heroku app created** - Your application deployed on Heroku
3. **Heroku API key** - For authentication from GitHub Actions
4. **GitHub repository** - Where your code is hosted

## 🔧 Setup Instructions

### Step 1: Create a Heroku App (if not already done)

```bash
# Login to Heroku
heroku login

# Create your app
heroku create your-app-name

# Set environment variables on Heroku
heroku config:set SIGNER=0xyour_private_key_here --app your-app-name
heroku config:set API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") --app your-app-name
heroku config:set NODE_ENV=production --app your-app-name
```

### Step 2: Get Your Heroku API Key

You have two options:

**Option A: Using Heroku CLI**

```bash
heroku auth:token
```

**Option B: From Heroku Dashboard**

1. Go to [Account Settings](https://dashboard.heroku.com/account)
2. Scroll down to "API Key"
3. Click "Reveal" to see your API key

### Step 3: Configure GitHub Secrets

Add the following secrets to your GitHub repository:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each of the following:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `HEROKU_API_KEY` | Your Heroku API key | `12345678-1234-1234-1234-123456789abc` |
| `HEROKU_APP_NAME` | Your Heroku app name | `your-agent-registry` |
| `HEROKU_EMAIL` | Email associated with your Heroku account | `your-email@example.com` |

**To add each secret:**

1. Click "New repository secret"
2. Enter the name (e.g., `HEROKU_API_KEY`)
3. Paste the value
4. Click "Add secret"

### Step 4: Verify Workflow File

The workflow file is located at `.github/workflows/heroku-deploy.yml`. It's already configured and ready to use!

### Step 5: Trigger Deployment

The workflow will automatically run when you:

**Automatic Trigger:**

```bash
# Push to main branch
git add .
git commit -m "Your commit message"
git push origin main
```

**Manual Trigger:**

1. Go to your GitHub repository
2. Click on **Actions** tab
3. Select **Deploy to Heroku** workflow
4. Click **Run workflow** button
5. Choose the branch and click **Run workflow**

## 📊 Monitoring Deployments

### View Workflow Status

1. Go to your GitHub repository
2. Click on the **Actions** tab
3. You'll see all workflow runs with their status:
   - 🟢 Green checkmark = Successful deployment
   - 🔴 Red X = Failed deployment
   - 🟡 Yellow dot = In progress

### Check Deployment Logs

Click on any workflow run to see detailed logs:

- Setup steps
- Dependency installation
- Test results
- Deployment process
- Health check results

### Verify Your Deployment

After deployment completes, verify your app:

```bash
# Check health endpoint
curl https://your-app-name.herokuapp.com/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2025-10-27T...",
#   "account": "0x..."
# }
```

Or visit in browser:

```
https://your-app-name.herokuapp.com/health
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Authentication Failed

**Error:** `Invalid credentials provided`

**Solution:**

- Verify your `HEROKU_API_KEY` is correct
- Regenerate your Heroku API token: `heroku auth:token`
- Update the secret in GitHub

#### 2. App Not Found

**Error:** `Couldn't find that app`

**Solution:**

- Check `HEROKU_APP_NAME` matches your actual app name
- List your apps: `heroku apps`
- Update the secret in GitHub

#### 3. Deployment Failed

**Error:** Various deployment errors

**Solution:**

```bash
# Check Heroku logs
heroku logs --tail --app your-app-name

# Common fixes:
# - Ensure all environment variables are set on Heroku
# - Check Procfile is correct
# - Verify package.json has correct start script
```

#### 4. Health Check Failed

**Error:** `Health check failed or endpoint not ready yet`

**Solution:**

- This is often just a timing issue - the app is starting
- Check the app directly: `heroku open --app your-app-name`
- View logs: `heroku logs --tail --app your-app-name`
- Ensure `/health` endpoint is working

#### 5. Build Failed - Dependencies

**Error:** Package installation errors

**Solution:**

- Ensure `pnpm-lock.yaml` is committed to git
- Check Node.js version compatibility in `package.json`
- Verify all dependencies are listed in `package.json`

## 🛠 Customization

### Change Deployment Branch

Edit `.github/workflows/heroku-deploy.yml`:

```yaml
on:
  push:
    branches:
      - main        # Change to your preferred branch
      - production  # Or add multiple branches
```

### Deploy to Multiple Environments

Create separate workflow files for different environments:

- `.github/workflows/deploy-staging.yml` - Deploy to staging
- `.github/workflows/deploy-production.yml` - Deploy to production

Then use different secrets:

- `HEROKU_API_KEY_STAGING` / `HEROKU_APP_NAME_STAGING`
- `HEROKU_API_KEY_PRODUCTION` / `HEROKU_APP_NAME_PRODUCTION`

### Add More Tests

Modify the workflow to add additional testing steps:

```yaml
- name: Lint code
  run: pnpm lint

- name: Type check
  run: pnpm type-check

- name: Run tests
  run: pnpm test
```

### Add Notifications

Add Slack or Discord notifications on deployment success/failure:

```yaml
- name: Notify on success
  if: success()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
      -H 'Content-Type: application/json' \
      -d '{"text":"✅ Deployment successful!"}'

- name: Notify on failure
  if: failure()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
      -H 'Content-Type: application/json' \
      -d '{"text":"❌ Deployment failed!"}'
```

## 📝 Best Practices

### 1. Use Environment Variables

Never commit sensitive data. Always use Heroku config vars:

```bash
# Set via CLI
heroku config:set KEY=value --app your-app-name

# Or in GitHub Actions using secrets
# (then sync to Heroku config vars)
```

### 2. Test Before Merging

Use GitHub's pull request workflow:

- Create feature branches
- Open pull requests
- Review and test changes
- Merge to main when ready (triggers auto-deployment)

### 3. Monitor Your Deployments

- Enable Heroku metrics and logging
- Set up error tracking (e.g., Sentry)
- Monitor API performance

### 4. Rollback if Needed

If a deployment breaks something:

```bash
# Rollback to previous version
heroku rollback --app your-app-name

# Or deploy a specific version
git push heroku previous-working-commit:main --force
```

### 5. Use Staging Environment

Before pushing to production:

1. Deploy to a staging app first
2. Test thoroughly
3. Then deploy to production

## 🔐 Security Considerations

1. **Never commit secrets** - Always use GitHub Secrets
2. **Rotate API keys** - Periodically regenerate your Heroku API key
3. **Limit access** - Only give repository access to trusted contributors
4. **Review workflow runs** - Monitor the Actions tab for unauthorized deployments
5. **Use branch protection** - Require reviews before merging to main

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Heroku Dev Center](https://devcenter.heroku.com/)
- [Heroku Deploy Action](https://github.com/marketplace/actions/deploy-to-heroku)

## 💡 Quick Reference

### Essential Commands

```bash
# View Heroku apps
heroku apps

# Get API key
heroku auth:token

# View app logs
heroku logs --tail --app your-app-name

# Check app status
heroku ps --app your-app-name

# Open app in browser
heroku open --app your-app-name

# View configuration
heroku config --app your-app-name

# Rollback deployment
heroku rollback --app your-app-name
```

### GitHub Actions Commands

```bash
# List workflow runs (using GitHub CLI)
gh run list

# View workflow run logs
gh run view <run-id> --log

# Re-run a failed workflow
gh run rerun <run-id>

# Cancel a running workflow
gh run cancel <run-id>
```

---

## ✅ Deployment Checklist

Before your first automated deployment:

- [ ] Heroku app created
- [ ] Environment variables set on Heroku (`SIGNER`, `API_KEY`)
- [ ] Heroku API key obtained
- [ ] GitHub secrets configured (`HEROKU_API_KEY`, `HEROKU_APP_NAME`, `HEROKU_EMAIL`)
- [ ] Workflow file committed to repository
- [ ] First manual deployment tested
- [ ] Health endpoint returns 200 OK
- [ ] Logs show no errors

---

*For more deployment options, see [DEPLOYMENT.md](./DEPLOYMENT.md)*

*Last updated: October 2025*
