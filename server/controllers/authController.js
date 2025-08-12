const jwt = require('jsonwebtoken');
const axios = require('axios');
const crypto = require('crypto');
const User = require('../models/User');
const CreditTransaction = require('../models/CreditTransaction');
const TimezoneUtils = require('../utils/timezone');

class AuthController {
  // Generate PKCE code verifier and challenge
  generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
    
    return { codeVerifier, codeChallenge };
  }

  // Initiate X (Twitter) OAuth 2.0 login
  async initiateXLogin(req, res) {
    try {
      const { codeVerifier, codeChallenge } = this.generatePKCE();
      const state = crypto.randomBytes(16).toString('hex');
      
      // Store PKCE data in session
      const returnUrl = req.query.returnUrl || req.get('Referer') || '/';
      req.session.oauth = {
        codeVerifier,
        state,
        timestamp: Date.now(),
        returnUrl: returnUrl
      };
      
      console.log('🔐 OAuth login initiated, redirecting to:', returnUrl);
      
      const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('client_id', process.env.TWITTER_CLIENT_ID);
      authUrl.searchParams.append('redirect_uri', process.env.TWITTER_REDIRECT_URI);
      authUrl.searchParams.append('scope', 'tweet.read users.read');
      authUrl.searchParams.append('state', state);
      authUrl.searchParams.append('code_challenge', codeChallenge);
      authUrl.searchParams.append('code_challenge_method', 'S256');
      
      res.json({
        success: true,
        authUrl: authUrl.toString()
      });
    } catch (error) {
      console.error('X OAuth initiation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initiate X authentication'
      });
    }
  }

  // Handle X OAuth callback
  async handleXCallback(req, res) {
    try {
      const { code, state, error } = req.query;
      
      if (error) {
        return res.redirect('/?auth_error=' + encodeURIComponent(error));
      }
      
      if (!req.session.oauth || req.session.oauth.state !== state) {
        console.log('❌ OAuth state validation failed');
        return res.redirect('/?auth_error=invalid_state');
      }
      
      // Check session timeout (10 minutes)
      if (Date.now() - req.session.oauth.timestamp > 600000) {
        return res.redirect('/?auth_error=session_expired');
      }
      
      // Exchange code for access token
      const tokenResponse = await axios.post('https://api.twitter.com/2/oauth2/token', {
        code,
        grant_type: 'authorization_code',
        client_id: process.env.TWITTER_CLIENT_ID,
        redirect_uri: process.env.TWITTER_REDIRECT_URI,
        code_verifier: req.session.oauth.codeVerifier
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`
        }
      });
      
      const { access_token } = tokenResponse.data;
      
      // Get user info from Twitter
      const userResponse = await axios.get('https://api.twitter.com/2/users/me', {
        headers: {
          'Authorization': `Bearer ${access_token}`
        },
        params: {
          'user.fields': 'id,name,username,profile_image_url'
        }
      });
      
      const twitterUser = userResponse.data.data;
      
      // Find or create user
      let user = await User.findByTwitterId(twitterUser.id);
      let isNewUser = false;
      
      if (!user) {
        user = await User.createFromTwitter(twitterUser);
        isNewUser = true;
        
        // Record first login bonus transaction
        await CreditTransaction.recordTransaction({
          userId: user._id,
          userIP: req.ip,
          type: 'first_login_bonus',
          amount: 50,
          balanceAfter: user.credits,
          reason: 'First X login bonus',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      } else {
        // Update user info and last login
        user.displayName = twitterUser.name;
        user.twitterUsername = twitterUser.username;
        user.profileImage = twitterUser.profile_image_url || user.profileImage;
        await user.updateLastLogin();
        
        // Check for daily bonus
        if (user.canClaimDailyBonus()) {
          await user.claimDailyBonus();
          
          // Record daily bonus transaction
          await CreditTransaction.recordTransaction({
            userId: user._id,
            userIP: req.ip,
            type: 'daily_bonus',
            amount: 30,
            balanceAfter: user.credits,
            reason: 'Daily login bonus',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          });
        }
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user._id,
          twitterId: user.twitterId,
          username: user.twitterUsername
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      // Set HTTP-only cookie
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      // Get return URL from session
      const returnUrl = req.session.oauth.returnUrl || '/';
      
      // Clear OAuth session data
      delete req.session.oauth;
      
      // Redirect with success
      const baseUrl = returnUrl.includes('preview/meme-generator') ? '/preview/meme-generator' : returnUrl;
      const redirectUrl = isNewUser 
        ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}welcome=true&credits=50`
        : `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}login_success=true&credits=${user.credits}`;
      
      console.log('🔄 Redirecting to:', redirectUrl);
      res.redirect(redirectUrl);
      
    } catch (error) {
      console.error('X OAuth callback error:', error);
      res.redirect('/?auth_error=callback_failed');
    }
  }

  // Logout user
  async logout(req, res) {
    try {
      res.clearCookie('auth_token');
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to logout'
      });
    }
  }

  // Get current user info
  async getCurrentUser(req, res) {
    try {
      if (!req.user) {
        return res.json({
          success: false,
          authenticated: false
        });
      }
      
      res.json({
        success: true,
        authenticated: true,
        user: {
          id: req.user._id,
          twitterUsername: req.user.twitterUsername,
          displayName: req.user.getDisplayName(),
          profileImage: req.user.profileImage,
          credits: req.user.credits,
          totalCreditsEarned: req.user.totalCreditsEarned,
          canClaimDailyBonus: req.user.canClaimDailyBonus(),
          lastLogin: req.user.lastLogin
        }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user info'
      });
    }
  }

  // Claim daily bonus
  async claimDailyBonus(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      if (!req.user.canClaimDailyBonus()) {
        return res.status(400).json({
          success: false,
          error: 'Daily bonus already claimed today'
        });
      }
      
      await req.user.claimDailyBonus();
      
      // Record transaction
      await CreditTransaction.recordTransaction({
        userId: req.user._id,
        userIP: req.ip,
        type: 'daily_bonus',
        amount: 30,
        balanceAfter: req.user.credits,
        reason: 'Daily bonus claimed',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json({
        success: true,
        message: 'Daily bonus claimed!',
        credits: req.user.credits,
        bonusAmount: 30
      });
    } catch (error) {
      console.error('Daily bonus claim error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to claim daily bonus'
      });
    }
  }

  // Get user's credit history
  async getCreditHistory(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      const history = await CreditTransaction.getUserHistory(req.user._id);
      
      res.json({
        success: true,
        history: history.map(transaction => ({
          type: transaction.type,
          amount: transaction.amount,
          balanceAfter: transaction.balanceAfter,
          reason: transaction.reason,
          createdAt: transaction.createdAt,
          relatedMeme: transaction.relatedMemeId ? {
            id: transaction.relatedMemeId.id,
            image: transaction.relatedMemeId.finalMemeUrl
          } : null
        }))
      });
    } catch (error) {
      console.error('Get credit history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get credit history'
      });
    }
  }
}

module.exports = new AuthController();
