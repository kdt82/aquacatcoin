const fs = require('fs');
const path = require('path');

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode, code = null, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTH_REQUIRED');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'INSUFFICIENT_PERMISSIONS');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class RateLimitError extends AppError {
  constructor(message, resetTime = null) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.resetTime = resetTime;
  }
}

class ServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR', false);
  }
}

// Error logging utility
class ErrorLogger {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatError(error, req = null) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code || 'UNKNOWN',
        statusCode: error.statusCode || 500
      }
    };

    if (req) {
      errorInfo.request = {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id || null,
        body: this.sanitizeRequestBody(req.body),
        query: req.query,
        params: req.params
      };
    }

    return errorInfo;
  }

  sanitizeRequestBody(body) {
    if (!body || typeof body !== 'object') return body;
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  log(error, req = null, level = 'error') {
    const errorInfo = this.formatError(error, req);
    const logEntry = JSON.stringify(errorInfo) + '\n';
    
    // Log to console with appropriate level
    if (level === 'error') {
      console.error('❌ Error:', errorInfo);
    } else if (level === 'warn') {
      console.warn('⚠️  Warning:', errorInfo);
    }

    // Log to file
    const logFile = path.join(this.logDir, `${level}.log`);
    fs.appendFileSync(logFile, logEntry);

    // Log security-related errors to separate file
    if (this.isSecurityError(error)) {
      const securityLogFile = path.join(this.logDir, 'security.log');
      fs.appendFileSync(securityLogFile, logEntry);
    }
  }

  isSecurityError(error) {
    const securityCodes = [
      'AUTH_REQUIRED',
      'INSUFFICIENT_PERMISSIONS',
      'CSRF_TOKEN_INVALID',
      'RATE_LIMIT_EXCEEDED',
      'VALIDATION_ERROR'
    ];
    
    return securityCodes.includes(error.code) ||
           error.message.toLowerCase().includes('security') ||
           error.message.toLowerCase().includes('malicious');
  }
}

const errorLogger = new ErrorLogger();

// MongoDB error handler
const handleMongoError = (error) => {
  if (error.name === 'ValidationError') {
    const details = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message
    }));
    return new ValidationError('Validation failed', details);
  }
  
  if (error.name === 'CastError') {
    return new ValidationError(`Invalid ${error.path}: ${error.value}`);
  }
  
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return new ValidationError(`${field} already exists`);
  }
  
  return new ServerError('Database error occurred');
};

// JWT error handler
const handleJWTError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return new AuthenticationError('Invalid authentication token');
  }
  
  if (error.name === 'TokenExpiredError') {
    return new AuthenticationError('Authentication token expired');
  }
  
  return new AuthenticationError('Authentication failed');
};

// Main error handling middleware
const errorHandler = (error, req, res, next) => {
  let processedError = error;

  // Handle specific error types
  if (error.name?.includes('Mongo')) {
    processedError = handleMongoError(error);
  } else if (error.name?.includes('JWT') || error.name?.includes('Token')) {
    processedError = handleJWTError(error);
  } else if (!(error instanceof AppError)) {
    // Convert unknown errors to AppError
    processedError = new ServerError(
      process.env.NODE_ENV === 'production' 
        ? 'Something went wrong' 
        : error.message
    );
  }

  // Log error
  errorLogger.log(processedError, req);

  // Prepare response
  const response = {
    success: false,
    error: processedError.message,
    code: processedError.code,
    timestamp: processedError.timestamp
  };

  // Add additional fields for specific error types
  if (processedError instanceof ValidationError && processedError.details) {
    response.details = processedError.details;
  }

  if (processedError instanceof RateLimitError && processedError.resetTime) {
    response.resetTime = processedError.resetTime;
  }

  // Only include stack trace in development
  if (process.env.NODE_ENV === 'development' && processedError.stack) {
    response.stack = processedError.stack;
  }

  // Send response
  res.status(processedError.statusCode || 500).json(response);
};

// 404 handler
const notFoundHandler = (req, res) => {
  const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
  errorLogger.log(error, req, 'warn');
  
  // Return JSON for API routes, render page for others
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      success: false,
      error: error.message,
      code: error.code
    });
  } else {
    res.status(404).render('404', {
      title: '404 - Page Not Found | $AQUA',
      path: req.path
    });
  }
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Security event logger
const logSecurityEvent = (event, req, details = {}) => {
  const securityEvent = {
    type: 'SECURITY_EVENT',
    event,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || null,
    url: req.url,
    method: req.method,
    details
  };

  console.warn('🚨 Security Event:', securityEvent);
  
  const logFile = path.join(errorLogger.logDir, 'security.log');
  fs.appendFileSync(logFile, JSON.stringify(securityEvent) + '\n');
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ServerError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  logSecurityEvent,
  ErrorLogger
};
