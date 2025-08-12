# 🚀 AquaCat Meme Generator - Memedeck.ai Enhancement Plan

## Project Overview
Enhance the existing Node.js/Express AquaCat meme generator to include production-ready memedeck.ai-style features: X (Twitter) authentication, credit system, advanced canvas editor, remix functionality, weekly competitions, and AWS Lightsail optimization pipeline.

## Current Architecture Analysis ✅

### Existing Foundation (What We Have):
- ✅ **Node.js/Express Server**: Fully functional with `server/app.js`
- ✅ **MongoDB Integration**: Models and database setup ready
- ✅ **Gallery System**: Working gallery with remix functionality
- ✅ **AI Integration**: Leonardo AI already connected
- ✅ **File Upload**: Multer-based upload system
- ✅ **Security**: Helmet, CORS, rate limiting configured
- ✅ **Frontend**: EJS templates with responsive design
- ✅ **Static Assets**: CSS/JS organized in `client/public/`

### Current File Structure:
```
aquacatcoin/
├── server/
│   ├── app.js                 # Main Express server
│   ├── controllers/           # AI, gallery, meme, social controllers
│   ├── models/               # MongoDB models (Meme, User)
│   ├── routes/               # API routes
│   └── database/             # Seeding and migrations
├── client/
│   ├── public/               # Static assets (CSS, JS, images)
│   └── views/                # EJS templates
└── generated/                # Generated meme files
```

## Enhancement Plan: Memedeck.ai Features

### Phase 1: Authentication & Credit System 🔐

#### 1.1 X (Twitter) OAuth 2.0 v2 (PKCE)
**Target Files:**
- `server/controllers/authController.js` (new)
- `server/routes/auth.js` (new)
- `server/models/User.js` (enhance existing)
- `client/views/partials/header.ejs` (update)

**Implementation:**
```javascript
// Enhanced User model with credits and X auth
{
  twitterId: String,
  username: String,
  displayName: String,
  profileImage: String,
  credits: { type: Number, default: 0 },
  totalCreditsEarned: Number,
  lastDailyBonus: Date,
  firstLogin: { type: Boolean, default: true },
  createdAt: Date
}
```

**New Routes:**
- `GET /auth/x/login` - Initiate X OAuth
- `GET /auth/x/callback` - Handle OAuth callback
- `POST /auth/logout` - Logout user
- `GET /api/user/credits` - Get user credits
- `POST /api/user/daily-bonus` - Claim daily bonus

#### 1.2 Credit System
**Rules:**
- Anonymous: 3 generations per rolling 24h
- First X login: +50 credits bonus
- Daily login: +20 credits bonus
- AI Generation: 5 credits per use
- Remix: 5 credits per use

**Implementation:**
- `server/middleware/credits.js` - Credit validation middleware
- `server/controllers/creditsController.js` - Credit management
- Database tracking of all credit transactions

### Phase 2: Advanced Canvas Editor 🎨

#### 2.1 Enhanced Frontend Canvas
**Target Files:**
- `client/public/js/meme-generator.js` (major enhancement)
- `client/public/css/meme-generator.css` (styling updates)
- `client/views/meme-generator.ejs` (UI enhancements)

**New Features:**
- **Layer Management**: Add, reorder, lock/unlock layers
- **Advanced Text Tools**: 
  - ≥10 meme-friendly fonts (Impact, Anton, Bebas Neue, etc.)
  - Font size, color picker, stroke, shadow, opacity
  - Text alignment and rotation
- **Shape Tools**: Rectangles, circles, arrows
- **Effects**: Blend modes, filters
- **Undo/Redo**: Full history management
- **Keyboard Shortcuts**: Standard shortcuts (Ctrl+Z, etc.)
- **Auto-save**: Local storage backup

#### 2.2 Server-side Canvas Processing
**Target Files:**
- `server/controllers/canvasController.js` (new)
- `server/routes/canvas.js` (new)

**Features:**
- Server-side canvas flattening using Sharp
- Layer composition and effects processing
- High-quality export generation

### Phase 3: AWS Lightsail Integration ☁️

