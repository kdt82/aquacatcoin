const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

// GET /api/memes - Get all memes (paginated)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // For now, return mock data since we haven't set up the database models yet
    const mockMemes = [
      {
        id: 'demo-1',
        finalMemeUrl: '/aquacat.png',
        thumbnail: '/aquacat.png',
        createdAt: new Date(),
        shareCount: 42,
        likes: 156,
        tags: ['aqua', 'wet', 'cat']
      }
    ];
    
    res.json({
      success: true,
      memes: mockMemes,
      pagination: {
        currentPage: page,
        totalPages: 1,
        totalMemes: mockMemes.length,
        hasNext: false,
        hasPrev: false
      }
    });
  } catch (error) {
    console.error('Error fetching memes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch memes'
    });
  }
});

// GET /api/memes/:id - Get specific meme
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock response for now
    const mockMeme = {
      id: id,
      finalMemeUrl: '/aquacat.png',
      thumbnail: '/aquacat.png',
      createdAt: new Date(),
      shareCount: 42,
      likes: 156,
      tags: ['aqua', 'wet', 'cat'],
      textElements: [
        {
          text: 'When it starts raining',
          x: 50,
          y: 50,
          fontSize: 24,
          fontFamily: 'Impact',
          color: '#FFFFFF',
          strokeColor: '#000000',
          strokeWidth: 2
        }
      ]
    };
    
    res.json({
      success: true,
      meme: mockMeme
    });
  } catch (error) {
    console.error('Error fetching meme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch meme'
    });
  }
});

// POST /api/memes/upload - Upload image for meme creation
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    const fileId = uuidv4();
    const filename = `${fileId}.png`;
    const uploadPath = path.join(__dirname, '../../uploads', filename);

    // Process image with Sharp
    await sharp(req.file.buffer)
      .resize(800, 800, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .png({ quality: 90 })
      .toFile(uploadPath);

    res.json({
      success: true,
      imageId: fileId,
      imageUrl: `/uploads/${filename}`,
      originalName: req.file.originalname
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image'
    });
  }
});

// POST /api/memes/create - Create and save a meme
router.post('/create', upload.single('canvas'), async (req, res) => {
  try {
    const { textElements, originalImageUrl, aiPrompt, tags, xUsername } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No canvas image provided'
      });
    }

    const memeId = uuidv4();
    const filename = `meme_${memeId}.png`;
    const generatedPath = path.join(__dirname, '../../generated', filename);
    const thumbnailPath = path.join(__dirname, '../../generated', `thumb_${filename}`);

    // Ensure directories exist
    await fs.mkdir(path.dirname(generatedPath), { recursive: true });

    // Process the main meme image
    await sharp(req.file.buffer)
      .png({ quality: 90 })
      .toFile(generatedPath);

    // Create thumbnail
    await sharp(req.file.buffer)
      .resize(300, 300, { fit: 'cover' })
      .png({ quality: 80 })
      .toFile(thumbnailPath);

    // In a real app, save to database here
    const memeData = {
      id: memeId,
      originalImageUrl,
      finalMemeUrl: `/generated/${filename}`,
      thumbnail: `/generated/thumb_${filename}`,
      textElements: textElements ? JSON.parse(textElements) : [],
      aiPrompt: aiPrompt || null,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      xUsername: xUsername || null, // Store X username if provided
      createdAt: new Date(),
      userIP: req.ip,
      isApproved: false, // Will need manual approval
      shareCount: 0,
      likes: 0
    };

    res.json({
      success: true,
      meme: memeData
    });
  } catch (error) {
    console.error('Error creating meme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create meme'
    });
  }
});

// PUT /api/memes/:id/like - Like a meme
router.put('/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    
    // In a real app, update database here
    res.json({
      success: true,
      message: 'Meme liked',
      likes: 157 // Mock response
    });
  } catch (error) {
    console.error('Error liking meme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to like meme'
    });
  }
});

// DELETE /api/memes/:id - Delete a meme (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // In a real app, check admin permissions and delete from database
    res.json({
      success: true,
      message: 'Meme deleted'
    });
  } catch (error) {
    console.error('Error deleting meme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete meme'
    });
  }
});

// GET /api/memes/templates - Get available meme templates
router.get('/templates', async (req, res) => {
  try {
    const templates = [
      {
        id: 'aqua-wet',
        name: 'Wet Cat Classic',
        imageUrl: '/aquacat.png',
        description: 'The original soggy $AQUA cat',
        category: 'classic'
      },
      {
        id: 'aqua-rain',
        name: 'Rainy Day Blues',
        imageUrl: '/aquacat.png',
        description: 'When the weather turns but $AQUA keeps pumping',
        category: 'weather'
      },
      {
        id: 'aqua-success',
        name: 'Diamond Paws',
        imageUrl: '/aquacat.png',
        description: 'Holding $AQUA through the storm',
        category: 'crypto'
      },
      {
        id: 'aqua-hodl',
        name: 'To The Moon',
        imageUrl: '/aquacat.png',
        description: 'Soggy but successful',
        category: 'crypto'
      }
    ];

    res.json({
      success: true,
      templates: templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates'
    });
  }
});

module.exports = router; 