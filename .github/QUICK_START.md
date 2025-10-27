# 🚀 GitHub Actions Deployment - Quick Start

Get your app auto-deploying to Heroku in 5 minutes!

## 📋 Prerequisites

- [ ] Heroku account
- [ ] Heroku CLI installed
- [ ] GitHub repository with this code

## ⚡ 3-Step Setup

### Step 1: Create Heroku App

```bash
# Login to Heroku
heroku login

# Create your app
heroku create your-app-name

# Set required environment variables
heroku config:set SIGNER=0xyour_private_key_here --app your-app-name
heroku config:set API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") --app your-app-name
heroku config:set NODE_ENV=production --app your-app-name
```

### Step 2: Get GitHub Secrets

Run the helper script:

```bash
pnpm run get-secrets
```

This will output three values you need:

- `HEROKU_API_KEY`
- `HEROKU_APP_NAME`
- `HEROKU_EMAIL`

### Step 3: Add Secrets to GitHub

1. Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`
2. Click "New repository secret" for each value
3. Done! 🎉

## 🎯 Deploy

```bash
git add .
git commit -m "Setup automated deployment"
git push origin main
```

Watch it deploy automatically!

Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/actions`

## ✅ Verify

```bash
# Check health endpoint
curl https://your-app-name.herokuapp.com/health
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2025-10-27T...",
  "account": "0x..."
}
```

## 📚 Need More Help?

- **Detailed Guide**: [docs/GITHUB_ACTIONS_DEPLOYMENT.md](../docs/GITHUB_ACTIONS_DEPLOYMENT.md)
- **Secrets Template**: [.github/SECRETS_TEMPLATE.md](./SECRETS_TEMPLATE.md)
- **Full Checklist**: [.github/DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

## 🔄 Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Developer pushes to main branch                           │
│                                                             │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  GitHub Actions Workflow Triggered                         │
│                                                             │
│  1. Checkout code                                          │
│  2. Setup Node.js & pnpm                                   │
│  3. Install dependencies                                   │
│  4. Run tests (if available)                               │
│  5. Deploy to Heroku                                       │
│  6. Verify deployment                                      │
│                                                             │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Heroku receives code and builds                           │
│                                                             │
│  1. Heroku detects Node.js                                 │
│  2. Installs dependencies with pnpm                        │
│  3. Starts app with Procfile                               │
│  4. App is live!                                           │
│                                                             │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ✅ App Running at https://your-app-name.herokuapp.com     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🎁 What You Get

✅ Automatic deployment on every push to main  
✅ Built-in testing before deployment  
✅ Health check verification after deployment  
✅ Full deployment logs in GitHub Actions  
✅ Manual trigger option from GitHub UI  
✅ Zero-downtime deployments  

## 💡 Pro Tips

1. **Test locally first**: `pnpm dev` before pushing
2. **Watch the logs**: Check GitHub Actions tab for progress
3. **Use branch protection**: Require PR reviews before merging to main
4. **Monitor your app**: Set up Heroku metrics
5. **Keep secrets safe**: Never commit them to git

## 🆘 Common Issues

| Issue | Quick Fix |
|-------|-----------|
| "Invalid credentials" | Regenerate `HEROKU_API_KEY`: `heroku auth:token` |
| "App not found" | Check `HEROKU_APP_NAME` matches your app |
| "Build failed" | Check logs: `heroku logs --tail --app your-app-name` |
| "Health check failed" | Wait 30s, app might still be starting |

---

**Ready to deploy? Just push to main!** 🚀
