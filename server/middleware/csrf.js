const crypto = require('crypto');

// Modern CSRF protection implementation
class CSRFProtection {
  constructor(options = {}) {
    this.secret = options.secret || process.env.CSRF_SECRET || 'aqua-csrf-secret-key';
    this.tokenLength = options.tokenLength || 32;
    this.cookieName = options.cookieName || '_csrf';
    this.headerName = options.headerName || 'x-csrf-token';
    this.bodyName = options.bodyName || '_csrf';
    this.cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000, // 1 hour
      ...options.cookieOptions
    };
  }

  // Generate a secure random token
  generateToken() {
    return crypto.randomBytes(this.tokenLength).toString('hex');
  }

  // Create HMAC signature for token validation
  createSignature(token, secret) {
    return crypto.createHmac('sha256', secret).update(token).digest('hex');
  }

  // Verify token signature
  verifyToken(token, signature) {
    const expectedSignature = this.createSignature(token, this.secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  // Middleware to generate and set CSRF token
  generateMiddleware() {
    return (req, res, next) => {
      // Skip CSRF for GET, HEAD, OPTIONS requests (safe methods)
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }

      // Generate new token if not exists or invalid
      let token = req.cookies[this.cookieName];
      
      if (!token) {
        token = this.generateToken();
        const signature = this.createSignature(token, this.secret);
        const signedToken = `${token}.${signature}`;
        
        res.cookie(this.cookieName, signedToken, this.cookieOptions);
        req.csrfToken = () => token;
      } else {
        // Extract token from signed cookie
        const [cookieToken, signature] = token.split('.');
        if (cookieToken && signature && this.verifyToken(cookieToken, signature)) {
          req.csrfToken = () => cookieToken;
        } else {
          // Invalid token, generate new one
          const newToken = this.generateToken();
          const newSignature = this.createSignature(newToken, this.secret);
          const signedToken = `${newToken}.${newSignature}`;
          
          res.cookie(this.cookieName, signedToken, this.cookieOptions);
          req.csrfToken = () => newToken;
        }
      }

      // Make token available in templates
      res.locals.csrfToken = req.csrfToken();
      next();
    };
  }

  // Middleware to verify CSRF token
  verifyMiddleware() {
    return (req, res, next) => {
      // Skip CSRF for GET, HEAD, OPTIONS requests
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }

      // Skip CSRF for API endpoints with proper authentication
      if (req.path.startsWith('/api/') && req.user && req.headers.authorization) {
        return next();
      }

      // Get token from cookie
      const cookieToken = req.cookies[this.cookieName];
      if (!cookieToken) {
        return res.status(403).json({
          success: false,
          error: 'CSRF token missing',
          code: 'CSRF_TOKEN_MISSING'
        });
      }

      // Extract and verify cookie token
      const [token, signature] = cookieToken.split('.');
      if (!token || !signature || !this.verifyToken(token, signature)) {
        return res.status(403).json({
          success: false,
          error: 'Invalid CSRF token in cookie',
          code: 'CSRF_TOKEN_INVALID'
        });
      }

      // Get submitted token from header or body
      const submittedToken = req.headers[this.headerName] || 
                            req.body[this.bodyName] ||
                            req.query[this.bodyName];

      if (!submittedToken) {
        return res.status(403).json({
          success: false,
          error: 'CSRF token required',
          code: 'CSRF_TOKEN_REQUIRED'
        });
      }

      // Verify submitted token matches cookie token
      if (!crypto.timingSafeEqual(Buffer.from(token), Buffer.from(submittedToken))) {
        return res.status(403).json({
          success: false,
          error: 'CSRF token mismatch',
          code: 'CSRF_TOKEN_MISMATCH'
        });
      }

      next();
    };
  }

  // Middleware for API endpoints that need CSRF protection
  apiMiddleware() {
    return (req, res, next) => {
      // Only apply CSRF to state-changing operations
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        return this.verifyMiddleware()(req, res, next);
      }
      next();
    };
  }
}

// Create default CSRF protection instance
const csrf = new CSRFProtection();

// Express middleware functions
const csrfGenerate = csrf.generateMiddleware();
const csrfVerify = csrf.verifyMiddleware();
const csrfAPI = csrf.apiMiddleware();

// Helper function to get CSRF token for AJAX requests
const getCSRFToken = (req, res) => {
  res.json({
    success: true,
    csrfToken: req.csrfToken ? req.csrfToken() : null
  });
};

module.exports = {
  CSRFProtection,
  csrfGenerate,
  csrfVerify,
  csrfAPI,
  getCSRFToken
};
