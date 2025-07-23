const express = require('express');
const router = express.Router();

// GET /api/gallery - Get gallery memes with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const category = req.query.category;
    const sortBy = req.query.sortBy || 'newest'; // newest, popular, trending
    const skip = (page - 1) * limit;

    // Mock data for now - will be replaced with database queries
    const mockMemes = [
      {
        id: 'gallery-1',
        finalMemeUrl: '/aquacat.png',
        thumbnail: '/aquacat.png',
        createdAt: new Date('2024-01-15'),
        shareCount: 89,
        likes: 234,
        tags: ['aqua', 'wet', 'cat', 'rain'],
        category: 'funny',
        textElements: [
          { text: 'When you see rain clouds', x: 50, y: 30 },
          { text: 'But you forgot your umbrella', x: 50, y: 70 }
        ]
      },
      {
        id: 'gallery-2',
        finalMemeUrl: '/aquacat.png',
        thumbnail: '/aquacat.png',
        createdAt: new Date('2024-01-14'),
        shareCount: 156,
        likes: 445,
        tags: ['aqua', 'crypto', 'moon'],
        category: 'crypto',
        textElements: [
          { text: 'HODL $AQUA', x: 50, y: 50 }
        ]
      },
      {
        id: 'gallery-3',
        finalMemeUrl: '/aquacat.png',
        thumbnail: '/aquacat.png',
        createdAt: new Date('2024-01-13'),
        shareCount: 67,
        likes: 178,
        tags: ['aqua', 'sui', 'defi'],
        category: 'crypto',
        textElements: [
          { text: 'SUI Network is fast', x: 50, y: 30 },
          { text: 'But not as fast as $AQUA running from water', x: 50, y: 70 }
        ]
      }
    ];

    // Filter by category if specified
    let filteredMemes = category 
      ? mockMemes.filter(meme => meme.category === category)
      : mockMemes;

    // Sort memes
    switch (sortBy) {
      case 'popular':
        filteredMemes.sort((a, b) => b.likes - a.likes);
        break;
      case 'trending':
        filteredMemes.sort((a, b) => b.shareCount - a.shareCount);
        break;
      case 'newest':
      default:
        filteredMemes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
    }

    // Paginate
    const paginatedMemes = filteredMemes.slice(skip, skip + limit);

    res.json({
      success: true,
      memes: paginatedMemes,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(filteredMemes.length / limit),
        totalMemes: filteredMemes.length,
        hasNext: skip + limit < filteredMemes.length,
        hasPrev: page > 1,
        limit
      },
      filters: {
        category: category || 'all',
        sortBy,
        availableCategories: ['funny', 'crypto', 'relatable', 'trending']
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

// GET /api/gallery/trending - Get trending memes
router.get('/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;

    // Mock trending memes based on share count
    const trendingMemes = [
      {
        id: 'trending-1',
        finalMemeUrl: '/aquacat.png',
        thumbnail: '/aquacat.png',
        createdAt: new Date(),
        shareCount: 234,
        likes: 567,
        tags: ['aqua', 'viral', 'trending'],
        textElements: [
          { text: 'This meme is trending!', x: 50, y: 50 }
        ]
      }
    ];

    res.json({
      success: true,
      memes: trendingMemes.slice(0, limit),
      message: 'Trending memes in the last 24 hours'
    });
  } catch (error) {
    console.error('Error fetching trending memes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending memes'
    });
  }
});

// GET /api/gallery/featured - Get featured memes
router.get('/featured', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 3;

    // Mock featured memes - would be curated by admins
    const featuredMemes = [
      {
        id: 'featured-1',
        finalMemeUrl: '/aquacat.png',
        thumbnail: '/aquacat.png',
        createdAt: new Date(),
        shareCount: 445,
        likes: 892,
        tags: ['aqua', 'featured', 'quality'],
        featured: true,
        textElements: [
          { text: 'Featured Meme!', x: 50, y: 50 }
        ]
      }
    ];

    res.json({
      success: true,
      memes: featuredMemes.slice(0, limit),
      message: 'Hand-picked quality memes'
    });
  } catch (error) {
    console.error('Error fetching featured memes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch featured memes'
    });
  }
});

// POST /api/gallery/search - Search memes
router.post('/search', async (req, res) => {
  try {
    const { query, tags, category, dateRange } = req.body;
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 12;
    const skip = (page - 1) * limit;

    if (!query && !tags && !category) {
      return res.status(400).json({
        success: false,
        error: 'Search query, tags, or category required'
      });
    }

    // Mock search results
    const searchResults = [
      {
        id: 'search-1',
        finalMemeUrl: '/aquacat.png',
        thumbnail: '/aquacat.png',
        createdAt: new Date(),
        shareCount: 123,
        likes: 234,
        tags: ['aqua', 'search', 'result'],
        relevanceScore: 0.95,
        textElements: [
          { text: 'Search result meme', x: 50, y: 50 }
        ]
      }
    ];

    res.json({
      success: true,
      memes: searchResults,
      searchInfo: {
        query: query || '',
        tags: tags || [],
        category: category || 'all',
        resultsFound: searchResults.length,
        searchTime: '0.05s'
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(searchResults.length / limit),
        totalMemes: searchResults.length,
        hasNext: skip + limit < searchResults.length,
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

// GET /api/gallery/stats - Get gallery statistics
router.get('/stats', async (req, res) => {
  try {
    // Mock statistics
    const stats = {
      totalMemes: 1247,
      totalLikes: 45623,
      totalShares: 12890,
      memesCreatedToday: 23,
      topCategories: [
        { name: 'funny', count: 456 },
        { name: 'crypto', count: 389 },
        { name: 'relatable', count: 234 },
        { name: 'trending', count: 168 }
      ],
      topTags: [
        { name: 'aqua', count: 892 },
        { name: 'wet', count: 567 },
        { name: 'cat', count: 445 },
        { name: 'rain', count: 334 },
        { name: 'crypto', count: 289 }
      ],
      dailyStats: [
        { date: '2024-01-15', memes: 23, likes: 456, shares: 123 },
        { date: '2024-01-14', memes: 31, likes: 567, shares: 145 },
        { date: '2024-01-13', memes: 28, likes: 445, shares: 134 }
      ]
    };

    res.json({
      success: true,
      stats,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching gallery stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// GET /api/gallery/categories - Get available categories
router.get('/categories', async (req, res) => {
  try {
    const categories = [
      { 
        id: 'funny', 
        name: 'Funny', 
        description: 'Hilarious $AQUA memes',
        count: 456,
        icon: '😂'
      },
      { 
        id: 'crypto', 
        name: 'Crypto', 
        description: 'Cryptocurrency and DeFi memes',
        count: 389,
        icon: '₿'
      },
      { 
        id: 'relatable', 
        name: 'Relatable', 
        description: 'Memes we can all relate to',
        count: 234,
        icon: '🤝'
      },
      { 
        id: 'trending', 
        name: 'Trending', 
        description: 'Hot and viral memes',
        count: 168,
        icon: '🔥'
      },
      { 
        id: 'original', 
        name: 'Original', 
        description: 'Community created content',
        count: 123,
        icon: '✨'
      }
    ];

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
});

module.exports = router; 