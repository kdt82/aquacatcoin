const jwt = require('jsonwebtoken');
const User = require('../models/User');
const CreditTransaction = require('../models/CreditTransaction');
const TimezoneUtils = require('../utils/timezone');

// IP Whitelist Helper
const isWhitelistedIP = (ip) => {
  const whitelist = process.env.RATE_LIMIT_WHITELIST_IPS || '';
  const whitelistedIPs = whitelist.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0);
  
  // Add hardcoded whitelist for development
  const hardcodedWhitelist = ['125.253.17.216', '127.0.0.1', 'localhost'];
  
  return whitelistedIPs.includes(ip) || hardcodedWhitelist.includes(ip);
};

// JWT Authentication Middleware
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.cookies.auth_token;
    
    if (!token) {
      req.user = null;
      return next();
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      res.clearCookie('auth_token');
      req.user = null;
      return next();
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    res.clearCookie('auth_token');
    req.user = null;
    next();
  }
};

// Require authentication
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
  next();
};

// Check if user has sufficient credits
const requireCredits = (amount) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required for credit-based actions',
          code: 'AUTH_REQUIRED'
        });
      }
      
      if (!req.user.hasCredits(amount)) {
        return res.status(402).json({
          success: false,
          error: `Insufficient credits. Required: ${amount}, Available: ${req.user.credits}`,
          code: 'INSUFFICIENT_CREDITS',
          required: amount,
          available: req.user.credits
        });
      }
      
      next();
    } catch (error) {
      console.error('Credit check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check credits'
      });
    }
  };
};

// Check anonymous rate limits (3 generations per 24 hours)
const checkAnonymousLimits = async (req, res, next) => {
  try {
    // If user is authenticated, skip anonymous limits
    if (req.user) {
      return next();
    }
    
    const userIP = req.ip;
    
    // Check if IP is whitelisted for unlimited access
    if (isWhitelistedIP(userIP)) {
      console.log(`🟢 Anonymous limits bypassed for whitelisted IP: ${userIP}`);
      return next();
    }
    
    const generationCount = await CreditTransaction.getAnonymousGenerationCount(userIP);
    
    if (generationCount >= 3) {
      return res.status(429).json({
        success: false,
        error: 'Anonymous generation limit reached (3 per day). Please sign in with X to get more generations.',
        code: 'ANONYMOUS_LIMIT_REACHED',
        limit: 3,
        used: generationCount,
        resetTime: TimezoneUtils.getRateLimitReset(),
        timezone: TimezoneUtils.getTimezoneInfo()
      });
    }
    
    // Record the anonymous generation attempt
    await CreditTransaction.recordTransaction({
      userIP: userIP,
      type: 'anonymous_limit',
      amount: 0,
      anonymousCount: generationCount + 1,
      reason: 'Anonymous generation tracking',
      ipAddress: userIP,
      userAgent: req.get('User-Agent')
    });
    
    next();
  } catch (error) {
    console.error('Anonymous limit check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check generation limits'
    });
  }
};

// Deduct credits for an action
const deductCredits = (amount, reason) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required for credit deduction',
          code: 'AUTH_REQUIRED'
        });
      }
      
      // Deduct credits
      await req.user.deductCredits(amount);
      
      // Record transaction
      await CreditTransaction.recordTransaction({
        userId: req.user._id,
        userIP: req.ip,
        type: reason.includes('generation') ? 'generation_cost' : 'remix_cost',
        amount: -amount,
        balanceAfter: req.user.credits,
        reason: reason,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      // Add credit info to request for response
      req.creditDeduction = {
        amount: amount,
        balanceAfter: req.user.credits,
        reason: reason
      };
      
      next();
    } catch (error) {
      console.error('Credit deduction error:', error);
      
      if (error.message === 'Insufficient credits') {
        return res.status(402).json({
          success: false,
          error: `Insufficient credits. Required: ${amount}, Available: ${req.user.credits}`,
          code: 'INSUFFICIENT_CREDITS',
          required: amount,
          available: req.user.credits
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to deduct credits'
      });
    }
  };
};

// Get rate limit info for anonymous users
const getAnonymousLimitInfo = async (req, res, next) => {
  try {
    if (req.user) {
      req.rateLimitInfo = {
        type: 'authenticated',
        credits: req.user.credits,
        unlimited: true
      };
    } else {
      const userIP = req.ip;
      const generationCount = await CreditTransaction.getAnonymousGenerationCount(userIP);
      
      req.rateLimitInfo = {
        type: 'anonymous',
        limit: 3,
        used: generationCount,
        remaining: Math.max(0, 3 - generationCount),
        resetTime: TimezoneUtils.getRateLimitReset(),
        timezone: TimezoneUtils.getTimezoneInfo()
      };
    }
    
    next();
  } catch (error) {
    console.error('Rate limit info error:', error);
    req.rateLimitInfo = {
      type: 'error',
      error: 'Failed to get rate limit info'
    };
    next();
  }
};

