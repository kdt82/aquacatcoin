const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const { Meme } = require('../models');
const { paths } = require('../config/paths');
const { cloudinary, storage: cloudinaryStorage, imageHelpers } = require('../config/cloudinary');

// Configure multer for file uploads with Cloudinary
const upload = multer({
  storage: cloudinaryStorage,
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

// Fallback memory storage for local processing if needed
const memoryUpload = multer({
  storage: multer.memoryStorage(),
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
  const uploadDir = path.join(paths.uploadsDir, 'memes');
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

      // Cloudinary automatically handles the upload via multer-storage-cloudinary
      const imageUrl = req.file.path; // Cloudinary URL
      const publicId = req.file.public_id; // Cloudinary public ID
      
      // Generate optimized thumbnail using Cloudinary
      const thumbnailUrl = imageHelpers.getThumbnail(publicId, 300, 200);
      
      // Generate different sizes for responsive design
      const optimizedUrl = imageHelpers.getOptimizedUrl(publicId, { width: 800, height: 600 });

      res.json({
        success: true,
        imageUrl: optimizedUrl,
        thumbnailUrl: thumbnailUrl,
        originalUrl: imageUrl,
        publicId: publicId,
        message: 'Image uploaded successfully to Cloudinary'
      });
    } catch (error) {
      console.error('Error uploading image to Cloudinary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload image to Cloudinary'
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

      // Handle canvas image if provided (uploaded via Cloudinary)
      let finalMemeUrl = baseImageUrl;
      let thumbnailUrl = null;
      let cloudinaryPublicId = null;

      if (req.file) {
        // Cloudinary automatically handled the upload
        finalMemeUrl = req.file.path; // Cloudinary URL
        cloudinaryPublicId = req.file.public_id; // Cloudinary public ID
        thumbnailUrl = imageHelpers.getThumbnail(cloudinaryPublicId, 300, 200);
      } else if (baseImageUrl && baseImageUrl.startsWith('data:image')) {
        // Handle base64 images (AI generated) - upload to Cloudinary
        try {
          const uploadResult = await imageHelpers.uploadBase64(baseImageUrl, {
            folder: 'aqua-memes/ai-generated'
          });
          finalMemeUrl = uploadResult.secure_url;
          cloudinaryPublicId = uploadResult.public_id;
          thumbnailUrl = imageHelpers.getThumbnail(cloudinaryPublicId, 300, 200);
        } catch (error) {
          console.error('Error uploading AI image to Cloudinary:', error);
          // Fallback to original base64 if Cloudinary fails
        }
      }

      // Create meme document
      const memeData = {
        title: title || 'Untitled Meme',
        textElements: textElements ? JSON.parse(textElements) : [],
        baseImageUrl,
        originalImageUrl: originalImageUrl || baseImageUrl,
        finalMemeUrl,
        thumbnail: thumbnailUrl || finalMemeUrl,
        cloudinaryPublicId: cloudinaryPublicId,
        cloudinaryFolder: 'aqua-memes',
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
  },

  // Save meme from frontend data (different from createMeme)
  saveMeme: async (req, res) => {
    try {
      const {
        originalImageUrl,
        finalMemeUrl,
        thumbnailDataUrl,
        textElements,
        customTitle,
        tags,
        source
      } = req.body;

      // Validate required fields
      if (!finalMemeUrl) {
        return res.status(400).json({
          success: false,
          error: 'Final meme image is required'
        });
      }

      // Extract original image URL from object if needed
      let cleanOriginalUrl = originalImageUrl;
      if (typeof originalImageUrl === 'object' && originalImageUrl?.url) {
        cleanOriginalUrl = originalImageUrl.url;
      }

      // Convert data URLs to Cloudinary URLs
      let savedImageUrl = null;
      let savedThumbnailUrl = null;
      let cloudinaryPublicId = null;
      let savedOriginalUrl = null;
      let originalCloudinaryPublicId = null;

      if (finalMemeUrl.startsWith('data:image/')) {
        // Upload final meme to Cloudinary
        try {
          const uploadResult = await imageHelpers.uploadBase64(finalMemeUrl, {
            folder: 'aqua-memes/user-generated'
          });
          savedImageUrl = uploadResult.secure_url;
          cloudinaryPublicId = uploadResult.public_id;
          savedThumbnailUrl = imageHelpers.getThumbnail(cloudinaryPublicId, 300, 200);
          console.log('✅ Final meme uploaded to Cloudinary:', cloudinaryPublicId);
        } catch (error) {
          console.error('❌ Failed to upload final meme to Cloudinary:', error);
          // Fallback to local storage if Cloudinary fails
          const base64Data = finalMemeUrl.replace(/^data:image\/\w+;base64,/, '');
          const imageBuffer = Buffer.from(base64Data, 'base64');
          const filename = `meme_${uuidv4()}.png`;
          savedImageUrl = await saveImageBuffer(imageBuffer, filename);
          savedThumbnailUrl = await createThumbnail(imageBuffer, filename);
        }
      } else {
        savedImageUrl = finalMemeUrl;
        // Create thumbnail from final image if no thumbnail provided
        if (!savedThumbnailUrl) {
          savedThumbnailUrl = savedImageUrl; // Fallback
        }
      }

      // Also upload original image to Cloudinary for remixing
      if (cleanOriginalUrl && cleanOriginalUrl.startsWith('data:image/')) {
        try {
          const originalUploadResult = await imageHelpers.uploadBase64(cleanOriginalUrl, {
            folder: 'aqua-memes/originals'
          });
          savedOriginalUrl = originalUploadResult.secure_url;
          originalCloudinaryPublicId = originalUploadResult.public_id;
          console.log('✅ Original image uploaded to Cloudinary:', originalCloudinaryPublicId);
        } catch (error) {
          console.error('❌ Failed to upload original image to Cloudinary:', error);
          savedOriginalUrl = cleanOriginalUrl; // Keep original URL as fallback
        }
      } else {
        savedOriginalUrl = cleanOriginalUrl;
      }

      // Process text elements to match schema requirements
      const processedTextElements = (textElements || []).map(element => ({
        text: element.text || '',
        x: element.position?.x || element.x || 0,
        y: element.position?.y || element.y || 0,
        fontSize: element.size || element.fontSize || 24,
        fontFamily: element.font || element.fontFamily || 'Impact',
        color: element.color || '#FFFFFF',
        strokeColor: element.strokeColor || '#000000',
        strokeWidth: element.strokeWidth || 2
      }));

      // Generate unique ID
      const memeId = `meme_${uuidv4()}`;

      // Create meme in database
      const meme = new Meme({
        id: memeId,
        title: customTitle || `Generated Meme ${Date.now()}`,
        originalImageUrl: savedOriginalUrl || savedImageUrl,
        finalMemeUrl: savedImageUrl,
        thumbnail: savedThumbnailUrl,
        cloudinaryPublicId: cloudinaryPublicId,
        cloudinaryFolder: cloudinaryPublicId ? 'aqua-memes/user-generated' : null,
        originalCloudinaryPublicId: originalCloudinaryPublicId,
        textElements: processedTextElements,
        generationType: 'upload', // Valid enum value for user-generated content
        source: source || 'web-generator',
        tags: tags || ['user-generated'],
        userId: req.user ? req.user._id : null,
        userIP: req.ip,
        isApproved: true, // Auto-approve user-generated content
        isRemixable: true,
        category: 'funny' // Valid enum value
      });

      const savedMeme = await meme.save();

      // Add to user's created memes if authenticated
      if (req.user) {
        await req.user.addMeme(savedMeme._id);
      }

      console.log('✅ Meme saved successfully:', savedMeme.id);

      res.json({
        success: true,
        message: 'Meme saved successfully',
        meme: {
          id: savedMeme.id,
          finalMemeUrl: savedMeme.finalMemeUrl,
          thumbnailUrl: savedMeme.thumbnail,
          createdAt: savedMeme.createdAt
        }
      });

    } catch (error) {
      console.error('Save meme error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to save meme'
      });
    }
  }
};

module.exports = {
  memeController,
  upload
}; 