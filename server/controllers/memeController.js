const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const { Meme } = require('../models');

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

// Helper function to ensure upload directory exists
async function ensureUploadDir() {
  const uploadDir = path.join(process.cwd(), 'uploads', 'memes');
  try {
    await fs.access(uploadDir);
  } catch (error) {
    await fs.mkdir(uploadDir, { recursive: true });
  }
  return uploadDir;
}

// Helper function to save image buffer to file
async function saveImageBuffer(buffer, filename) {
  const uploadDir = await ensureUploadDir();
  const filePath = path.join(uploadDir, filename);
  await fs.writeFile(filePath, buffer);
  return `/uploads/memes/${filename}`;
}

// Helper function to create thumbnail
async function createThumbnail(buffer, filename) {
  const thumbnailBuffer = await sharp(buffer)
    .resize(300, 300, { fit: 'cover' })
    .jpeg({ quality: 80 })
    .toBuffer();
  
  const thumbnailFilename = `thumb_${filename.replace(/\.[^/.]+$/, '.jpg')}`;
  return await saveImageBuffer(thumbnailBuffer, thumbnailFilename);
}

const memeController = {
  // GET /api/memes - Get all memes (paginated)
  getAllMemes: async (req, res) => {
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
  },

  // GET /api/memes/:id - Get specific meme
  getMemeById: async (req, res) => {
    try {
      const { id } = req.params;
      const meme = await Meme.findById(id);

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
  },

  // GET /api/memes/:id/original - Get original image for remixing
  getOriginalImage: async (req, res) => {
    try {
      const { id } = req.params;
      const meme = await Meme.findById(id);

      if (!meme) {
        return res.status(404).json({
          success: false,
          error: 'Meme not found'
        });
      }

      if (!meme.isRemixable) {
        return res.status(403).json({
          success: false,
          error: 'This meme is not available for remixing'
        });
      }

      // Return the original image URL (without text overlays)
      const originalImageUrl = meme.originalImageUrl || meme.baseImageUrl;
      
      if (!originalImageUrl) {
        return res.status(404).json({
          success: false,
          error: 'Original image not available'
        });
      }

      res.json({
        success: true,
        originalImageUrl: originalImageUrl,
        meme: {
          id: meme.id,
          title: meme.title,
          generationType: meme.generationType,
          aiPrompt: meme.aiPrompt
        }
      });
    } catch (error) {
      console.error('Error fetching original image:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch original image'
      });
    }
  },

  // POST /api/memes/upload - Upload base image
  uploadImage: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No image file provided'
        });
      }

      const filename = `upload_${uuidv4()}.${req.file.mimetype.split('/')[1]}`;
      const imageUrl = await saveImageBuffer(req.file.buffer, filename);
      const thumbnailUrl = await createThumbnail(req.file.buffer, filename);

      res.json({
        success: true,
        imageUrl: imageUrl,
        thumbnailUrl: thumbnailUrl,
        message: 'Image uploaded successfully'
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload image'
      });
    }
  },

  // POST /api/memes/create - Create new meme
  createMeme: async (req, res) => {
    try {
      const {
        title,
        textElements,
        baseImageUrl,
        originalImageUrl,
        generationType,
        aiPrompt,
        parentMemeId,
        category,
        isRemixable
      } = req.body;

      // Validate required fields
      if (!baseImageUrl) {
        return res.status(400).json({
          success: false,
          error: 'Base image URL is required'
        });
      }

      // Handle canvas image if provided
      let finalMemeUrl = baseImageUrl;
      let thumbnailUrl = null;

      if (req.file) {
        const filename = `meme_${uuidv4()}.${req.file.mimetype.split('/')[1]}`;
        finalMemeUrl = await saveImageBuffer(req.file.buffer, filename);
        thumbnailUrl = await createThumbnail(req.file.buffer, filename);
      }

      // Create meme document
      const memeData = {
        title: title || 'Untitled Meme',
        textElements: textElements ? JSON.parse(textElements) : [],
        baseImageUrl,
        originalImageUrl: originalImageUrl || baseImageUrl,
        finalMemeUrl,
        thumbnail: thumbnailUrl || finalMemeUrl,
        generationType: generationType || 'manual',
        aiPrompt: aiPrompt || null,
        parentMemeId: parentMemeId || null,
        category: category || 'general',
        isRemixable: isRemixable !== 'false',
        isApproved: true, // Auto-approve for now
        createdAt: new Date(),
        views: 0,
        likes: 0,
        shareCount: 0
      };

      const meme = new Meme(memeData);
      await meme.save();

      // Update parent meme remix count if this is a remix
      if (parentMemeId) {
        try {
          await Meme.findByIdAndUpdate(parentMemeId, {
            $inc: { timesRemixed: 1 }
          });
        } catch (updateError) {
          console.error('Error updating parent meme remix count:', updateError);
        }
      }

      res.json({
        success: true,
        meme: meme,
        message: 'Meme created successfully'
      });
    } catch (error) {
      console.error('Error creating meme:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create meme'
      });
    }
  },

  // PUT /api/memes/:id/like - Like a meme
  likeMeme: async (req, res) => {
    try {
      const { id } = req.params;
      
      const meme = await Meme.findByIdAndUpdate(
        id,
        { $inc: { likes: 1 } },
        { new: true }
      );

      if (!meme) {
        return res.status(404).json({
          success: false,
          error: 'Meme not found'
        });
      }

      res.json({
        success: true,
        likes: meme.likes,
        message: 'Meme liked successfully'
      });
    } catch (error) {
      console.error('Error liking meme:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to like meme'
      });
    }
  },

  // POST /api/memes/:id/view - Increment view count
  incrementViews: async (req, res) => {
    try {
      const { id } = req.params;
      
      const meme = await Meme.findByIdAndUpdate(
        id,
        { $inc: { views: 1 } },
        { new: true }
      );

      if (!meme) {
        return res.status(404).json({
          success: false,
          error: 'Meme not found'
        });
      }

      res.json({
        success: true,
        views: meme.views,
        message: 'View count updated'
      });
    } catch (error) {
      console.error('Error updating view count:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update view count'
      });
    }
  },

  // PUT /api/memes/:id/share - Increment share count
  shareMeme: async (req, res) => {
    try {
      const { id } = req.params;
      
      const meme = await Meme.findByIdAndUpdate(
        id,
        { $inc: { shareCount: 1 } },
        { new: true }
      );

      if (!meme) {
        return res.status(404).json({
          success: false,
          error: 'Meme not found'
        });
      }

      res.json({
        success: true,
        shareCount: meme.shareCount,
        message: 'Share count updated'
      });
    } catch (error) {
      console.error('Error updating share count:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update share count'
      });
    }
  },

  // PUT /api/memes/:id - Update meme
  updateMeme: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Remove fields that shouldn't be updated via this endpoint
      delete updateData._id;
      delete updateData.createdAt;
      delete updateData.views;
      delete updateData.likes;
      delete updateData.shareCount;

      const meme = await Meme.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { new: true }
      );

      if (!meme) {
        return res.status(404).json({
          success: false,
          error: 'Meme not found'
        });
      }

      res.json({
        success: true,
        meme: meme,
        message: 'Meme updated successfully'
      });
    } catch (error) {
      console.error('Error updating meme:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update meme'
      });
    }
  },

  // DELETE /api/memes/:id - Delete meme
  deleteMeme: async (req, res) => {
    try {
      const { id } = req.params;
      
      const meme = await Meme.findByIdAndDelete(id);

      if (!meme) {
        return res.status(404).json({
          success: false,
          error: 'Meme not found'
        });
      }

      // TODO: Clean up associated files
      // This would involve deleting the image files from the uploads directory

      res.json({
        success: true,
        message: 'Meme deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting meme:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete meme'
      });
    }
  },

  // GET /api/memes/templates - Get meme templates
  getTemplates: async (req, res) => {
    try {
      // For now, return a static list of templates
      // In the future, this could come from a database or file system
      const templates = [
        {
          id: 'aqua-sad',
          name: 'Sad AQUA',
          imageUrl: '/images/templates/aqua-sad.jpg',
          category: 'emotion'
        },
        {
          id: 'aqua-happy',
          name: 'Happy AQUA',
          imageUrl: '/images/templates/aqua-happy.jpg',
          category: 'emotion'
        },
        {
          id: 'aqua-confused',
          name: 'Confused AQUA',
          imageUrl: '/images/templates/aqua-confused.jpg',
          category: 'emotion'
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
  }
};

module.exports = {
  memeController,
  upload
}; 