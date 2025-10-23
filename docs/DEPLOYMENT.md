# Deployment Guide

This guide covers various deployment options for the Agent Registry.

## 🚀 Quick Deploy Options

### Heroku (Recommended)

**Prerequisites:**
- Heroku CLI installed
- Git repository
- Environment variables configured

**Steps:**

1. **Install Heroku CLI**
   ```bash
   # macOS
   brew tap heroku/brew && brew install heroku
   
   # Or download from: https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Login and Create App**
   ```bash
   heroku login
   heroku create your-agent-registry
   ```

3. **Set Environment Variables**
   ```bash
   # Generate API key
   API_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   
   # Set variables
   heroku config:set SIGNER=0xyour_private_key_here
   heroku config:set API_KEY=$API_KEY
   heroku config:set NODE_ENV=production
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

5. **Verify**
   ```bash
   heroku open
   curl https://your-agent-registry.herokuapp.com/health
   ```

---

### Docker Deployment

**Build and Run:**
```bash
# Build image
docker build -t agent-registry .

# Run container
docker run -p 3000:3000 \
  -e SIGNER=0xyour_private_key_here \
  -e API_KEY=your_api_key_here \
  agent-registry
```

**Using Docker Compose:**
```bash
# Copy environment file
cp env.example .env
# Edit .env with your values

# Start services
docker-compose up -d
```

---

### VPS/Cloud Deployment

**Prerequisites:**
- Ubuntu 20.04+ or similar
- Node.js 18+
- PM2 (process manager)

**Steps:**

1. **Server Setup**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2
   sudo npm install -g pm2
   ```

2. **Deploy Application**
   ```bash
   # Clone repository
   git clone https://github.com/your-username/agent-registry.git
   cd agent-registry
   
   # Install dependencies
   npm install
   
   # Set environment variables
   cp env.example .env
   nano .env  # Edit with your values
   ```

3. **Start with PM2**
   ```bash
   # Start application
   pm2 start src/server.ts --name agent-registry
   
   # Save PM2 configuration
   pm2 save
   pm2 startup
   ```

4. **Setup Nginx (Optional)**
   ```bash
   # Install Nginx
   sudo apt install nginx
   
   # Create configuration
   sudo nano /etc/nginx/sites-available/agent-registry
   ```

   **Nginx Configuration:**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## 🔧 Environment Configuration

### Required Variables

```bash
# Blockchain private key (required)
SIGNER=0xyour_private_key_here

# API key for authentication (required)
API_KEY=your_secure_api_key_here
```

### Optional Variables

```bash
# Server configuration
PORT=3000
NODE_ENV=production

# Logging
LOG_LEVEL=info

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Generate Secure API Key

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32

# Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

---

## 🏥 Health Monitoring

### Health Check Endpoint

```bash
# Check if service is running
curl http://localhost:3000/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2025-01-13T12:00:00.000Z",
  "account": "0x1234567890abcdef..."
}
```

### Monitoring Setup

**PM2 Monitoring:**
```bash
# View logs
pm2 logs agent-registry

# Monitor resources
pm2 monit

# Restart if needed
pm2 restart agent-registry
```

**Docker Monitoring:**
```bash
# View logs
docker logs agent-registry

# Monitor resources
docker stats agent-registry
```

---

## 🔒 Security Considerations

### Production Security

1. **Environment Variables**
   - Never commit private keys to git
   - Use strong, random API keys
   - Rotate keys periodically

2. **Network Security**
   - Use HTTPS in production
   - Configure firewall rules
   - Limit API access by IP if needed

3. **Application Security**
   - Keep dependencies updated
   - Monitor for security vulnerabilities
   - Use rate limiting

### Security Checklist

- [ ] Private key stored in environment variables
- [ ] API key is strong and random
- [ ] HTTPS enabled in production
- [ ] Firewall configured
- [ ] Dependencies updated
- [ ] Monitoring in place

---

## 📊 Performance Optimization

### Production Optimizations

1. **Node.js Settings**
   ```bash
   # Increase memory limit
   NODE_OPTIONS="--max-old-space-size=2048"
   ```

2. **PM2 Configuration**
   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [{
       name: 'agent-registry',
       script: 'src/server.ts',
       instances: 'max',
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'production'
       }
     }]
   };
   ```

3. **Nginx Optimization**
   ```nginx
   # Add to nginx.conf
   gzip on;
   gzip_types text/plain application/json;
   
   # Rate limiting
   limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
   limit_req zone=api burst=20 nodelay;
   ```

---

## 🚨 Troubleshooting

### Common Issues

**1. Port Already in Use**
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

**2. Environment Variables Not Loading**
```bash
# Check if .env file exists
ls -la .env

# Verify variables are set
echo $SIGNER
echo $API_KEY
```

**3. Blockchain Connection Issues**
```bash
# Check network connectivity
curl -X POST https://testnet.rpc.intuition.systems/http

# Verify private key format
node -e "console.log(process.env.SIGNER?.startsWith('0x'))"
```

**4. API Key Authentication Failing**
```bash
# Test API key
curl -X POST http://localhost:3000/v1/intuition/events \
  -H "x-api-key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"type": "test"}'
```

### Log Analysis

**View Application Logs:**
```bash
# PM2 logs
pm2 logs agent-registry --lines 100

# Docker logs
docker logs agent-registry -f

# Heroku logs
heroku logs --tail
```

---

## 📈 Scaling

### Horizontal Scaling

1. **Load Balancer Setup**
   - Use Nginx or HAProxy
   - Distribute traffic across instances
   - Health check configuration

2. **Multiple Instances**
   ```bash
   # Start multiple PM2 instances
   pm2 start src/server.ts -i max
   ```

3. **Database Considerations**
   - Consider external database for state
   - Implement caching layer
   - Monitor blockchain connection limits

---

*Last updated: January 2025*
