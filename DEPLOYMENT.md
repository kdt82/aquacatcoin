# $AQUA Deployment Guide

## 🚀 **RECOMMENDED: Railway Deployment (CURRENT PRODUCTION)**

**✅ LIVE PRODUCTION**: The $AQUA meme generator is currently deployed on Railway.app

- **Live URL**: https://aquacatcoin.xyz
- **Railway URL**: https://10yw7z80.up.railway.app  
- **Deployment**: Automatic via GitHub integration
- **Cost**: ~$11/month (vs $75/month on Ubuntu server)
- **Management**: Zero server maintenance required

### Quick Railway Setup:
1. **Connect GitHub** to Railway.app
2. **Add custom domain** `aquacatcoin.xyz` 
3. **Update DNS** CNAME to Railway target
4. **Auto-deploy** on every git push

---

## 📋 **ALTERNATIVE: Ubuntu Server Deployment**

*Note: The following Ubuntu deployment guide is kept for reference, but Railway is the recommended and current production setup.*

Deploy your $AQUA website to an Ubuntu server in under 10 minutes.

## Prerequisites
- Ubuntu 20.04+ server with root/sudo access
- Domain name pointed to your server (optional but recommended)

## Quick Deployment

### Step 1: Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essentials
sudo apt install -y curl git nginx ufw

# Setup firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

### Step 2: Install Node.js
```bash
# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 process manager
sudo npm install -g pm2

# Verify installation
node --version && npm --version
```

### Step 3: Clone and Setup Project
```bash
# Clone repository
cd /var/www
sudo git clone https://github.com/kdt82/aquacatcoin.git
sudo chown -R $USER:$USER aquacatcoin
cd aquacatcoin

# Install dependencies
npm install --production

# Setup environment file
cp env.example .env
nano .env
```

**Edit your .env file:**
```env
PORT=3000
NODE_ENV=production
LEONARDO_API_KEY=your_leonardo_api_key_here
```

### Step 4: Start Application
```bash
# Start with PM2
pm2 start server/app.js --name aqua-web

# Save PM2 configuration
pm2 save
pm2 startup

# Verify it's running
pm2 status
```

### Step 5: Configure Nginx
```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/aqua
```

**Paste this configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Serve static files directly
    location /css/ {
        alias /var/www/aquacatcoin/client/public/css/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /js/ {
        alias /var/www/aquacatcoin/client/public/js/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /images/ {
        alias /var/www/aquacatcoin/client/public/images/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

**Enable the site:**
```bash
# Enable site and restart Nginx
sudo ln -s /etc/nginx/sites-available/aqua /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 6: SSL Certificate (Recommended)
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Verify auto-renewal
sudo certbot renew --dry-run
```

## Your Site is Live! 🎉

Visit your domain to see your $AQUA website running.

## Useful Commands

### Application Management
```bash
# View logs
pm2 logs aqua-web

# Restart application
pm2 restart aqua-web

# Stop application
pm2 stop aqua-web

# Monitor resources
pm2 monit
```

### Updates
```bash
# Update application
cd /var/www/aquacatcoin
git pull origin main
npm install --production
pm2 restart aqua-web
```

### Nginx Management
```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# View error logs
sudo tail -f /var/log/nginx/error.log
```

## Troubleshooting

### Application Won't Start
```bash
# Check PM2 status
pm2 status

# View detailed logs
pm2 logs aqua-web --lines 50

# Check if port is in use
sudo netstat -tulpn | grep :3000
```

### 502 Bad Gateway
- Ensure Node.js application is running: `pm2 status`
- Check Nginx configuration: `sudo nginx -t`
- Verify proxy_pass URL matches your app port

### SSL Issues
```bash
# Check certificate status
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal
```

## Security Best Practices

1. **Keep system updated:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Regular backups:**
   ```bash
   # Backup your .env file
   cp .env .env.backup
   ```

3. **Monitor logs:**
   ```bash
   pm2 logs aqua-web
   sudo tail -f /var/log/nginx/access.log
   ```

## Performance Optimization

### Enable Gzip in Nginx
Add to your server block:
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

### Set up log rotation
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

---

**Need help?** Check the application logs first: `pm2 logs aqua-web`

Your $AQUA website should now be running smoothly on Ubuntu! 🐱💧