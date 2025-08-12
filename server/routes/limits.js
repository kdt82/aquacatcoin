const express = require('express');
const router = express.Router();
const { authenticateToken, getAnonymousLimitInfo } = require('../middleware/auth');

// Apply authentication middleware
router.use(authenticateToken);

// Get rate limit information
router.get('/info', getAnonymousLimitInfo, (req, res) => {
  try {
    res.json({
      success: true,
      ...req.rateLimitInfo
    });
  } catch (error) {
    console.error('Rate limit info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rate limit information'
    });
  }
});

// Check if an action is allowed
router.post('/check', getAnonymousLimitInfo, (req, res) => {
  try {
    const { action = 'generation' } = req.body;
    const cost = action === 'remix' ? 5 : 5;
    
    let allowed = false;
    let reason = '';
    
    if (req.user) {
      // Authenticated user - check credits
      allowed = req.user.credits >= cost;
      reason = allowed ? 'sufficient_credits' : 'insufficient_credits';
    } else {
      // Anonymous user - check rate limits
      allowed = req.rateLimitInfo.remaining > 0;
      reason = allowed ? 'within_limits' : 'rate_limited';
    }
    
    res.json({
      success: true,
      allowed,
      reason,
      rateLimitInfo: req.rateLimitInfo,
      userCredits: req.user ? req.user.credits : null,
      requiredCredits: cost
    });
  } catch (error) {
    console.error('Action check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check action availability'
    });
  }
});

// Claim daily credits (authenticated users only)
router.post('/claim-daily', (req, res) => {
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
        error: 'Daily bonus already claimed today',
        canClaim: false,
        nextClaimTime: req.user.lastDailyBonus ? new Date(req.user.lastDailyBonus.getTime() + 24 * 60 * 60 * 1000) : null
      });
    }

    // Claim the daily bonus
    req.user.claimDailyBonus(30).then(user => {
      res.json({
        success: true,
        message: 'Daily credits claimed successfully!',
        creditsEarned: 30,
        newBalance: user.credits,
        canClaim: false,
        nextClaimTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
    }).catch(error => {
      console.error('Daily bonus claim error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to claim daily bonus'
      });
    });

  } catch (error) {
    console.error('Daily claim error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process daily claim'
    });
  }
});

module.exports = router;
