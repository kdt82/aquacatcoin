const mongoose = require('mongoose');
const { Meme, User } = require('../models');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Load env from root .env in production, fallback to local.env in dev
const rootDir = path.join(__dirname, '..', '..');
const envPath = process.env.NODE_ENV === 'production'
  ? path.join(rootDir, '.env')
  : path.join(rootDir, 'local.env');
require('dotenv').config({ path: envPath });

// Sample memes for testing - simplified structure
const sampleMemes = [
  // Original AI-generated images (remixable)
  {
    id: uuidv4(),
    originalImageUrl: '/aquacat.png',
    finalMemeUrl: '/aquacat.png',
    thumbnail: '/aquacat.png',
    generationType: 'ai',
    aiPrompt: 'A wet blue cat mascot looking sad in the rain',
    enhancedPrompt: 'A cute blue cat mascot looking sad and wet in heavy rain, cartoon style, expressive eyes',
    sourceImageId: null,
    isRemixable: true,
    timesRemixed: 12,
    textElements: [], // Original has no text
    userIP: '127.0.0.1',
    isApproved: true,
    shareCount: 45,
    likes: 189,
    views: 1250,
    tags: ['aqua', 'ai-generated', 'original', 'wet', 'cat'],
    category: 'ai-generated'
  },
  // Remix of the AI image above
  {
    id: uuidv4(),
    originalImageUrl: '/aquacat.png',
    finalMemeUrl: '/aquacat.png',
    thumbnail: '/aquacat.png',
    generationType: 'remix',
    aiPrompt: null,
    enhancedPrompt: null,
    sourceImageId: null, // Will be set to first meme's ID after creation
    isRemixable: false, // Final memes with text are not remixable
    timesRemixed: 0,
    textElements: [
      {
        text: 'When you see rain clouds approaching',
        x: 50,
        y: 20,
        fontSize: 28,
        fontFamily: 'Impact',
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 2
      },
      {
        text: 'But you forgot your umbrella again',
        x: 50,
        y: 80,
        fontSize: 24,
        fontFamily: 'Impact',
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 2
      }
    ],
    userIP: '127.0.0.1',
    isApproved: true,
    shareCount: 42,
    likes: 156,
    views: 890,
    tags: ['aqua', 'wet', 'cat', 'rain', 'umbrella', 'remix'],
    category: 'funny'
  },
  // Original user upload (remixable)
  {
    id: uuidv4(),
    originalImageUrl: '/aquacat.png',
    finalMemeUrl: '/aquacat.png',
    thumbnail: '/aquacat.png',
    generationType: 'upload',
    aiPrompt: null,
    enhancedPrompt: null,
    sourceImageId: null,
    isRemixable: true,
    timesRemixed: 8,
    textElements: [], // Original upload has no text
    userIP: '127.0.0.1',
    isApproved: true,
    shareCount: 23,
    likes: 134,
    views: 765,
    tags: ['aqua', 'upload', 'original', 'community'],
    category: 'classic'
  },
  // Another AI original (remixable)
  {
    id: uuidv4(),
    originalImageUrl: '/aquacat.png',
    finalMemeUrl: '/aquacat.png',
    thumbnail: '/aquacat.png',
    generationType: 'ai',
    aiPrompt: 'A determined cat holding cryptocurrency symbols',
    enhancedPrompt: 'A blue cat mascot with determined expression holding SUI blockchain symbols, digital art style',
    sourceImageId: null,
    isRemixable: true,
    timesRemixed: 15,
    textElements: [], // Original has no text
    userIP: '127.0.0.1',
    isApproved: true,
    shareCount: 67,
    likes: 234,
    views: 1456,
    tags: ['aqua', 'ai-generated', 'crypto', 'sui', 'original'],
    category: 'ai-generated'
  },
  // Remix of crypto AI image
  {
    id: uuidv4(),
    originalImageUrl: '/aquacat.png',
    finalMemeUrl: '/aquacat.png',
    thumbnail: '/aquacat.png',
    generationType: 'remix',
    aiPrompt: null,
    enhancedPrompt: null,
    sourceImageId: null, // Will be set to crypto AI image ID after creation
    isRemixable: false,
    timesRemixed: 0,
    textElements: [
      {
        text: 'HODL AQUA',
        x: 50,
        y: 30,
        fontSize: 32,
        fontFamily: 'Impact',
        color: '#FFD700',
        strokeColor: '#000000',
        strokeWidth: 3
      },
      {
        text: 'Even when it rains',
        x: 50,
        y: 70,
        fontSize: 24,
        fontFamily: 'Impact',
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 2
      }
    ],
    userIP: '127.0.0.1',
    isApproved: true,
    shareCount: 89,
    likes: 312,
    views: 1890,
    tags: ['aqua', 'crypto', 'hodl', 'sui', 'moon', 'remix'],
    category: 'crypto'
  },
  // Weather themed meme (remix)
  {
    id: uuidv4(),
    originalImageUrl: '/aquacat.png',
    finalMemeUrl: '/aquacat.png',
    thumbnail: '/aquacat.png',
    generationType: 'remix',
    aiPrompt: null,
    enhancedPrompt: null,
    sourceImageId: null, // Will be set to original upload ID
    isRemixable: false,
    timesRemixed: 0,
    textElements: [
      {
        text: 'Me checking the weather forecast',
        x: 50,
        y: 30,
        fontSize: 24,
        fontFamily: 'Impact',
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 2
      },
      {
        text: '100% chance of staying indoors',
        x: 50,
        y: 70,
        fontSize: 24,
        fontFamily: 'Impact',
        color: '#FFFF00',
        strokeColor: '#000000',
        strokeWidth: 2
      }
    ],
    userIP: '127.0.0.1',
    isApproved: true,
    shareCount: 123,
    likes: 456,
    views: 2100,
    tags: ['aqua', 'weather', 'indoor', 'forecast', 'relatable', 'remix'],
    category: 'weather'
  },
  // Classic themed meme
  {
    id: uuidv4(),
    originalImageUrl: '/aquacat.png',
    finalMemeUrl: '/aquacat.png',
    thumbnail: '/aquacat.png',
    generationType: 'upload',
    aiPrompt: null,
    enhancedPrompt: null,
    sourceImageId: null,
    isRemixable: true,
    timesRemixed: 5,
    textElements: [], // Original upload
    userIP: '127.0.0.1',
    isApproved: true,
    shareCount: 201,
    likes: 567,
    views: 3200,
    tags: ['aqua', 'classic', 'original', 'community', 'upload'],
    category: 'classic'
  },
  // Final meme from classic original
  {
    id: uuidv4(),
    originalImageUrl: '/aquacat.png',
    finalMemeUrl: '/aquacat.png',
    thumbnail: '/aquacat.png',
    generationType: 'remix',
    aiPrompt: null,
    enhancedPrompt: null,
    sourceImageId: null, // Will be set to classic original
    isRemixable: false,
    timesRemixed: 0,
    textElements: [
      {
        text: 'The original soggy meme',
        x: 50,
        y: 40,
        fontSize: 28,
        fontFamily: 'Impact',
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 2
      },
      {
        text: 'Still making waves on SUI',
        x: 50,
        y: 80,
        fontSize: 20,
        fontFamily: 'Impact',
        color: '#87CEEB',
        strokeColor: '#000000',
        strokeWidth: 2
      }
    ],
    userIP: '127.0.0.1',
    isApproved: true,
    shareCount: 178,
    likes: 445,
    views: 2567,
    tags: ['aqua', 'classic', 'waves', 'sui', 'original', 'remix'],
    category: 'classic'
  }
];