#### 3.1 Asynchronous Optimization Pipeline
**Architecture:**
```
Upload → Lightsail (full) → Lambda (Sharp) → Derivatives → Webhook → App
```

**Target Files:**
- `server/services/lightsailService.js` (new)
- `server/controllers/mediaController.js` (new)
- `lambda/imageOptimizer.js` (new - separate deployment)

**Implementation:**
1. **Immediate Upload**: Original to `/generations/{id}/full.{ext}`
2. **Lambda Processing**: Generate 300.webp, 600.webp, optional AVIF
3. **Webhook Update**: POST to `/api/media/derivative-complete`
4. **Frontend Fallback**: Use `srcset` with progressive loading

#### 3.2 Storage Strategy
- **Signed PUT URLs**: Secure uploads to Lightsail
- **Public GET**: Direct serving via Lightsail endpoint
- **CDN Integration**: Optional CloudFront for global distribution
- **Cache Headers**: `Cache-Control: public, max-age=31536000, immutable`

### Phase 4: Enhanced Gallery & Remix System 🖼️

#### 4.1 3×3 Gallery Layout
**Target Files:**
- `client/views/gallery.ejs` (major update)
- `client/public/css/gallery.css` (responsive grid)
- `client/public/js/gallery.js` (enhanced interactions)

**Features:**
- **3×3 Grid**: 9 memes per page with pagination
- **Like System**: Heart icons with real-time updates
- **Share Functionality**: Social media sharing
- **Remix Button**: "Remix (5 credits)" with credit deduction
- **User Attribution**: Show username or "Anonymous"
- **OG Tags**: Proper meta tags for social sharing

#### 4.2 Enhanced Remix System
**Target Files:**
- `server/controllers/remixController.js` (new)
- `server/routes/remix.js` (new)

**Rules:**
- Only original/AI images can be remixed (not final edited versions)
- Remix loads clean original image without text overlays
- 5 credits deducted per remix
- Attribution to original creator
- New meme created (not version of original)

### Phase 5: Weekly Competition System 🏆

#### 5.1 Competition Infrastructure
**Target Files:**
- `server/models/Competition.js` (new)
- `server/controllers/competitionController.js` (new)
- `server/routes/competition.js` (new)

**Database Schema:**
```javascript
Competition: {
  weekStart: Date,        // Monday 00:00 Australia/Sydney
  weekEnd: Date,          // Sunday 23:59 Australia/Sydney
  status: String,         // 'active', 'ended', 'winner_declared'
  winnerId: ObjectId,     // Winning meme ID
  prizeAmount: Number,    // $10 USD
  prizeCurrency: String,  // 'SUI'
  totalEntries: Number,
  totalLikes: Number
}
```

#### 5.2 Competition Features
- **Weekly Cycles**: Monday-Sunday (Oregon/Pacific timezone)
- **Prize**: $10 USD in SUI tokens
- **Voting**: Most liked meme wins
- **Banner**: Prominent competition banner on homepage
- **Leaderboard**: Real-time competition standings
- **Admin Panel**: Declare winners manually

### Phase 6: Production Features 🚀

#### 6.1 Rate Limiting & Security
**Enhancements:**
- **Oregon Timezone**: All rate limits enforced in Pacific Time (America/Los_Angeles)
- **Anonymous Limits**: 3 generations per rolling 24h by IP
- **Authenticated Limits**: Credit-based system
- **API Security**: JWT tokens, request validation
- **CSRF Protection**: Token-based protection

#### 6.2 Terms of Use & Legal
**Target Files:**
- `client/views/terms.ejs` (new)
- `server/routes/legal.js` (new)

**Content:**
- **Ownership**: All creations assigned to $AQUA for community use
- **Usage Rights**: Free use for $AQUA benefit
- **Competition Rules**: Eligibility and admin discretion
- **Privacy Policy**: No PII selling, aggregate stats for marketing
- **Rate Limits**: Clear explanation of anonymous vs authenticated benefits (Oregon timezone)
- **Timezone**: All rate limits, daily bonuses, and competitions use Oregon time (America/Los_Angeles)

## Implementation Phases & Timeline

