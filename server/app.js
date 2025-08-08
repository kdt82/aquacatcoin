const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

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

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://cloud.leonardo.ai"]
    }
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://www.aquacatcoin.xyz', 'https://aquacatcoin.xyz', 'http://54.187.91.146:3000']
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://54.187.91.146:3000'],
  credentials: true
}));

// General middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 AI generations per hour
  message: 'AI generation limit reached. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

// Debug middleware to log ALL requests
app.use((req, res, next) => {
  console.log('🌐 Request:', req.method, req.url);
  if (req.url.includes('.css')) {
    console.log('🎨 CSS Request detected:', req.url);
  }
  next();
});

// Static files with proper MIME types and cache control
app.use(express.static(paths.publicDir, {
  setHeaders: (res, path) => {
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      console.log('✅ Serving CSS file:', path);
    }
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));
app.use('/uploads', express.static(paths.uploadsDir));
app.use('/generated', express.static(paths.generatedDir));

// Database connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aqua-memes';
    await mongoose.connect(mongoURI);
    console.log('🗄️  MongoDB connected successfully');
  } catch (error) {
    console.warn('⚠️  MongoDB connection failed:', error.message);
    console.log('🔄 Running in development mode without database');
    // Don't exit in development - allow running without MongoDB
  }
};

// Routes
app.use('/', require('./routes/website'));
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