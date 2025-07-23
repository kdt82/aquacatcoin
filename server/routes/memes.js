const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const { Meme } = require('../models');
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

    const memes = await Meme.findApproved({
      page,
      limit
    });

    const totalMemes = await Meme.countDocuments({ isApproved: true });
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
    
    const meme = await Meme.findOne({ id, isApproved: true }).select('-userIP');
    
    if (!meme) {
      return res.status(404).json({
        success: false,
        error: 'Meme not found'
      });
    }
    
    res.json({
      success: true,
      meme: meme
    });
  } catch (error) {
    console.error('Error fetching meme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch meme'
    });
  }
});

// GET /api/memes/:id/original - Get original image for remixing
router.get('/:id/original', async (req, res) => {
  try {
    const { id } = req.params;
    
    const meme = await Meme.findOne({ 
      id, 
      isApproved: true, 
      isRemixable: true,
      $or: [
        { generationType: 'ai' },
        { generationType: 'upload' }
      ]
    }).select('-userIP');
    
    if (!meme) {
      return res.status(404).json({
        success: false,
        error: 'Original image not found or not available for remix'
      });
    }
    
    res.json({
      success: true,
      original: {
        id: meme.id,
        originalImageUrl: meme.originalImageUrl,
        generationType: meme.generationType,
        aiPrompt: meme.aiPrompt,
        enhancedPrompt: meme.enhancedPrompt,
        category: meme.category,
        tags: meme.tags
      }
    });
  } catch (error) {
    console.error('Error fetching original image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch original image'
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
    const { textElements, originalImageUrl, aiPrompt, enhancedPrompt, leonardoGenerationId, tags, sourceImageId } = req.body;
    
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

    // Determine generation type and remixability
    let generationType = 'upload';
    let isRemixable = true;
    
    if (aiPrompt || leonardoGenerationId) {
      generationType = 'ai';
    } else if (sourceImageId) {
      generationType = 'remix';
      isRemixable = false; // Final memes with text are not remixable
    }

    // Create meme data
    const memeData = {
      id: memeId,
      originalImageUrl: originalImageUrl || `/generated/${filename}`,
      finalMemeUrl: `/generated/${filename}`,
      thumbnail: `/generated/thumb_${filename}`,
      generationType,
      aiPrompt: aiPrompt || null,
      enhancedPrompt: enhancedPrompt || null,
      leonardoGenerationId: leonardoGenerationId || null,
      sourceImageId: sourceImageId || null,
      isRemixable,
      textElements: textElements ? JSON.parse(textElements) : [],
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      category: generationType === 'ai' ? 'ai-generated' : 'funny',
      userIP: req.ip,
      isApproved: false // Will need manual approval
    };

    // Save to database
    const newMeme = new Meme(memeData);
    const savedMeme = await newMeme.save();

    // If this is a remix, increment the source image's remix count
    if (sourceImageId) {
      const sourceImage = await Meme.findOne({ id: sourceImageId });
      if (sourceImage) {
        await sourceImage.incrementRemix();
      }
    }

    res.json({
      success: true,
      meme: savedMeme.toSafeObject()
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
    
    const meme = await Meme.findOne({ id, isApproved: true });
    
    if (!meme) {
      return res.status(404).json({
        success: false,
        error: 'Meme not found'
      });
    }

    await meme.incrementLike();
    
    res.json({
      success: true,
      message: 'Meme liked',
      likes: meme.likes
    });
  } catch (error) {
    console.error('Error liking meme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to like meme'
    });
  }
});

// POST /api/memes/:id/view - Track meme view
router.post('/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    
    const meme = await Meme.findOne({ id, isApproved: true });
    
    if (!meme) {
      return res.status(404).json({
        success: false,
        error: 'Meme not found'
      });
    }

    await meme.incrementView();
    
    res.json({
      success: true,
      views: meme.views
    });
  } catch (error) {
    console.error('Error tracking view:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track view'
    });
  }
});

// PUT /api/memes/:id/share - Track meme share
router.put('/:id/share', async (req, res) => {
  try {
    const { id } = req.params;
    
    const meme = await Meme.findOne({ id, isApproved: true });
    
    if (!meme) {
      return res.status(404).json({
        success: false,
        error: 'Meme not found'
      });
    }

    await meme.incrementShare();
    
    res.json({
      success: true,
      message: 'Share tracked',
      shareCount: meme.shareCount
    });
  } catch (error) {
    console.error('Error tracking share:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track share'
    });
  }
});

// PUT /api/memes/:id - Update a meme (admin only for now)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved, featuredInGallery, category, tags } = req.body;
    
    const updateData = {};
    if (typeof isApproved === 'boolean') updateData.isApproved = isApproved;
    if (typeof featuredInGallery === 'boolean') updateData.featuredInGallery = featuredInGallery;
    if (category) updateData.category = category;
    if (tags) updateData.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());

    const updatedMeme = await Meme.findOneAndUpdate(
      { id },
      updateData,
      { new: true }
    ).select('-userIP');

    if (!updatedMeme) {
      return res.status(404).json({
        success: false,
        error: 'Meme not found'
      });
    }
    
    res.json({
      success: true,
      meme: updatedMeme
    });
  } catch (error) {
    console.error('Error updating meme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update meme'
    });
  }
});

// DELETE /api/memes/:id - Delete a meme (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedMeme = await Meme.findOneAndDelete({ id });
    
    if (!deletedMeme) {
      return res.status(404).json({
        success: false,
        error: 'Meme not found'
      });
    }
    
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
    // Get popular remixable images as templates
    const templates = await Meme.find({
      isApproved: true,
      isRemixable: true,
      $or: [
        { generationType: 'ai' },
        { generationType: 'upload' }
      ]
    })
    .sort({ timesRemixed: -1, likes: -1 })
    .limit(10)
    .select('-userIP');

    const templateList = templates.map(template => ({
      id: template.id,
      name: template.aiPrompt ? template.aiPrompt.substring(0, 50) + '...' : 'User Upload',
      imageUrl: template.originalImageUrl,
      description: template.aiPrompt || 'Community uploaded image',
      category: template.category,
      timesRemixed: template.timesRemixed,
      likes: template.likes
    }));

    res.json({
      success: true,
      templates: templateList
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