# 🚂 Railway Migration Plan - AquaCat Meme Generator

## 📋 Executive Summary

**Migration Strategy**: Move entire application from AWS Lightsail to Railway.app with GitHub-based deployment, transitioning preview routes to live production routes.

**Timeline**: 4-6 hours total implementation  
**Cost Savings**: $50+/month vs AWS setup  
**Your Credits**: Cover 3-6 months of hosting  
**Risk Level**: Low (Railway handles infrastructure)  

---

## 🔍 Current Codebase Analysis

### ✅ Railway Compatibility Assessment:
- **Node.js/Express**: ✅ Perfect fit for Railway
- **MongoDB**: ✅ Railway offers MongoDB service 
- **File Uploads**: ✅ Railway supports file uploads
- **Static Assets**: ✅ Railway serves static files
- **Environment Variables**: ✅ Railway env management
- **Port Configuration**: ✅ Railway handles PORT automatically

### 🎯 Current Route Structure:
```
LIVE ROUTES (Coming Soon pages):
├── /meme-generator          → coming-soon.ejs
├── /gallery                 → coming-soon.ejs  
└── /meme-generator/terms    → meme-generator.ejs

PREVIEW ROUTES (Functional):
├── /preview/meme-generator  → meme-generator.ejs (FUNCTIONAL)
├── /preview/gallery         → gallery.ejs (FUNCTIONAL)
├── /preview/meme-generator/terms → meme-generator.ejs (FUNCTIONAL)
└── /dev-preview             → dev-preview.ejs (TESTING DASHBOARD)
```

### 🔄 Post-Migration Route Strategy:
```
PRODUCTION ROUTES (After Migration):
├── /meme-generator          → meme-generator.ejs (LIVE)
├── /gallery                 → gallery.ejs (LIVE)
├── /meme-generator/terms    → meme-generator.ejs (LIVE)
└── /dev-preview             → REMOVE (development only)
```

---

## 🚀 MIGRATION PHASES

### **Phase 1: Pre-Migration Setup** ⏱️ *30 minutes*

#### 1.1 Railway Account Setup
- [ ] **Verify Railway Credits**: Check current credit balance
- [ ] **Connect GitHub**: Link your GitHub account to Railway
- [ ] **Create New Project**: `aquacat-meme-generator`

#### 1.2 GitHub Repository Preparation  
- [ ] **Commit Current Changes**: Ensure all work is committed
- [ ] **Create Production Branch**: `git checkout -b production`
- [ ] **Push to GitHub**: Ensure repo is up-to-date

#### 1.3 Code Modifications for Production
**Files to Modify:**

**1. `server/routes/website.js` - Make preview routes live:**
```javascript
// REMOVE these "coming soon" routes:
router.get('/meme-generator', (req, res) => {
  res.render('coming-soon', { ... }); // ❌ REMOVE
});

router.get('/gallery', (req, res) => {
  res.render('coming-soon', { ... }); // ❌ REMOVE  
});

// REPLACE with functional routes (copy from preview routes):
router.get('/meme-generator', (req, res) => {
  res.render('meme-generator', {
    title: '$AQUA Meme Generator | Create & Share Crypto Memes', // Remove [PREVIEW]
    description: 'Create hilarious $AQUA memes with our AI-powered generator!',
    canonicalUrl: 'https://aquacatcoin.xyz/meme-generator',
    ogImage: 'https://aquacatcoin.xyz/aquacat.png',
    currentPath: '/meme-generator'
  });
});

router.get('/gallery', (req, res) => {
  res.render('gallery', {
    title: '$AQUA Meme Gallery | Community Created Crypto Memes', // Remove [PREVIEW]
    description: 'Explore the funniest $AQUA memes created by our community!',
    canonicalUrl: 'https://aquacatcoin.xyz/gallery',
    ogImage: 'https://aquacatcoin.xyz/aquacat.png',
    currentPath: '/gallery'
  });
});
```

**2. `local.env` → `.env` - Railway environment variables:**
```env
# Railway automatically provides DATABASE_URL for MongoDB
# Keep your existing variables:
LEONARDO_API_KEY=fbba2d08-d6e3-452f-b008-6e0dce226b85
AQUA_MODEL_ID=b2614463-296c-462a-9586-aafdb8f00e36
JWT_SECRET=aqua_jwt_production_secret_key_2024
SESSION_SECRET=aqua_session_production_secret_2024

# Remove development-specific settings:
# RATE_LIMIT_WHITELIST_IPS (not needed in production)
```

**3. `server/app.js` - Railway compatibility:**
```javascript
// Update database connection for Railway
const mongoURI = process.env.DATABASE_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/aqua-memes';

// Update CORS for Railway domain
origin: process.env.NODE_ENV === 'production' 
  ? ['https://aquacat-meme-generator.up.railway.app', 'https://aquacatcoin.xyz']
  : ['http://localhost:3000'],
```

**4. Create `railway.json` (Railway configuration):**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**5. Update `package.json` scripts:**
```json
{
  "scripts": {
    "start": "node server/app.js",
    "dev": "nodemon server/app.js",
    "seed": "node server/database/seed.js"
  }
}
```

---

### **Phase 2: Railway Deployment** ⏱️ *45 minutes*

#### 2.1 Create Railway Services
1. **Web Service**: 
   - Connect to GitHub repository
   - Select `main` or `production` branch
   - Railway auto-detects Node.js

2. **MongoDB Service**:
   - Add MongoDB from Railway services
   - Railway provides `DATABASE_URL` automatically

