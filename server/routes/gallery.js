const express = require('express');
const { Meme } = require('../models');
const router = express.Router();

// GET /api/gallery - Get gallery memes with pagination and filtering
router.get('/', async (req, res) => {
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
});

// GET /api/gallery/remixable - Get original images available for remixing
router.get('/remixable', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const sortBy = req.query.sortBy || 'popular';

    const remixableImages = await Meme.findRemixableImages({
      page,
      limit,
      sortBy
    });

    const totalRemixable = await Meme.countDocuments({
      isApproved: true,
      isRemixable: true,
      $or: [
        { generationType: 'ai' },
        { generationType: 'upload' }
      ]
    });

    const totalPages = Math.ceil(totalRemixable / limit);

    res.json({
      success: true,
      images: remixableImages,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalRemixable,
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
});

// GET /api/gallery/stats - Get gallery statistics
router.get('/stats', async (req, res) => {
  try {
    const totalMemes = await Meme.countDocuments({ isApproved: true });
    const totalLikes = await Meme.aggregate([
      { $match: { isApproved: true } },
      { $group: { _id: null, total: { $sum: '$likes' } } }
    ]);
    const totalShares = await Meme.aggregate([
      { $match: { isApproved: true } },
      { $group: { _id: null, total: { $sum: '$shareCount' } } }
    ]);
    const totalViews = await Meme.aggregate([
      { $match: { isApproved: true } },
      { $group: { _id: null, total: { $sum: '$views' } } }
    ]);

    // Count memes created today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const createdToday = await Meme.countDocuments({
      isApproved: true,
      createdAt: {
        $gte: today,
        $lt: tomorrow
      }
    });

    res.json({
      success: true,
      stats: {
        totalMemes,
        totalLikes: totalLikes[0]?.total || 0,
        totalShares: totalShares[0]?.total || 0,
        totalViews: totalViews[0]?.total || 0,
        createdToday
      }
    });
  } catch (error) {
    console.error('Error fetching gallery stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// GET /api/gallery/trending - Get trending memes
router.get('/trending', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;

    const trendingMemes = await Meme.findApproved({
      sortBy: 'trending',
      page,
      limit
    });

    const totalTrending = await Meme.countDocuments({ 
      isApproved: true,
      shareCount: { $gt: 0 }
    });

    const totalPages = Math.ceil(totalTrending / limit);

    res.json({
      success: true,
      memes: trendingMemes,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalMemes: totalTrending,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching trending memes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending memes'
    });
  }
});

// POST /api/gallery/search - Search memes
router.post('/search', async (req, res) => {
  try {
    const { query, tags, category, dateRange } = req.body;
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 12;

    if (!query && !tags && !category) {
      return res.status(400).json({
        success: false,
        error: 'Search query, tags, or category required'
      });
    }

    let searchResults;
    let totalResults;

    if (query) {
      // Text-based search
      searchResults = await Meme.searchMemes(query, {
        category,
        page,
        limit
      });

      // Count total results for pagination
      let countQuery = { 
        isApproved: true,
        $or: [
          { tags: { $regex: query, $options: 'i' } },
          { aiPrompt: { $regex: query, $options: 'i' } },
          { enhancedPrompt: { $regex: query, $options: 'i' } }
        ]
      };
      
      if (category && category !== 'all') {
        countQuery.category = category;
      }
      
      totalResults = await Meme.countDocuments(countQuery);
    } else if (tags && tags.length > 0) {
      // Tag-based search
      let tagQuery = { 
        isApproved: true,
        tags: { $in: tags }
      };
      
      if (category && category !== 'all') {
        tagQuery.category = category;
      }
      
      const skip = (page - 1) * limit;
      searchResults = await Meme.find(tagQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-userIP');
        
      totalResults = await Meme.countDocuments(tagQuery);
    }

    const totalPages = Math.ceil(totalResults / limit);

    res.json({
      success: true,
      memes: searchResults,
      searchInfo: {
        query: query || '',
        tags: tags || [],
        category: category || 'all',
        resultsFound: totalResults,
        searchTime: '0.05s'
      },
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalMemes: totalResults,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error searching memes:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed'
    });
  }
});

// GET /api/gallery/categories - Get available categories with counts
router.get('/categories', async (req, res) => {
  try {
    const categories = await Meme.aggregate([
      { $match: { isApproved: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const categoryList = categories.map(cat => ({
      name: cat._id,
      count: cat.count
    }));

    res.json({
      success: true,
      categories: categoryList
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
});

// GET /api/gallery/featured - Get featured memes (most liked/shared)
router.get('/featured', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;

    const featuredMemes = await Meme.find({ isApproved: true })
      .sort({ likes: -1, shareCount: -1 })
      .limit(limit)
      .select('-userIP');

    res.json({
      success: true,
      memes: featuredMemes
    });
  } catch (error) {
    console.error('Error fetching featured memes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch featured memes'
    });
  }
});

module.exports = router; 