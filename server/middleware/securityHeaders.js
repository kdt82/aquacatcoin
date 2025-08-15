const helmet = require('helmet');

// Enhanced security headers configuration
const getSecurityHeaders = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        
        // Scripts - Allow inline for development, stricter for production
        scriptSrc: [
          "'self'",
          ...(isDevelopment ? ["'unsafe-inline'"] : []),
          "https://cdnjs.cloudflare.com",
          "https://static.cloudflareinsights.com",
          "https://unpkg.com", // For fabric.js and other libraries
          "'sha256-*'", // Allow specific script hashes
        ],
        
        // Styles - Allow inline styles for dynamic canvas styling
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Required for dynamic styling
          "https://fonts.googleapis.com",
          "https://cdnjs.cloudflare.com",
          "https://unpkg.com"
        ],
        
        // Fonts
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com",
          "data:" // Allow data URIs for custom fonts
        ],
        
        // Images - Allow external images for meme generation
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https:",
          "http:", // Allow HTTP images for meme sources (dev only)
          "*.leonardo.ai",
          "*.cloudinary.com",
          "res.cloudinary.com"
        ],
        
        // Media
        mediaSrc: [
          "'self'",
          "data:",
          "blob:",
          "https:"
        ],
        
        // Connect - API endpoints and external services
        connectSrc: [
          "'self'",
          "https://cloud.leonardo.ai",
          "https://api.leonardo.ai",
          "https://res.cloudinary.com",
          ...(isDevelopment ? ["http://localhost:*", "ws://localhost:*"] : [])
        ],
        
        // Objects and embeds
        objectSrc: ["'none'"],
        embedSrc: ["'none'"],
        
        // Frames
        frameSrc: ["'none'"],
        frameAncestors: ["'none'"],
        
        // Base URI
        baseUri: ["'self'"],
        
        // Form actions
        formAction: ["'self'"],
        
        // Manifests
        manifestSrc: ["'self'"],
        
        // Workers
        workerSrc: ["'self'", "blob:"],
        
        // Child sources
        childSrc: ["'self'", "blob:"]
      },
      reportOnly: isDevelopment, // Report-only mode in development
    },

    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },

    // X-Frame-Options
    frameguard: {
      action: 'deny'
    },

    // X-Content-Type-Options
    noSniff: true,

    // X-XSS-Protection (legacy browsers)
    xssFilter: true,

    // Referrer Policy
    referrerPolicy: {
      policy: ["strict-origin-when-cross-origin"]
    },

    // Permissions Policy (Feature Policy)
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
      payment: [],
      usb: [],
      magnetometer: [],
      accelerometer: [],
      gyroscope: [],
      fullscreen: ["self"]
    },

    // Cross-Origin Embedder Policy
    crossOriginEmbedderPolicy: false, // Disabled for external image loading

    // Cross-Origin Opener Policy
    crossOriginOpenerPolicy: {
      policy: "same-origin"
    },

    // Cross-Origin Resource Policy
    crossOriginResourcePolicy: {
      policy: "cross-origin" // Allow external resources for meme generation
    },

    // Expect-CT (deprecated but still useful)
    expectCt: isProduction ? {
      maxAge: 86400,
      enforce: true
    } : false,

    // Hide X-Powered-By header
    hidePoweredBy: true,

    // DNS Prefetch Control
    dnsPrefetchControl: {
      allow: false
    },

    // IE No Open
    ieNoOpen: true,

    // Origin Agent Cluster
    originAgentCluster: true
  };
};

// Mobile-specific CSP (more permissive for debugging)
const getMobileCSP = () => {
  return {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'", // For debugging on mobile
          "https:",
          "data:"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https:",
          "data:"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https:",
          "http:"
        ],
        fontSrc: [
          "'self'",
          "https:",
          "data:"
        ],
        connectSrc: [
          "'self'",
          "https:",
          "http:",
          "ws:",
          "wss:"
        ],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      },
      reportOnly: true
    }
  };
};

