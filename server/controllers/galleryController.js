const { Meme } = require('../models');

const galleryController = {
  // GET /api/gallery - Get gallery memes with pagination and filtering
  getGallery: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 12;
      const category = req.query.category;
      const sortBy = req.query.sortBy || 'newest';

      const memes = await Meme.findApproved({
        category,
        sortBy,
        page,
        limit
      });

      const totalMemes = await Meme.countDocuments({ 
        isApproved: true,
        ...(category && category !== 'all' ? { category } : {})
      });

      const totalPages = Math.ceil(totalMemes / limit);

      res.json({
        success: true,
        memes: memes,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalMemes: totalMemes,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching gallery:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch gallery'
      });
    }
  },

  // GET /api/gallery/remixable - Get original images available for remixing
  getRemixableImages: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 12;
      const sortBy = req.query.sortBy || 'newest';

      const query = {
        isApproved: true,
        isRemixable: true,
        $or: [
          { generationType: 'ai' },
          { generationType: 'upload' }
        ]
      };

      let sortOptions = {};
      switch (sortBy) {
        case 'popular':
          sortOptions = { timesRemixed: -1, likes: -1 };
          break;
        case 'trending':
          sortOptions = { views: -1, createdAt: -1 };
          break;
        case 'most-remixed':
          sortOptions = { timesRemixed: -1 };
          break;
        default:
          sortOptions = { createdAt: -1 };
      }

      const images = await Meme.find(query)
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-userIP');

      const totalImages = await Meme.countDocuments(query);
      const totalPages = Math.ceil(totalImages / limit);

      res.json({
        success: true,
        images: images,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalImages: totalImages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching remixable images:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch remixable images'
      });
    }
  },

  // GET /api/gallery/stats - Get gallery statistics
  getStats: async (req, res) => {
    try {
      // Get basic counts
      const totalMemes = await Meme.countDocuments({ isApproved: true });
      const totalLikes = await Meme.aggregate([
        { $match: { isApproved: true } },
        { $group: { _id: null, total: { $sum: '$likes' } } }
      ]);
      const totalShares = await Meme.aggregate([
        { $match: { isApproved: true } },
        { $group: { _id: null, total: { $sum: '$shareCount' } } }
      ]);

      // Get today's memes
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const createdToday = await Meme.countDocuments({
        isApproved: true,
        createdAt: { $gte: today }
      });

      // Get category breakdown
      const categoryStats = await Meme.aggregate([
        { $match: { isApproved: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      // Get generation type breakdown
      const generationStats = await Meme.aggregate([
        { $match: { isApproved: true } },
        { $group: { _id: '$generationType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      res.json({
        success: true,
        stats: {
          totalMemes: totalMemes,
          totalLikes: totalLikes[0]?.total || 0,
          totalShares: totalShares[0]?.total || 0,
          createdToday: createdToday,
          categoryBreakdown: categoryStats,
          generationBreakdown: generationStats
        }
      });
    } catch (error) {
      console.error('Error fetching gallery stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch gallery statistics'
      });
    }
  },

  // GET /api/gallery/trending - Get trending memes
  getTrending: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const timeframe = req.query.timeframe || '7d';

      // Calculate date range based on timeframe
      let dateRange = new Date();
      switch (timeframe) {
        case '1d':
          dateRange.setDate(dateRange.getDate() - 1);
          break;
        case '7d':
          dateRange.setDate(dateRange.getDate() - 7);
          break;
        case '30d':
          dateRange.setDate(dateRange.getDate() - 30);
          break;
        default:
          dateRange.setDate(dateRange.getDate() - 7);
      }

      // Get trending memes based on engagement within timeframe
      const trendingMemes = await Meme.find({
        isApproved: true,
        createdAt: { $gte: dateRange }
      })
      .sort({ 
        views: -1, 
        likes: -1, 
        shareCount: -1 
      })
      .limit(limit)
      .select('-userIP');

      res.json({
        success: true,
        trending: trendingMemes,
        timeframe: timeframe,
        count: trendingMemes.length
      });
    } catch (error) {
      console.error('Error fetching trending memes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch trending memes'
      });
    }
  },

  // POST /api/gallery/search - Search memes
  searchMemes: async (req, res) => {
    try {
      const { query, category, sortBy = 'newest', page = 1, limit = 12 } = req.body;

      if (!query || query.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
      }

      const searchQuery = query.trim();
      const searchRegex = new RegExp(searchQuery, 'i');

      // Build MongoDB query
      const mongoQuery = {
        isApproved: true,
        $or: [
          { 'textElements.text': searchRegex },
          { aiPrompt: searchRegex },
          { enhancedPrompt: searchRegex },
          { tags: { $in: [searchRegex] } }
        ]
      };

      // Add category filter if specified
      if (category && category !== 'all') {
        mongoQuery.category = category;
      }

      // Set sort options
      let sortOptions = {};
      switch (sortBy) {
        case 'popular':
          sortOptions = { likes: -1, views: -1 };
          break;
        case 'trending':
          sortOptions = { views: -1, shareCount: -1 };
          break;
        case 'most-shared':
          sortOptions = { shareCount: -1 };
          break;
        case 'oldest':
          sortOptions = { createdAt: 1 };
          break;
        default:
          sortOptions = { createdAt: -1 };
      }

      // Execute search
      const memes = await Meme.find(mongoQuery)
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-userIP');

      const totalResults = await Meme.countDocuments(mongoQuery);
      const totalPages = Math.ceil(totalResults / limit);

      // Log search for analytics (in production, you might want to store this)
      console.log(`Search performed: "${searchQuery}" - ${totalResults} results`);

      res.json({
        success: true,
        memes: memes,
        searchQuery: searchQuery,
        totalResults: totalResults,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        filters: {
          category: category || 'all',
          sortBy: sortBy
        }
      });
    } catch (error) {
      console.error('Error searching memes:', error);
      res.status(500).json({
        success: false,
        error: 'Search failed',
        message: error.message
      });
    }
  },

  // GET /api/gallery/categories - Get available categories
  getCategories: async (req, res) => {
    try {
      // Get categories from database
      const categories = await Meme.distinct('category', { isApproved: true });
      
      // Add counts for each category
      const categoriesWithCounts = await Promise.all(
        categories.map(async (category) => {
          const count = await Meme.countDocuments({ 
            isApproved: true, 
            category: category 
          });
          return { name: category, count: count };
        })
      );

      // Sort by count descending
      categoriesWithCounts.sort((a, b) => b.count - a.count);

      res.json({
        success: true,
        categories: categoriesWithCounts,
        total: categoriesWithCounts.length
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch categories'
      });
    }
  },

  // GET /api/gallery/featured - Get featured memes
  getFeatured: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 6;

      // Get featured memes (you might have a featuredInGallery field)
      const featuredMemes = await Meme.find({
        isApproved: true,
        // featuredInGallery: true  // Uncomment if you have this field
      })
      .sort({ likes: -1, views: -1 })
      .limit(limit)
      .select('-userIP');

      res.json({
        success: true,
        featured: featuredMemes,
        count: featuredMemes.length
      });
    } catch (error) {
      console.error('Error fetching featured memes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch featured memes'
      });
    }
  },

  // POST /api/gallery/:id/remix - Start remix (deducts 5 credits)
  startRemix: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Find the meme to remix
      const meme = await Meme.findById(id);
      if (!meme) {
        return res.status(404).json({
          success: false,
          error: 'Meme not found'
        });
      }

      // Check if the meme is remixable
      if (!meme.isRemixable) {
        return res.status(400).json({
          success: false,
          error: 'This meme is not available for remixing'
        });
      }

      // Credits are already deducted by checkRemixLimit middleware
      // Return the original image URL for the editor
      res.json({
        success: true,
        message: 'Remix started successfully! 5 credits deducted.',
        originalImageUrl: meme.originalImageUrl,
        sourceImageId: meme._id,
        aiPrompt: meme.aiPrompt,
        category: meme.category,
        rateLimitInfo: req.rateLimitInfo,
        redirectUrl: `/preview/meme-generator?remix=${id}`
      });

    } catch (error) {
      console.error('Error starting remix:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start remix'
      });
    }
  }
};

module.exports = {
  galleryController
}; 