// Check remix rate limit (special case - 5 credits for remix)
const checkRemixLimit = async (req, res, next) => {
  const REMIX_COST = parseInt(process.env.REMIX_COST || '5', 10);

  try {
    if (req.user) {
      // Authenticated user - check credits
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(401).json({ success: false, error: 'User not found' });
      }

      if (!user.hasCredits(REMIX_COST)) {
        return res.status(402).json({
          success: false,
          error: `Insufficient credits. Remix costs ${REMIX_COST} credits.`,
          code: 'INSUFFICIENT_CREDITS',
          required: REMIX_COST,
          available: user.credits,
          rateLimitInfo: {
            type: 'authenticated',
            credits: user.credits,
            required: REMIX_COST
          }
        });
      }

      // Deduct credits
      await user.deductCredits(REMIX_COST);
      await CreditTransaction.recordTransaction({
        userId: user._id,
        type: 'remix',
        amount: -REMIX_COST,
        balanceAfter: user.credits,
        description: 'Remix meme creation',
        userIP: req.ip,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      req.rateLimitInfo = {
        type: 'authenticated',
        credits: user.credits,
        cost: REMIX_COST,
        operation: 'remix'
      };
    } else {
      // Anonymous users cannot remix
      return res.status(401).json({
        success: false,
        error: 'Authentication required for remix functionality. Please sign in with X.',
        code: 'AUTH_REQUIRED_FOR_REMIX'
      });
    }
    
    next();
  } catch (error) {
    console.error('Remix rate limit error:', error);
    res.status(500).json({ success: false, error: 'Server error during remix rate limiting' });
  }
};

// Combined rate limiting for AI generation (handles both anonymous and authenticated users)
const checkGenerationLimit = async (req, res, next) => {
  const GENERATION_COST = parseInt(process.env.AUTHENTICATED_GENERATION_COST || '5', 10);
  const ANONYMOUS_LIMIT = parseInt(process.env.ANONYMOUS_GENERATION_LIMIT || '3', 10);
  
  // Get IP from various possible headers (Railway might use proxies)
  const possibleIPs = [
    req.ip,
    req.connection.remoteAddress,
    req.socket.remoteAddress,
    req.headers['x-forwarded-for']?.split(',')[0]?.trim(),
    req.headers['x-real-ip'],
    req.headers['x-client-ip']
  ].filter(Boolean);
  
  const userIP = possibleIPs[0] || 'unknown';
  
  // Debug logging
  console.log(`🔍 Generation limit check - Detected IPs: ${JSON.stringify(possibleIPs)}, Using: ${userIP}`);

  // Check if any IP is whitelisted for unlimited access
  const isWhitelisted = possibleIPs.some(ip => isWhitelistedIP(ip));
  
  if (isWhitelisted) {
    console.log(`🟢 Generation limit bypassed for whitelisted IP in list: ${possibleIPs.join(', ')}`);
    req.rateLimitInfo = {
      type: 'whitelisted',
      unlimited: true,
      ip: userIP,
      allIPs: possibleIPs
    };
    return next();
  }

  try {
    if (req.user) {
      // Authenticated user - check credits
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(401).json({ success: false, error: 'User not found' });
      }

      if (!user.hasCredits(GENERATION_COST)) {
        return res.status(402).json({
          success: false,
          error: `Insufficient credits. AI generation costs ${GENERATION_COST} credits.`,
          code: 'INSUFFICIENT_CREDITS',
          required: GENERATION_COST,
          available: user.credits,
          rateLimitInfo: {
            type: 'authenticated',
            credits: user.credits,
            required: GENERATION_COST
          }
        });
      }

      // Deduct credits
      await user.deductCredits(GENERATION_COST);
      await CreditTransaction.recordTransaction({
        userId: user._id,
        type: 'generation',
        amount: -GENERATION_COST,
        balanceAfter: user.credits,
        description: 'AI image generation',
        userIP: req.ip,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      req.rateLimitInfo = {
        type: 'authenticated',
        credits: user.credits,
        cost: GENERATION_COST,
        operation: 'generation'
      };
    } else {
      // Anonymous user - check daily limits
      const userIP = req.ip;
      const generationCount = await CreditTransaction.getAnonymousGenerationCount(userIP);

      if (generationCount >= ANONYMOUS_LIMIT) {
        return res.status(429).json({
          success: false,
          error: `Anonymous generation limit reached (${ANONYMOUS_LIMIT} per day). Please sign in with X to get more generations.`,
          code: 'ANONYMOUS_LIMIT_REACHED',
          limit: ANONYMOUS_LIMIT,
          used: generationCount,
          remaining: Math.max(0, ANONYMOUS_LIMIT - generationCount),
          resetTime: TimezoneUtils.getRateLimitReset(),
          timezone: TimezoneUtils.getTimezoneInfo()
        });
      }

      await CreditTransaction.recordTransaction({
        userIP: userIP,
        type: 'anonymous_limit',
        amount: 0,
        description: 'Anonymous generation tracking',
        ipAddress: userIP,
        userAgent: req.get('User-Agent')
      });

      req.rateLimitInfo = {
        type: 'anonymous',
        limit: ANONYMOUS_LIMIT,
        used: generationCount + 1,
        remaining: Math.max(0, ANONYMOUS_LIMIT - (generationCount + 1)),
        resetTime: TimezoneUtils.getRateLimitReset(),
        timezone: TimezoneUtils.getTimezoneInfo()
      };
    }
    
    next();
  } catch (error) {
    console.error('Generation rate limit error:', error);
    res.status(500).json({ success: false, error: 'Server error during rate limiting' });
  }
};

module.exports = {
  authenticateToken,
  requireAuth,
  requireCredits,
  checkAnonymousLimits,
  deductCredits,
  getAnonymousLimitInfo,
  checkRemixLimit,
  checkGenerationLimit
};
