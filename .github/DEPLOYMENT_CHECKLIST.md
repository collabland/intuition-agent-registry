# GitHub Actions Deployment Checklist

Use this checklist to set up automated deployment to Heroku.

## ✅ Pre-Deployment Checklist

### 1. Heroku Setup

- [ ] Heroku account created ([heroku.com](https://heroku.com))
- [ ] Heroku CLI installed

  ```bash
  brew tap heroku/brew && brew install heroku
  ```

- [ ] Logged into Heroku

  ```bash
  heroku login
  ```

- [ ] Heroku app created

  ```bash
  heroku create your-app-name
  ```

### 2. Environment Variables on Heroku

- [ ] `SIGNER` set (your blockchain private key)

  ```bash
  heroku config:set SIGNER=0xyour_private_key_here --app your-app-name
  ```

- [ ] `API_KEY` set (generate secure key)

  ```bash
  heroku config:set API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") --app your-app-name
  ```

- [ ] `NODE_ENV` set to production

  ```bash
  heroku config:set NODE_ENV=production --app your-app-name
  ```

### 3. Heroku API Key

- [ ] API key obtained

  ```bash
  heroku auth:token
  ```

  _Or get it from: [Account Settings](https://dashboard.heroku.com/account)_

### 4. GitHub Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

- [ ] `HEROKU_API_KEY` added (from `heroku auth:token`)
- [ ] `HEROKU_APP_NAME` added (your Heroku app name)
- [ ] `HEROKU_EMAIL` added (your Heroku account email)

### 5. Verify Workflow File

- [ ] Workflow file exists at `.github/workflows/heroku-deploy.yml`
- [ ] Workflow file is committed to git

## 🚀 First Deployment

### Manual Test (Optional but Recommended)

- [ ] Test manual deployment first

  ```bash
  git push heroku main
  ```

- [ ] Verify app works

  ```bash
  heroku open --app your-app-name
  curl https://your-app-name.herokuapp.com/health
  ```

### Automated Deployment

- [ ] Push to main branch

  ```bash
  git add .
  git commit -m "Setup automated deployment"
  git push origin main
  ```

- [ ] Go to GitHub repository → **Actions** tab
- [ ] Verify workflow is running
- [ ] Check workflow completes successfully (green checkmark)

## 🏥 Post-Deployment Verification

- [ ] Visit your app: `https://your-app-name.herokuapp.com`
- [ ] Health check passes:

  ```bash
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

- [ ] Check Heroku logs for errors:

  ```bash
  heroku logs --tail --app your-app-name
  ```

- [ ] Test API endpoint:

  ```bash
  curl -X POST https://your-app-name.herokuapp.com/v1/intuition/events \
    -H "x-api-key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"type": "test"}'
  ```

## 📊 Monitoring Setup

- [ ] Bookmark GitHub Actions page for your repo
- [ ] Bookmark Heroku dashboard for your app
- [ ] Set up notifications (optional):
  - GitHub: Settings → Notifications
  - Heroku: Dashboard → App → More → View Webhooks

## 🔒 Security Review

- [ ] No secrets committed to git
- [ ] Private key only stored in Heroku config vars
- [ ] API key is strong and random
- [ ] Repository access limited to trusted contributors
- [ ] Branch protection rules enabled (optional but recommended)

## 🎉 Success Criteria

All of the following should be true:

1. ✅ Workflow shows green checkmark in GitHub Actions
2. ✅ App accessible at `https://your-app-name.herokuapp.com`
3. ✅ Health endpoint returns 200 OK
4. ✅ No errors in Heroku logs
5. ✅ API authentication working

---

## 📚 Need Help?

- **Detailed Guide**: [docs/GITHUB_ACTIONS_DEPLOYMENT.md](../docs/GITHUB_ACTIONS_DEPLOYMENT.md)
- **Deployment Options**: [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)
- **API Documentation**: [docs/API.md](../docs/API.md)
- **GitHub Issues**: [Open an issue](../../issues)

---

## 🔄 Troubleshooting Quick Links

| Issue | Solution |
|-------|----------|
| Authentication failed | Verify `HEROKU_API_KEY` is correct |
| App not found | Check `HEROKU_APP_NAME` matches |
| Build failed | Check Heroku logs: `heroku logs --tail` |
| Health check failed | App may still be starting, wait 30s |
| Deployment stuck | Cancel and rerun workflow |

---

**Last Updated**: October 2025
