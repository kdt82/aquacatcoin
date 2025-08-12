const express = require('express');
const router = express.Router();

// Home page route
router.get('/', (req, res) => {
  res.render('index');
});

// Meme Generator Coming Soon route (PUBLIC)
router.get('/meme-generator', (req, res) => {
  res.render('coming-soon', {
    title: 'Meme Generator – Coming Soon | $AQUA',
    description: 'Our AI-powered $AQUA Meme Generator is almost here. Get ready to create, remix, and share the soggiest memes on the SUI Network.',
    canonicalUrl: 'https://www.aquacatcoin.xyz/meme-generator',
    ogImage: 'https://www.aquacatcoin.xyz/aquacat.png',
    currentPath: '/meme-generator'
  });
});

// Terms of Service route (PUBLIC - when live)
router.get('/meme-generator/terms', (req, res) => {
  res.render('meme-generator', {
    title: 'Terms of Service - $AQUA Meme Generator | $AQUA',
    description: 'Terms of Service for the $AQUA AI Meme Generator. Learn about usage rights, credit system, and community guidelines.',
    canonicalUrl: 'https://www.aquacatcoin.xyz/meme-generator/terms',
    ogImage: 'https://www.aquacatcoin.xyz/aquacat.png',
    currentPath: '/meme-generator/terms',
    autoOpenTerms: true
  });
});

// Gallery Coming Soon route (PUBLIC)
router.get('/gallery', (req, res) => {
  res.render('coming-soon', {
    title: 'Gallery – Coming Soon | $AQUA',
    description: 'Our $AQUA Meme Gallery is almost ready. Soon you\'ll be able to browse, like, and remix the best community memes.',
    canonicalUrl: 'https://www.aquacatcoin.xyz/gallery',
    ogImage: 'https://www.aquacatcoin.xyz/aquacat.png',
    currentPath: '/gallery'
  });
});

// ===========================================
// PREVIEW/TESTING ROUTES (DEVELOPMENT ONLY)
// ===========================================

// Development Preview Dashboard
router.get('/dev-preview', (req, res) => {
  res.render('dev-preview', {
    title: '[DEV] Preview Dashboard - $AQUA Meme Deck',
    description: 'Development preview dashboard for testing $AQUA meme generator and gallery features.',
    canonicalUrl: 'https://www.aquacatcoin.xyz/',
    ogImage: 'https://www.aquacatcoin.xyz/aquacat.png',
    currentPath: '/dev-preview'
  });
});

// Meme Generator Preview (TESTING)
router.get('/preview/meme-generator', (req, res) => {
  res.render('meme-generator', {
    title: '[PREVIEW] $AQUA Meme Generator | Create & Share Crypto Memes',
    description: 'Create hilarious $AQUA memes with our AI-powered generator! Upload images or generate new ones with Leonardo AI.',
    canonicalUrl: 'https://www.aquacatcoin.xyz/meme-generator',
    ogImage: 'https://www.aquacatcoin.xyz/aquacat.png',
    currentPath: '/preview/meme-generator'
  });
});

// Terms of Service Preview (TESTING)
router.get('/preview/meme-generator/terms', (req, res) => {
  res.render('meme-generator', {
    title: '[PREVIEW] Terms of Service - $AQUA Meme Generator',
    description: 'Terms of Service for the $AQUA AI Meme Generator. Learn about usage rights, credit system, and community guidelines.',
    canonicalUrl: 'https://www.aquacatcoin.xyz/meme-generator/terms',
    ogImage: 'https://www.aquacatcoin.xyz/aquacat.png',
    currentPath: '/preview/meme-generator/terms',
    autoOpenTerms: true
  });
});

// Gallery Preview (TESTING)
router.get('/preview/gallery', (req, res) => {
  res.render('gallery', {
    title: '[PREVIEW] $AQUA Meme Gallery | Community Created Crypto Memes',
    description: 'Explore the funniest $AQUA memes created by our community! Browse AI-generated and user-created memes featuring the soggy cat.',
    canonicalUrl: 'https://www.aquacatcoin.xyz/gallery',
    ogImage: 'https://www.aquacatcoin.xyz/aquacat.png',
    currentPath: '/preview/gallery'
  });
});

