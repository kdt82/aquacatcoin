const express = require('express');
const router = express.Router();

// Social sharing service
class SocialShareService {
  constructor() {
    this.platforms = {
      twitter: {
        name: 'Twitter/X',
        baseUrl: 'https://twitter.com/intent/tweet',
        icon: 'fab fa-x-twitter'
      },
      reddit: {
        name: 'Reddit',
        baseUrl: 'https://www.reddit.com/submit',
        icon: 'fab fa-reddit'
      },
      telegram: {
        name: 'Telegram',
        baseUrl: 'https://t.me/share/url',
        icon: 'fab fa-telegram'
      },
      facebook: {
        name: 'Facebook',
        baseUrl: 'https://www.facebook.com/sharer/sharer.php',
        icon: 'fab fa-facebook'
      }
    };
  }

  generateShareUrl(platform, memeUrl, text, title) {
    const platformConfig = this.platforms[platform];
    if (!platformConfig) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const baseUrl = platformConfig.baseUrl;
    const params = new URLSearchParams();

    switch (platform) {
      case 'twitter':
        params.append('text', `${text} #AQUA #SUINetwork #MemeCoins`);
        params.append('url', memeUrl);
        break;
      case 'reddit':
        params.append('url', memeUrl);
        params.append('title', title || text);
        break;
      case 'telegram':
        params.append('url', memeUrl);
        params.append('text', text);
        break;
      case 'facebook':
        params.append('u', memeUrl);
        break;
      default:
        throw new Error(`Share URL generation not implemented for ${platform}`);
    }

    return `${baseUrl}?${params.toString()}`;
  }

  async trackShare(memeId, platform, userIP) {
    // In a real app, this would update the database
    console.log(`Share tracked: Meme ${memeId} shared on ${platform} from ${userIP}`);
    return {
      success: true,
      memeId,
      platform,
      timestamp: new Date().toISOString()
    };
  }
}

const socialService = new SocialShareService();

// POST /api/social/share - Generate share URL and track sharing
router.post('/share', async (req, res) => {
  try {
    const { memeId, platform, text, title } = req.body;

    if (!memeId || !platform) {
      return res.status(400).json({
        success: false,
        error: 'Meme ID and platform are required'
      });
    }

    // Validate platform
    if (!socialService.platforms[platform]) {
      return res.status(400).json({
        success: false,
        error: `Unsupported platform: ${platform}`,
        supportedPlatforms: Object.keys(socialService.platforms)
      });
    }

    // Generate meme URL (in production, this would be the actual meme URL)
    const memeUrl = `${req.protocol}://${req.get('host')}/meme/${memeId}`;
    
    // Default text if not provided
    const shareText = text || `Check out this hilarious $AQUA meme! 🐱💧`;
    const shareTitle = title || `$AQUA Meme - ${memeId}`;

    // Generate share URL
    const shareUrl = socialService.generateShareUrl(platform, memeUrl, shareText, shareTitle);

    // Track the share
    await socialService.trackShare(memeId, platform, req.ip);

    res.json({
      success: true,
      shareUrl,
      platform,
      memeUrl,
      text: shareText,
      title: shareTitle,
      message: 'Share URL generated successfully'
    });
  } catch (error) {
    console.error('Error generating share URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate share URL'
    });
  }
});

