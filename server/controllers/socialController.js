const { Meme, User } = require('../models');
const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');

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
        throw new Error(`Unsupported platform: ${platform}`);
    }

    return `${baseUrl}?${params.toString()}`;
  }

  getSupportedPlatforms() {
    return Object.keys(this.platforms).map(key => ({
      id: key,
      name: this.platforms[key].name,
      icon: this.platforms[key].icon
    }));
  }
}

// Initialize service
const socialShareService = new SocialShareService();

// In-memory storage for social stats (in production, use Redis or database)
const socialStats = {
  totalShares: 0,
  platformShares: {
    twitter: 0,
    reddit: 0,
    telegram: 0,
    facebook: 0
  },
  dailyShares: {},
  trendingHashtags: ['#AQUA', '#SUINetwork', '#MemeCoins', '#CryptoMemes']
};

// Helper function to get today's date string
function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

// Helper function to update daily stats
function updateDailyStats(platform) {
  const today = getTodayString();
  if (!socialStats.dailyShares[today]) {
    socialStats.dailyShares[today] = {};
  }
  if (!socialStats.dailyShares[today][platform]) {
    socialStats.dailyShares[today][platform] = 0;
  }
  socialStats.dailyShares[today][platform]++;
}

const socialController = {
  // POST /api/social/share - Generate social sharing URL
  shareContent: async (req, res) => {
    try {
      const { memeId, platform, text, title } = req.body;

      if (!memeId || !platform) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: memeId and platform'
        });
      }

      // Get meme details
      const meme = await Meme.findOne({ id: memeId });
      if (!meme) {
        return res.status(404).json({
          success: false,
          error: 'Meme not found'
        });
      }

      // Generate full meme URL
      const baseUrl = process.env.BASE_URL || 'https://aquacatcoin.xyz';
      const memeUrl = `${baseUrl}/gallery?meme=${memeId}`;

      // Generate share text
      const shareText = text || `Check out this hilarious $AQUA meme! 🐱💧`;
      const shareTitle = title || `$AQUA Meme - ${meme.title || 'Soggy Cat Meme'}`;

      // Generate platform-specific share URL
      const shareUrl = socialShareService.generateShareUrl(
        platform,
        memeUrl,
        shareText,
        shareTitle
      );

      // Update stats
      socialStats.totalShares++;
      socialStats.platformShares[platform] = (socialStats.platformShares[platform] || 0) + 1;
      updateDailyStats(platform);

      // Update meme share count
      await Meme.findOneAndUpdate({ id: memeId }, {
        $inc: { shareCount: 1 }
      });

      res.json({
        success: true,
        shareUrl: shareUrl,
        platform: platform,
        message: 'Share URL generated successfully'
      });
    } catch (error) {
      console.error('Error generating share URL:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate share URL',
        message: error.message
      });
    }
  },

  // GET /api/social/stats - Get social sharing statistics
  getStats: async (req, res) => {
    try {
      // Get recent memes with share counts
      const recentMemes = await Meme.find({ isApproved: true })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('id title shareCount likes views createdAt');

      // Calculate trending metrics
      const today = getTodayString();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const todayShares = socialStats.dailyShares[today] || {};
      const yesterdayShares = socialStats.dailyShares[yesterday] || {};

      const todayTotal = Object.values(todayShares).reduce((sum, count) => sum + count, 0);
      const yesterdayTotal = Object.values(yesterdayShares).reduce((sum, count) => sum + count, 0);

      // Get top shared memes
      const topSharedMemes = await Meme.find({ isApproved: true })
        .sort({ shareCount: -1 })
        .limit(5)
        .select('id title shareCount thumbnail');

      res.json({
        success: true,
        stats: {
          totalShares: socialStats.totalShares,
          platformBreakdown: socialStats.platformShares,
          dailyShares: {
            today: todayTotal,
            yesterday: yesterdayTotal,
            change: yesterdayTotal > 0 ? ((todayTotal - yesterdayTotal) / yesterdayTotal * 100).toFixed(1) : 0
          },
          topSharedMemes: topSharedMemes,
          recentActivity: recentMemes,
          trendingHashtags: socialStats.trendingHashtags
        }
      });
    } catch (error) {
      console.error('Error fetching social stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch social statistics'
      });
    }
  },

  // GET /api/social/platforms - Get supported social platforms
  getPlatforms: (req, res) => {
    try {
      const platforms = socialShareService.getSupportedPlatforms();
      
      res.json({
        success: true,
        platforms: platforms,
        count: platforms.length,
        message: 'Supported social platforms retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching platforms:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch supported platforms'
      });
    }
  },

  // POST /api/social/track-click - Track social media clicks
  trackClick: async (req, res) => {
    try {
      const { memeId, platform, source } = req.body;

      if (!memeId || !platform) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: memeId and platform'
        });
      }

      // Update click tracking stats
      const today = getTodayString();
      if (!socialStats.dailyShares[today]) {
        socialStats.dailyShares[today] = {};
      }
      
      const clickKey = `${platform}_clicks`;
      if (!socialStats.dailyShares[today][clickKey]) {
        socialStats.dailyShares[today][clickKey] = 0;
      }
      socialStats.dailyShares[today][clickKey]++;

      // You could also update the meme's click count here if needed
      // await Meme.findOneAndUpdate({ id: memeId }, { $inc: { clickCount: 1 } });

      res.json({
        success: true,
        message: 'Click tracked successfully',
        platform: platform,
        source: source || 'unknown'
      });
    } catch (error) {
      console.error('Error tracking click:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track click'
      });
    }
  },

  // GET /api/social/trending-hashtags - Get trending hashtags
  getTrendingHashtags: async (req, res) => {
    try {
      // In a real implementation, this would analyze recent shares and posts
      // For now, return static trending hashtags with some dynamic elements
      const baseHashtags = ['#AQUA', '#SUINetwork', '#MemeCoins', '#CryptoMemes'];
      
      // Add some time-based hashtags
      const now = new Date();
      const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
      const timeBasedHashtags = [`#${dayOfWeek}Memes`, '#SoggyLife'];

      const trendingHashtags = [...baseHashtags, ...timeBasedHashtags];

      res.json({
        success: true,
        hashtags: trendingHashtags,
        lastUpdated: new Date().toISOString(),
        message: 'Trending hashtags retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching trending hashtags:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch trending hashtags'
      });
    }
  },

  // POST /api/social/report - Report inappropriate content
  reportContent: async (req, res) => {
    try {
      const { memeId, reason, description } = req.body;

      if (!memeId || !reason) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: memeId and reason'
        });
      }

      // Verify meme exists
      const meme = await Meme.findOne({ id: memeId });
      if (!meme) {
        return res.status(404).json({
          success: false,
          error: 'Meme not found'
        });
      }

      // In a real implementation, you would:
      // 1. Store the report in a database
      // 2. Send notification to moderators
      // 3. Potentially auto-hide content based on report count
      
      // For now, just log the report
      console.log('Content report received:', {
        memeId,
        reason,
        description,
        timestamp: new Date().toISOString(),
        userIP: req.ip
      });

      res.json({
        success: true,
        message: 'Report submitted successfully. Our moderation team will review it shortly.',
        reportId: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
    } catch (error) {
      console.error('Error submitting report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit report'
      });
    }
  },

  // POST /api/social/post-to-x - Upload image directly to X
  postToX: async (req, res) => {
    try {
      const { imageData, text } = req.body;
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const user = req.user; // User is already populated by middleware
      if (!user || !user.twitterAccessToken) {
        return res.status(401).json({
          success: false,
          error: 'X authentication required. Please sign in with X first.'
        });
      }

      // Convert base64 image to buffer
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

      // Convert to JPEG if needed and optimize
      const processedImage = await sharp(imageBuffer)
        .jpeg({ quality: 90 })
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .toBuffer();

      // Step 1: Upload media to X
      const formData = new FormData();
      formData.append('media', processedImage, {
        filename: 'meme.jpg',
        contentType: 'image/jpeg'
      });

      const mediaResponse = await axios.post('https://upload.twitter.com/1.1/media/upload.json', formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${user.twitterAccessToken}`
        }
      });

      const mediaId = mediaResponse.data.media_id_string;

      // Step 2: Post tweet with media
      const tweetText = text || `Check out this hilarious meme I made with the $AQUA Meme Generator! 🐱💧 #AQUAonSUI #MemeCoin #AQUA #SUINetwork`;
      
      const tweetResponse = await axios.post('https://api.twitter.com/2/tweets', {
        text: tweetText,
        media: {
          media_ids: [mediaId]
        }
      }, {
        headers: {
          'Authorization': `Bearer ${user.twitterAccessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const tweetData = tweetResponse.data.data;
      const tweetUrl = `https://twitter.com/${user.twitterUsername}/status/${tweetData.id}`;

      res.json({
        success: true,
        tweetId: tweetData.id,
        tweetUrl: tweetUrl,
        message: 'Successfully posted to X!'
      });

    } catch (error) {
      console.error('Error posting to X:', error.response?.data || error.message);
      
      let errorMessage = 'Failed to post to X';
      if (error.response?.status === 401) {
        errorMessage = 'X authentication expired. Please sign in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Permission denied. Please ensure your X app has write permissions.';
      }

      res.status(error.response?.status || 500).json({
        success: false,
        error: errorMessage,
        details: error.response?.data
      });
    }
  }
};

module.exports = {
  socialController
}; 