#### 2.2 Environment Variables Setup
```bash
# In Railway dashboard, add these variables:
LEONARDO_API_KEY=fbba2d08-d6e3-452f-b008-6e0dce226b85
AQUA_MODEL_ID=b2614463-296c-462a-9586-aafdb8f00e36
JWT_SECRET=aqua_jwt_production_secret_key_2024
SESSION_SECRET=aqua_session_production_secret_2024
NODE_ENV=production
```

#### 2.3 Deploy and Test
- [ ] **Initial Deploy**: Railway builds and deploys automatically
- [ ] **Check Logs**: Monitor deployment in Railway dashboard  
- [ ] **Test Health**: Visit `https://your-app.up.railway.app/health`
- [ ] **Seed Database**: Run seed command via Railway CLI

---

### **Phase 3: DNS and Domain Setup** ⏱️ *30 minutes*

#### 3.1 Custom Domain (Optional)
- [ ] **Add Domain**: `aquacatcoin.xyz` in Railway dashboard
- [ ] **Update DNS**: Point domain to Railway
- [ ] **SSL Certificate**: Railway handles automatically

#### 3.2 Verify Live Routes
- [ ] **Test Meme Generator**: `https://aquacatcoin.xyz/meme-generator`
- [ ] **Test Gallery**: `https://aquacatcoin.xyz/gallery`  
- [ ] **Test API Endpoints**: All `/api/*` routes functional

---

### **Phase 4: Post-Migration Cleanup** ⏱️ *15 minutes*

#### 4.1 Remove Development Routes
```javascript
// Remove these from server/routes/website.js:
router.get('/dev-preview', ...);        // REMOVE
router.get('/debug/ip', ...);           // REMOVE  
router.get('/debug/leonardo-models', ...); // REMOVE
```

#### 4.2 Update Links in Frontend
- [ ] **Navigation Links**: Update any hardcoded preview URLs
- [ ] **Redirect Rules**: Add redirects from old preview URLs

---

## 🔧 Technical Requirements

### **Railway Project Structure:**
```
aquacat-meme-generator/
├── 🌐 Web Service (Node.js)
│   ├── Source: GitHub (kdt82/aquacatcoin)
│   ├── Branch: main/production  
│   ├── Build: npm install && npm run build
│   └── Start: npm start
├── 🗄️ MongoDB Service
│   ├── Version: 6.0
│   ├── Storage: 1GB (expandable)
│   └── Connection: DATABASE_URL (auto-provided)
└── 📁 File Storage (Built-in)
    ├── Uploads: /uploads directory
    └── Generated: /generated directory
```

### **Environment Variables Mapping:**
| Current (local.env) | Railway | Notes |
|-------------------|---------|--------|
| `MONGODB_URI` | `DATABASE_URL` | Auto-provided by Railway |
| `PORT` | `PORT` | Auto-provided by Railway |
| `NODE_ENV=development` | `NODE_ENV=production` | Set manually |
| `RATE_LIMIT_WHITELIST_IPS` | *Remove* | Not needed in production |
| All other vars | *Same* | Copy as-is |

---

## 💰 Cost Analysis

### **Current Monthly Costs:**
- AWS Lightsail Server: ~$20/month
- AWS Lightsail Storage: ~$5/month  
- MongoDB Atlas/DocumentDB: ~$50/month
- **Total**: ~$75/month

### **Railway Monthly Costs:**
- Web Service: $5/month
- MongoDB Service: $5/month
- File Storage: ~$1/month
- **Total**: ~$11/month
- **With Your Credits**: $0/month for 3-6 months

### **Annual Savings**: $768/year ($75 - $11 = $64/month × 12)

---

## 🚨 Risk Mitigation

### **Technical Risks:**
- ✅ **Database Migration**: Export/import data safely
- ✅ **File Storage**: Railway handles file uploads
- ✅ **Environment Variables**: Careful mapping from local.env
- ✅ **Domain Downtime**: Test on Railway subdomain first

### **Business Risks:**
- ✅ **SEO Impact**: Minimal (same domain, same routes)
- ✅ **User Experience**: Improved (faster Railway infrastructure)
- ✅ **Cost Control**: Predictable pricing, your credits cover months

---

## 📋 MIGRATION CHECKLIST

### **Phase 1: Preparation** 
- [ ] Railway account verified with credits
- [ ] GitHub repository up-to-date
- [ ] Code changes prepared (routes, config)
- [ ] Environment variables documented

### **Phase 2: Railway Setup**
- [ ] Railway project created
- [ ] GitHub connected for auto-deploy
- [ ] MongoDB service added
- [ ] Environment variables configured

### **Phase 3: Deployment**
- [ ] Initial deployment successful
- [ ] Database seeded with sample data
- [ ] All API endpoints functional
- [ ] Static files serving correctly

### **Phase 4: Go-Live**
- [ ] Custom domain configured
- [ ] DNS updated to Railway
- [ ] SSL certificate active
- [ ] All routes functional

### **Phase 5: Validation**
- [ ] Meme generator working
- [ ] Gallery displaying memes
- [ ] AI generation functional
- [ ] File uploads working

### **Phase 6: Cleanup**
- [ ] AWS Lightsail services cancelled
- [ ] Development routes removed
- [ ] Documentation updated
- [ ] Team notified of new URLs

---

## 🎉 SUCCESS METRICS

**This migration provides:**
- ✅ **Massive cost savings** ($50+/month)
- ✅ **Simplified infrastructure** (no server management)
- ✅ **Better developer experience** (Git-based deployment)
- ✅ **Scalable foundation** (Railway handles growth)
- ✅ **Your credits cover months** of free hosting

**Estimated timeline**: 4-6 hours from start to live
**Risk level**: Low (Railway handles infrastructure)
**Rollback plan**: Keep AWS running until confirmed working

---

*Ready to begin Phase 1!* 🚀