// About page route (optional separate page)
router.get('/about', (req, res) => {
  res.render('about', {
    title: 'About $AQUA | The Legend of the Soggy Cat',
    description: 'Learn about $AQUA, the meme coin featuring a cat who\'s always caught in the rain but can\'t hold an umbrella.',
    canonicalUrl: 'https://www.aquacatcoin.xyz/about',
    ogImage: 'https://www.aquacatcoin.xyz/aquacat.png',
    currentPath: '/about'
  });
});

// Tokenomics page route (optional separate page)
router.get('/tokenomics', (req, res) => {
  res.render('tokenomics', {
    title: 'Tokenomics | $AQUA Distribution',
    description: 'Detailed breakdown of $AQUA token allocation and distribution. Transparent tokenomics for the community.',
    canonicalUrl: 'https://www.aquacatcoin.xyz/tokenomics',
    ogImage: 'https://www.aquacatcoin.xyz/aquacat.png',
    currentPath: '/tokenomics'
  });
});

// API status route for frontend
router.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: {
      memeGenerator: true,
      aiGeneration: !!process.env.LEONARDO_API_KEY,
      gallery: true,
      socialSharing: true
    }
  });
});

// Sitemap route
router.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.render('sitemap', {
    baseUrl: 'https://www.aquacatcoin.xyz',
    lastmod: new Date().toISOString().split('T')[0]
  });
});

// Robots.txt route
router.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.render('robots', {
    baseUrl: 'https://www.aquacatcoin.xyz'
  });
});

// IP Debug endpoint for development
router.get('/debug/ip', (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  const whitelistedIPs = (process.env.RATE_LIMIT_WHITELIST_IPS || '').split(',').map(ip => ip.trim()).filter(ip => ip.length > 0);
  const isWhitelisted = whitelistedIPs.includes(clientIP);
  
  res.json({
    detectedIP: clientIP,
    whitelistedIPs: whitelistedIPs,
    isWhitelisted: isWhitelisted,
    headers: {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip'],
      'cf-connecting-ip': req.headers['cf-connecting-ip']
    },
    rawConnection: {
      remoteAddress: req.connection?.remoteAddress,
      socketRemoteAddress: req.socket?.remoteAddress
    }
  });
});

// Leonardo AI Models Debug endpoint
router.get('/debug/leonardo-models', async (req, res) => {
  try {
    const axios = require('axios');
    const apiKey = process.env.LEONARDO_API_KEY;
    
    if (!apiKey) {
      return res.json({ error: 'LEONARDO_API_KEY not configured' });
    }

    let platformModels = [];
    let customModels = [];
    let errors = [];

    // Try to get platform models
    try {
      const platformResponse = await axios.get('https://cloud.leonardo.ai/api/rest/v1/platformModels', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      platformModels = platformResponse.data?.custom_models || platformResponse.data || [];
    } catch (error) {
      errors.push({ endpoint: 'platformModels', error: error.response?.data || error.message });
    }

    // Try to get user's custom models
    try {
      const customResponse = await axios.get('https://cloud.leonardo.ai/api/rest/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      customModels = customResponse.data?.custom_models || customResponse.data || [];
    } catch (error) {
      errors.push({ endpoint: 'models', error: error.response?.data || error.message });
    }

    // Try user info to see what's available
    let userInfo = null;
    try {
      const userResponse = await axios.get('https://cloud.leonardo.ai/api/rest/v1/me', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      userInfo = userResponse.data;
    } catch (error) {
      errors.push({ endpoint: 'me', error: error.response?.data || error.message });
    }

    res.json({
      currentConfig: {
        AQUA_MODEL_ID: process.env.AQUA_MODEL_ID,
        targetModel: 'c01eee56-97b1-402e-8471-221481ea5bd9'
      },
      platformModels,
      customModels,
      userInfo,
      errors,
      message: 'Check if your AQUA model appears in customModels. If not, it may still be training.'
    });
  } catch (error) {
    res.json({
      error: 'Failed to fetch Leonardo models',
      details: error.response?.data || error.message,
      currentConfig: {
        AQUA_MODEL_ID: process.env.AQUA_MODEL_ID,
        targetModel: 'c01eee56-97b1-402e-8471-221481ea5bd9'
      }
    });
  }
});

module.exports = router; 