// Admin-specific CSP (allows inline scripts for preview functionality)
const getAdminCSP = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        
        // Scripts - Allow inline for admin functionality
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Required for admin preview functionality
          "https://cdnjs.cloudflare.com",
          "https://static.cloudflareinsights.com",
          "https://unpkg.com",
          "'sha256-*'",
        ],
        
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdnjs.cloudflare.com",
          "https://unpkg.com"
        ],
        
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com",
          "data:"
        ],
        
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https:",
          "http:",
          "*.leonardo.ai",
          "*.cloudinary.com",
          "res.cloudinary.com"
        ],
        
        mediaSrc: [
          "'self'",
          "data:",
          "blob:",
          "https:"
        ],
        
        connectSrc: [
          "'self'",
          "https://cloud.leonardo.ai",
          "https://api.leonardo.ai",
          "https://res.cloudinary.com",
          "http://localhost:*",
          "ws://localhost:*"
        ],
        
        objectSrc: ["'none'"],
        embedSrc: ["'none'"],
        frameSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        manifestSrc: ["'self'"],
        workerSrc: ["'self'", "blob:"],
        childSrc: ["'self'", "blob:"]
      },
      reportOnly: false, // Enforce but allow inline scripts
    }
  };
};

// Security headers middleware with device detection and admin route handling
const securityHeaders = (req, res, next) => {
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(req.get('User-Agent') || '');
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isAdminRoute = req.path.startsWith('/admin/');
  
  if (isAdminRoute) {
    // Apply admin-friendly CSP for admin routes
    console.log('🔐 Applying admin security headers for:', req.path);
    helmet(getAdminCSP())(req, res, next);
  } else if (isMobile && isDevelopment) {
    // Apply mobile-friendly CSP for development
    console.log('📱 Applying mobile-friendly security headers');
    helmet(getMobileCSP())(req, res, next);
  } else {
    // Apply full security headers
    helmet(getSecurityHeaders())(req, res, next);
  }
};

// CSP violation reporting endpoint
const cspReportHandler = (req, res) => {
  const report = req.body;
  
  console.warn('🚨 CSP Violation Report:', {
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    violation: report['csp-report'] || report,
    url: req.get('Referer') || 'unknown'
  });

  // Log to security log file
  const fs = require('fs');
  const path = require('path');
  const logDir = path.join(__dirname, '../../logs');
  
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const logEntry = JSON.stringify({
    type: 'CSP_VIOLATION',
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    violation: report['csp-report'] || report,
    referer: req.get('Referer')
  }) + '\n';
  
  fs.appendFileSync(path.join(logDir, 'security.log'), logEntry);
  
  res.status(204).end();
};

// Additional security headers for API endpoints
const apiSecurityHeaders = (req, res, next) => {
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent caching of sensitive API responses
  if (req.path.includes('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  
  // Add security headers for file uploads
  if (req.path.includes('/upload') || req.path.includes('/generate')) {
    res.setHeader('X-Upload-Security', 'validated');
  }
  
  next();
};

// Rate limiting headers
const rateLimitHeaders = (req, res, next) => {
  // Add rate limit information to response headers
  const rateLimitInfo = req.rateLimitInfo;
  
  if (rateLimitInfo) {
    if (rateLimitInfo.type === 'anonymous') {
      res.setHeader('X-RateLimit-Limit', rateLimitInfo.limit);
      res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining);
      res.setHeader('X-RateLimit-Reset', rateLimitInfo.resetTime);
    } else if (rateLimitInfo.type === 'authenticated') {
      res.setHeader('X-Credits-Remaining', rateLimitInfo.credits);
    }
  }
  
  next();
};

module.exports = {
  securityHeaders,
  apiSecurityHeaders,
  rateLimitHeaders,
  cspReportHandler,
  getSecurityHeaders,
  getMobileCSP
};