### Phase 1: Foundation (Week 1)
- [x] Existing codebase assessment ✅
- [ ] X OAuth 2.0 implementation
- [ ] Credit system backend
- [ ] User authentication UI
- **Deliverable**: Working X login with credit system

### Phase 2: Canvas Enhancement (Week 2)
- [ ] Advanced canvas editor frontend
- [ ] Layer management system
- [ ] Font library integration (≥10 fonts)
- [ ] Server-side canvas processing
- **Deliverable**: Professional-grade meme editor

### Phase 3: Lightsail Integration (Week 3)
- [ ] AWS Lightsail service setup
- [ ] Lambda optimization pipeline
- [ ] Webhook system implementation
- [ ] Frontend progressive loading
- **Deliverable**: Optimized image delivery system

### Phase 4: Gallery & Competition (Week 4)
- [ ] 3×3 gallery redesign
- [ ] Enhanced remix system
- [ ] Weekly competition infrastructure
- [ ] Admin competition management
- **Deliverable**: Complete gallery and competition system

### Phase 5: Production Polish (Week 5)
- [ ] Terms of use implementation
- [ ] Security hardening
- [ ] Performance optimization
- [ ] Mobile responsiveness
- **Deliverable**: Production-ready application

## Technical Architecture

### Enhanced API Endpoints

#### Authentication
```
POST /auth/x/login              # Initiate X OAuth
GET  /auth/x/callback           # OAuth callback
POST /auth/logout               # Logout
GET  /api/user/me               # Get user info
POST /api/user/daily-bonus      # Claim daily bonus
```

#### Credits & Limits
```
GET  /api/credits/balance       # Get user credits
GET  /api/credits/history       # Credit transaction history
GET  /api/limits/remaining      # Anonymous generations remaining
POST /api/limits/check          # Check if action allowed
```

#### Enhanced Generation
```
POST /api/generate              # AI generation (5 credits)
POST /api/canvas/save           # Save canvas draft
POST /api/canvas/publish        # Publish final meme
GET  /api/canvas/fonts          # Get available fonts
```

#### Gallery & Remix
```
GET  /api/gallery               # 3×3 paginated gallery
POST /api/gallery/:id/like      # Like meme
POST /api/gallery/:id/share     # Track share
GET  /api/remix/:id             # Get remix data (5 credits)
POST /api/remix/:id/create      # Create remix
```

#### Competition
```
GET  /api/competition/current   # Current week competition
GET  /api/competition/leaderboard # Competition standings
POST /api/competition/enter     # Enter meme in competition
```

#### Media (Lightsail)
```
POST /api/media/upload          # Get signed upload URL
POST /api/media/derivative-complete # Webhook from Lambda
GET  /api/media/:id/variants    # Get available image sizes
```

### Database Schema Updates

#### Enhanced User Model
```javascript
User: {
  // X OAuth fields
  twitterId: String,
  username: String,
  displayName: String,
  profileImage: String,
  
  // Credit system
  credits: { type: Number, default: 0 },
  totalCreditsEarned: Number,
  lastDailyBonus: Date,
  firstLogin: { type: Boolean, default: true },
  
  // Rate limiting
  lastGenerationDate: Date,
  dailyGenerationCount: Number,
  
  // Competition
  competitionEntries: [ObjectId],
  totalWins: Number
}
```

#### Enhanced Meme Model
```javascript
Meme: {
  // Existing fields...
  
  // Lightsail integration
  variants: [{
    key: String,      // Lightsail object key
    width: Number,    // 300, 600, etc.
    format: String,   // 'webp', 'avif'
    url: String       // Full Lightsail URL
  }],
  
  // Competition
  competitionWeek: ObjectId,
  isCompetitionEntry: Boolean,
  
  // Enhanced remix
  remixCost: Number,          // Credits charged for remix
  remixedBy: ObjectId,        // User who remixed
  originalCreator: ObjectId   // Original image creator
}
```

## Environment Variables

