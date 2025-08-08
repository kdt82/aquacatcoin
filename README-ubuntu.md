#  Web App – Ubuntu Server Installation Guide

This guide walks you through deploying the  site (Express + EJS) on a fresh Ubuntu 22.04/24.04 server.

## 1) System update
`ash
sudo apt update && sudo apt -y upgrade
sudo apt -y install build-essential git curl ufw
`

## 2) Install Node.js (LTS) and npm
Use NodeSource for a current LTS (recommended >= 20.x).
`ash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt -y install nodejs
node -v && npm -v
`

Optional: install PM2 process manager.
`ash
sudo npm i -g pm2
pm2 -v
`

## 3) Clone the repo
`ash
cd /var/www
sudo git clone https://github.com/kdt82/aquacatcoin.git
sudo chown -R : aquacatcoin
cd aquacatcoin
`

## 4) Environment variables
Create a .env file in the project root (same folder as package.json).
`ash
cp env.example .env
nano .env
`
Fill in the values as needed:
`
PORT=3000
NODE_ENV=production
LEONARDO_API_KEY=your_key_here
MONGODB_URI=mongodb+srv://... (only if using DB features)
`

## 5) Install dependencies
`ash
npm ci --omit=dev   # production install
# or: npm install
`

## 6) First run (manual)
`ash
npm start
`
The server listens on the port in .env (default 3000):
- http://SERVER_IP:3000

## 7) Run with PM2 (recommended)
`ash
pm2 start server/app.js --name aqua --update-env
pm2 save
pm2 startup systemd   # follow the printed command to enable at boot
`
Useful PM2 commands:
`ash
pm2 status
pm2 logs aqua --lines 100
pm2 restart aqua
pm2 stop aqua
`

## 8) Configure firewall (UFW)
`ash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp   # only if exposing Node directly
sudo ufw enable
sudo ufw status
`

## 9) Optional – reverse proxy with Nginx
`ash
sudo apt -y install nginx
sudo nano /etc/nginx/sites-available/aqua.conf
`
Paste:
`
server {
  listen 80;
  server_name your.domain.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade ;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host System.Management.Automation.Internal.Host.InternalHost;
    proxy_cache_bypass ;
  }
}
`
Enable and test:
`ash
sudo ln -s /etc/nginx/sites-available/aqua.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
`

## 10) SSL (Let’s Encrypt)
If you have a domain pointing to the server:
`ash
sudo apt -y install certbot python3-certbot-nginx
sudo certbot --nginx -d your.domain.com
`
Certificates auto‑renew via systemd timer.

## 11) Updating the app
`ash
cd /var/www/aquacatcoin
git pull
npm ci --omit=dev
pm2 restart aqua
`

## 12) Troubleshooting
- Port already in use: change PORT in .env or stop the other process.
- 502 via Nginx: verify Node app is running and proxy_pass URL/port.
- Static assets: served from client/public. Paths are already configured in the Express app.
- Logs: pm2 logs aqua or check Nginx error logs sudo journalctl -u nginx -e.

## 13) Quick checklist
- [ ] Node LTS installed
- [ ] Repo cloned to /var/www/aquacatcoin
- [ ] .env created with required keys
- [ ] 
pm ci --omit=dev
- [ ] Running with pm2 start server/app.js --name aqua
- [ ] (Optional) Nginx reverse proxy + SSL

Happy deploying! ☔️
