const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'aqua-memes', // Folder in Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { quality: 'auto:good' }, // Auto optimize quality
      { fetch_format: 'auto' }  // Auto choose best format (WebP, AVIF)
    ],
    public_id: (req, file) => {
      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      return `meme_${timestamp}_${random}`;
    },
  },
});

// Helper functions for image operations
const imageHelpers = {
  // Generate optimized URL for different sizes
  getOptimizedUrl: (publicId, options = {}) => {
    const defaultOptions = {
      quality: 'auto:good',
      fetch_format: 'auto',
      crop: 'fill',
      gravity: 'center'
    };
    
    return cloudinary.url(publicId, { ...defaultOptions, ...options });
  },

  // Generate thumbnail URL
  getThumbnail: (publicId, width = 300, height = 200) => {
    return cloudinary.url(publicId, {
      width,
      height,
      crop: 'fill',
      gravity: 'center',
      quality: 'auto:good',
      fetch_format: 'auto'
    });
  },

  // Generate social media optimized URL
  getSocialUrl: (publicId, platform = 'twitter') => {
    const socialSizes = {
      twitter: { width: 1200, height: 675 },
      facebook: { width: 1200, height: 630 },
      instagram: { width: 1080, height: 1080 },
      discord: { width: 800, height: 600 }
    };

    const size = socialSizes[platform] || socialSizes.twitter;
    
    return cloudinary.url(publicId, {
      ...size,
      crop: 'fill',
      gravity: 'center',
      quality: 'auto:good',
      fetch_format: 'auto'
    });
  },

  // Delete image from Cloudinary
  deleteImage: async (publicId) => {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
      throw error;
    }
  },

  // Upload base64 image (for AI generated images)
  uploadBase64: async (base64Data, options = {}) => {
    try {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const publicId = options.public_id || `ai_meme_${timestamp}_${random}`;

      const result = await cloudinary.uploader.upload(base64Data, {
        folder: 'aqua-memes',
        public_id: publicId,
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ],
        ...options
      });

      return result;
    } catch (error) {
      console.error('Error uploading base64 to Cloudinary:', error);
      throw error;
    }
  }
};

module.exports = {
  cloudinary,
  storage,
  imageHelpers
};