// Sample admin user
const sampleAdmin = {
  username: 'admin',
  email: 'admin@aquacatcoin.xyz',
  role: 'admin',
  isActive: true,
  lastLogin: new Date()
};

async function seedDatabase() {
  try {
    // Connect to database
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aqua-memes';
    await mongoose.connect(mongoURI);
    console.log('Database connected successfully for seeding');

    // Clear existing data (optional - comment out if you want to keep existing data)
    await Meme.deleteMany({});
    await User.deleteMany({});
    console.log('Cleared existing data');

    // Insert sample memes and set up remix relationships
    const createdMemes = [];
    
    for (let i = 0; i < sampleMemes.length; i++) {
      const memeData = { ...sampleMemes[i] };
      
      // Set sourceImageId for remix memes
      if (memeData.generationType === 'remix') {
        if (i === 1) { // First remix - from AI original
          memeData.sourceImageId = createdMemes[0].id;
        } else if (i === 4) { // Crypto remix - from crypto AI original
          memeData.sourceImageId = createdMemes[3].id;
        } else if (i === 5) { // Weather remix - from user upload
          memeData.sourceImageId = createdMemes[2].id;
        } else if (i === 7) { // Classic remix - from classic original
          memeData.sourceImageId = createdMemes[6].id;
        }
      }
      
      const newMeme = new Meme(memeData);
      const savedMeme = await newMeme.save();
      createdMemes.push(savedMeme);
    }

    console.log('Created sample memes:', createdMemes.length);

    // Insert admin user
    const adminUser = new User(sampleAdmin);
    await adminUser.save();
    console.log('Created admin user');

    console.log('Database seeding completed successfully');
    console.log('');
    console.log('Test Data Summary:');
    console.log('  - ' + createdMemes.length + ' memes created');
    console.log('  - 1 admin user created');
    console.log('  - Originals: 4 (2 AI, 2 uploads) - these can be remixed');
    console.log('  - Remixes: 4 (final memes with text) - these are for viewing/sharing');
    console.log('  - Categories: AI-generated, funny, crypto, weather, classic');
    console.log('  - All memes pre-approved for testing');
    console.log('');
    console.log('Admin Login Details:');
    console.log('  - Username: admin');
    console.log('  - Email: admin@aquacatcoin.xyz');
    console.log('');
    console.log('Gallery Structure:');
    console.log('  - Main Gallery: Shows all 8 memes (originals + final versions)');
    console.log('  - Remix Gallery: Shows 4 original images available for remixing');
    console.log('  - Users can "Use Original" on AI/upload images to remix them');
    console.log('');
    console.log('You can now test the gallery at: http://localhost:3000/gallery');

  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, sampleMemes, sampleAdmin }; 