// GET /api/social/stats - Get social sharing statistics
router.get('/stats', async (req, res) => {
  try {
    const { memeId, timeframe = '7d' } = req.query;

    // Mock statistics - in production, this would query the database
    const mockStats = {
      totalShares: 1247,
      sharesThisPeriod: 156,
      platformBreakdown: {
        twitter: 567,
        reddit: 345,
        telegram: 234,
        facebook: 101
      },
      topSharedMemes: [
        {
          id: 'meme-1',
          shares: 89,
          title: 'When it rains but you\'re $AQUA',
          thumbnail: '/aquacat.png'
        },
        {
          id: 'meme-2', 
          shares: 67,
          title: 'HODL $AQUA to the moon',
          thumbnail: '/aquacat.png'
        }
      ],
      dailyShares: [
        { date: '2024-01-15', shares: 23 },
        { date: '2024-01-14', shares: 31 },
        { date: '2024-01-13', shares: 28 },
        { date: '2024-01-12', shares: 35 },
        { date: '2024-01-11', shares: 19 },
        { date: '2024-01-10', shares: 25 },
        { date: '2024-01-09', shares: 22 }
      ]
    };

    // Filter by meme ID if specified
    if (memeId) {
      mockStats.memeSpecific = {
        id: memeId,
        totalShares: 45,
        platformBreakdown: {
          twitter: 20,
          reddit: 15,
          telegram: 7,
          facebook: 3
        },
        shareHistory: [
          { date: '2024-01-15', shares: 8 },
          { date: '2024-01-14', shares: 12 },
          { date: '2024-01-13', shares: 15 }
        ]
      };
    }

    res.json({
      success: true,
      stats: mockStats,
      timeframe,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching social stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch social statistics'
    });
  }
});

// GET /api/social/platforms - Get available social platforms
router.get('/platforms', (req, res) => {
  try {
    const platforms = Object.entries(socialService.platforms).map(([key, config]) => ({
      id: key,
      name: config.name,
      icon: config.icon,
      supported: true
    }));

    res.json({
      success: true,
      platforms,
      totalPlatforms: platforms.length
    });
  } catch (error) {
    console.error('Error fetching platforms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch platforms'
    });
  }
});

// POST /api/social/track-click - Track when someone clicks a share link
router.post('/track-click', async (req, res) => {
  try {
    const { memeId, platform, referrer } = req.body;

    if (!memeId || !platform) {
      return res.status(400).json({
        success: false,
        error: 'Meme ID and platform are required'
      });
    }

    // In a real app, this would update click tracking in the database
    console.log(`Click tracked: Meme ${memeId} clicked from ${platform}, referrer: ${referrer}`);

    res.json({
      success: true,
      message: 'Click tracked successfully',
      memeId,
      platform,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track click'
    });
  }
});

// GET /api/social/trending-hashtags - Get trending hashtags
router.get('/trending-hashtags', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Mock trending hashtags
    const trendingHashtags = [
      { tag: '#AQUA', count: 1247, growth: '+15%' },
      { tag: '#SUINetwork', count: 892, growth: '+8%' },
      { tag: '#MemeCoins', count: 567, growth: '+22%' },
      { tag: '#CryptoMemes', count: 445, growth: '+12%' },
      { tag: '#WetCat', count: 334, growth: '+18%' },
      { tag: '#DeFiMemes', count: 289, growth: '+5%' },
      { tag: '#BlockchainHumor', count: 234, growth: '+9%' },
      { tag: '#CryptoLife', count: 189, growth: '+14%' }
    ];

    res.json({
      success: true,
      hashtags: trendingHashtags.slice(0, limit),
      period: 'Last 24 hours',
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching trending hashtags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending hashtags'
    });
  }
});

// POST /api/social/report - Report inappropriate content
router.post('/report', async (req, res) => {
  try {
    const { memeId, reason, description, reporterContact } = req.body;

    if (!memeId || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Meme ID and reason are required'
      });
    }

    const validReasons = [
      'inappropriate_content',
      'spam',
      'copyright_violation', 
      'harassment',
      'false_information',
      'other'
    ];

    if (!validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid report reason',
        validReasons
      });
    }

    // In a real app, this would save the report to database and notify moderators
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`Content reported: ${reportId} - Meme ${memeId} for ${reason}`);

    res.json({
      success: true,
      reportId,
      message: 'Report submitted successfully. Our team will review it shortly.',
      memeId,
      reason,
      submittedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit report'
    });
  }
});

module.exports = router; 