### New Required Variables
```env
# X (Twitter) OAuth
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
TWITTER_REDIRECT_URI=https://aquacatcoin.xyz/auth/x/callback

# Credit System
ANONYMOUS_GENERATION_LIMIT=3
AUTHENTICATED_GENERATION_COST=5
REMIX_COST=5
FIRST_LOGIN_BONUS=50
DAILY_BONUS=20

# AWS Lightsail
LIGHTSAIL_BUCKET_NAME=aquacat-kylescoins
LIGHTSAIL_ENDPOINT=https://your-region.amazonaws.com
LIGHTSAIL_REGION=us-west-2
LIGHTSAIL_ACCESS_KEY_ID=your_access_key
LIGHTSAIL_SECRET_ACCESS_KEY=your_secret_key

# Competition
WEEKLY_PRIZE_AMOUNT=10
PRIZE_CURRENCY=SUI
COMPETITION_TIMEZONE=America/Los_Angeles

# Security
JWT_SECRET=your_jwt_secret_key
INTERNAL_WEBHOOK_TOKEN=your_webhook_secret

# Lambda
LAMBDA_WEBHOOK_URL=https://aquacatcoin.xyz/api/media/derivative-complete
```

## Deployment Strategy

### Existing Infrastructure ✅
Your current deployment setup in `DEPLOYMENT.md` remains valid with these additions:

#### Additional Dependencies
```bash
# Install new packages
npm install passport passport-twitter jsonwebtoken bcryptjs aws-sdk luxon
```

#### Environment Setup
```bash
# Copy new environment variables
cp local.env .env
# Edit .env with production values
nano .env
```

#### Database Migration
```bash
# Run new model migrations
npm run migrate
# Seed competition data
npm run seed:competition
```

### AWS Lambda Deployment (New)
```bash
# Package Lambda function
cd lambda
zip -r image-optimizer.zip .
# Deploy via AWS CLI or Console
aws lambda update-function-code --function-name aquacat-optimizer --zip-file fileb://image-optimizer.zip
```

## Success Metrics

### User Engagement
- **X Authentication Rate**: Target 40% of users sign in
- **Daily Active Users**: Track returning users for daily bonus
- **Credit Consumption**: Monitor generation vs remix usage
- **Competition Participation**: Weekly entry rates

### Technical Performance
- **Image Load Times**: <2s for optimized variants
- **Canvas Responsiveness**: <100ms for tool interactions
- **API Response Times**: <500ms for all endpoints
- **Uptime**: 99.9% availability target

### Business Metrics
- **Community Growth**: Track meme creation and sharing
- **Competition Engagement**: Weekly participation rates
- **Content Quality**: Like-to-view ratios
- **Remix Activity**: Original vs remix creation balance

## Risk Mitigation

### Technical Risks
- **Lightsail Costs**: Implement usage monitoring and alerts
- **Lambda Cold Starts**: Use provisioned concurrency for optimization
- **Database Performance**: Index optimization for credit queries
- **Rate Limiting**: Redis-based distributed rate limiting

### Business Risks
- **Credit System Abuse**: IP-based rate limiting + behavioral analysis
- **Competition Fairness**: Admin oversight + community reporting
- **Content Moderation**: Automated + manual review system
- **Legal Compliance**: Clear ToS + content ownership assignment

## Next Steps

### Immediate Actions (This Week)
1. **Assess Current Codebase**: Review existing functionality ✅
2. **Plan X OAuth Integration**: Research Twitter API v2 requirements
3. **Design Credit System**: Database schema and API contracts
4. **Prototype Canvas Enhancements**: Test layer management feasibility

### Development Priority
1. **X Authentication** (Highest) - Unlocks credit system
2. **Credit System** (High) - Enables paid features
3. **Canvas Editor** (High) - Core user experience
4. **Lightsail Integration** (Medium) - Performance optimization
5. **Competition System** (Medium) - Community engagement

---

## Summary

This enhancement plan builds on your existing Node.js/Express foundation to add memedeck.ai-style features while maintaining your current architecture and deployment strategy. The phased approach ensures minimal disruption to your existing functionality while systematically adding the requested features.

**Estimated Timeline**: 5 weeks for full implementation
**Estimated Cost**: AWS Lightsail + Lambda costs (~$20-50/month depending on usage)
**Risk Level**: Low (building on proven foundation)

Ready to begin Phase 1 with X OAuth integration! 🚀

