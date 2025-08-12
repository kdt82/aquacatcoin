const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');

// Load environment variables: prefer root .env in production, fallback to local.env in development
const rootDir = path.join(__dirname, '..');
const envPath = process.env.NODE_ENV === 'production'
  ? path.join(rootDir, '.env')
  : path.join(rootDir, 'local.env');
require('dotenv').config({ path: envPath });

const { paths } = require('./config/paths');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', paths.viewsDir);

// Security middleware - disable HTTPS enforcement for development
app.use((req, res, next) => {
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(req.get('User-Agent') || '');
  
  if (isMobile) {
    // Disable CSP for mobile devices temporarily for debugging
    console.log('📱 Mobile device detected - disabling CSP for debugging');
    next();
  } else {
    // Apply CSP for desktop
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://static.cloudflareinsights.com"],
          scriptSrcAttr: ["'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: ["'self'", "https://cloud.leonardo.ai"]
        }
      },
      hsts: false
    })(req, res, next);
  }
});

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://www.aquacatcoin.xyz', 'https://aquacatcoin.xyz', 'https://aquacat-meme-generator.up.railway.app']
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://54.187.91.146:3000'],
  credentials: true
}));

// General middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Session configuration for OAuth
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'aqua_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
};

// Only add MongoDB store if we have a database connection
const mongoUrl = process.env.DATABASE_URL || process.env.MONGODB_URI;
if (mongoUrl) {
  sessionConfig.store = MongoStore.create({
    mongoUrl: mongoUrl,
    touchAfter: 24 * 3600 // Lazy session update
  });
  console.log('🗄️  Session store using MongoDB');
} else {
  console.log('⚠️  Session store using memory (development only)');
}

app.use(session(sessionConfig));

// Rate limiting with IP whitelist
const getWhitelistedIPs = () => {
  const whitelist = process.env.RATE_LIMIT_WHITELIST_IPS || '';
  return whitelist.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0);
};

const isWhitelistedIP = (ip) => {
  const whitelistedIPs = getWhitelistedIPs();
  return whitelistedIPs.includes(ip);
};

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const isWhitelisted = isWhitelistedIP(clientIP);
    if (isWhitelisted) {
      console.log(`🟢 Rate limit bypassed for whitelisted IP: ${clientIP}`);
    }
    return isWhitelisted;
  }
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 AI generations per hour
  message: 'AI generation limit reached. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const isWhitelisted = isWhitelistedIP(clientIP);
    if (isWhitelisted) {
      console.log(`🟢 AI rate limit bypassed for whitelisted IP: ${clientIP}`);
    }
    return isWhitelisted;
  }
});

// Debug middleware to log ALL requests (before rate limiting)
app.use((req, res, next) => {
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(req.get('User-Agent') || '');
  const deviceType = isMobile ? '📱 MOBILE' : '💻 DESKTOP';
  
  console.log('🌐 Request:', req.method, req.url, `from ${deviceType} (${req.ip})`);
  if (req.url.includes('.css')) {
    console.log(`🎨 CSS Request detected: ${req.url} from ${deviceType} (${req.ip})`);
  }
  next();
});

// Static files BEFORE rate limiting
app.use(express.static(paths.publicDir, {
  setHeaders: (res, path, stat) => {
    // Add CORS headers for mobile compatibility
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    // Aggressive cache busting for mobile
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Last-Modified', new Date().toUTCString());
    res.setHeader('ETag', Date.now().toString());
    
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      console.log('🎨 CSS Request detected:', path);
      console.log('✅ Serving CSS file:', path);
    }
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
  }
}));
app.use('/uploads', express.static(paths.uploadsDir));
app.use('/generated', express.static(paths.generatedDir));

app.use(generalLimiter);

// Database connection
const connectDB = async () => {
  try {
    // Railway provides DATABASE_URL, fallback to MONGODB_URI, then local MongoDB
    const mongoURI = process.env.DATABASE_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/aqua-memes';
    
    console.log('🔄 Attempting to connect to MongoDB...');
    console.log('🔗 Connection string:', mongoURI.replace(/\/\/[^@]+@/, '//***:***@')); // Hide credentials in logs
    
    await mongoose.connect(mongoURI);
    console.log('🗄️  MongoDB connected successfully');
  } catch (error) {
    console.warn('⚠️  MongoDB connection failed:', error.message);
    console.log('🔄 Running in development mode without database');
    console.log('💡 This is normal if you haven\'t set up MongoDB yet');
    // Don't exit in development - allow running without MongoDB
  }
};

// Test route for static files
app.get('/test-static', (req, res) => {
  res.json({
    message: 'Server is working',
    publicDir: paths.publicDir,
    timestamp: new Date().toISOString()
  });
});

// Test route for CSS delivery
app.get('/test-css', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const cssPath = path.join(paths.publicDir, 'css', 'main.css');
  
  try {
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(cssContent);
  } catch (error) {
    res.status(404).json({ error: 'CSS file not found', path: cssPath });
  }
});

// Routes
app.use('/', require('./routes/website'));
app.use('/auth', require('./routes/auth'));
app.use('/api/limits', require('./routes/limits'));
app.use('/api/memes', require('./routes/memes'));
app.use('/api/ai', aiLimiter, require('./routes/ai'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/social', require('./routes/social'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Database seed endpoint (production only)
app.post('/admin/seed-database', async (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    return res.status(403).json({ error: 'Seed endpoint only available in production' });
  }
  
  try {
    // Import seed function dynamically
    const seedPath = require('path').join(__dirname, 'database', 'seed.js');
    delete require.cache[require.resolve(seedPath)];
    const { seedDatabase } = require('./database/seed');
    
    console.log('🌱 Starting database seeding...');
    await seedDatabase();
    console.log('✅ Database seeded successfully');
    res.json({ success: true, message: 'Database seeded successfully' });
  } catch (error) {
    console.error('❌ Seed error:', error);
    res.status(500).json({ error: 'Seeding failed', details: error.message });
  }
});

// Image proxy endpoint to handle CORS issues with external images
app.get('/api/proxy-image', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter required' });
    }
    
    // Only allow Leonardo AI and Cloudinary URLs for security
    const allowedDomains = [
      'cloud.leonardo.ai',
      'cdn.leonardo.ai', 
      'res.cloudinary.com',
      'cloudinary.com'
    ];
    
    const urlObj = new URL(url);
    if (!allowedDomains.some(domain => urlObj.hostname.includes(domain))) {
      return res.status(403).json({ error: 'Domain not allowed' });
    }
    
    // Fetch the image
    const fetch = require('node-fetch');
    const response = await fetch(url);
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch image' });
    }
    
    // Set appropriate headers
    res.set({
      'Content-Type': response.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      'Access-Control-Allow-Origin': '*'
    });
    
    // Stream the image
    response.body.pipe(res);
    
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ error: 'Proxy error' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', {
    title: '404 - Page Not Found | $AQUA',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  
  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Something went wrong!' 
    : err.message;
    
  res.status(err.status || 500).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// Start server
const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 $AQUA Meme Generator server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Local: http://localhost:${PORT}`);
    console.log(`🔗 Network: http://0.0.0.0:${PORT}`);
  });
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  process.exit(1);
});

startServer();

module.exports = app; 