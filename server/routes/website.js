const express = require('express');
const router = express.Router();

// Home page route
router.get('/', (req, res) => {
  res.render('index');
});

// Meme Generator Coming Soon route
router.get('/meme-generator', (req, res) => {
  res.render('coming-soon', {
    title: 'Meme Generator – Coming Soon | $AQUA',
    description: 'Our AI-powered $AQUA Meme Generator is almost here. Get ready to create, remix, and share the soggiest memes on the SUI Network.',
    canonicalUrl: 'https://www.aquacatcoin.xyz/meme-generator',
    ogImage: 'https://www.aquacatcoin.xyz/aquacat.png',
    currentPath: '/meme-generator'
  });
});

// Gallery page route
router.get('/gallery', (req, res) => {
  res.render('gallery', {
    title: '$AQUA Meme Gallery | Community Created Crypto Memes',
    description: 'Explore the funniest $AQUA memes created by our community! Browse AI-generated and user-created memes featuring the soggy cat. Get inspired for your next meme creation.',
    canonicalUrl: 'https://www.aquacatcoin.xyz/gallery',
    ogImage: 'https://www.aquacatcoin.xyz/aquacat.png',
    currentPath: '/gallery'
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

module.exports = router; 