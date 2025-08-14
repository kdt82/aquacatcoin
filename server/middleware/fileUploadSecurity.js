const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');

// File type validation
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

// Maximum file sizes (in bytes)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGE_DIMENSIONS = { width: 4096, height: 4096 };

// Dangerous file signatures to block
const DANGEROUS_SIGNATURES = [
  // Executable files
  Buffer.from([0x4D, 0x5A]), // PE/EXE
  Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF
  Buffer.from([0xCA, 0xFE, 0xBA, 0xBE]), // Mach-O
  
  // Script files embedded in images
  Buffer.from('<?php'), // PHP
  Buffer.from('<script'), // JavaScript
  Buffer.from('<%'), // ASP/JSP
  
  // Archive files that might contain malware
  Buffer.from([0x50, 0x4B, 0x03, 0x04]), // ZIP
  Buffer.from([0x52, 0x61, 0x72, 0x21]), // RAR
];

// Virus-like patterns in file content
const MALICIOUS_PATTERNS = [
  /eval\s*\(/gi,
  /exec\s*\(/gi,
  /system\s*\(/gi,
  /shell_exec\s*\(/gi,
  /<script[^>]*>.*?<\/script>/gis,
  /javascript:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
  /base64.*script/gi
];

class FileUploadSecurity {
  constructor() {
    this.quarantineDir = path.join(__dirname, '../../quarantine');
    this.ensureQuarantineDir();
  }

  ensureQuarantineDir() {
    if (!fs.existsSync(this.quarantineDir)) {
      fs.mkdirSync(this.quarantineDir, { recursive: true });
    }
  }

  // Generate secure filename
  generateSecureFilename(originalName, userId = null) {
    const ext = path.extname(originalName).toLowerCase();
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(16).toString('hex');
    const userPrefix = userId ? `user_${userId}_` : 'anon_';
    
    return `${userPrefix}${timestamp}_${randomBytes}${ext}`;
  }

  // Validate file extension
  validateExtension(filename) {
    const ext = path.extname(filename).toLowerCase();
    return ALLOWED_EXTENSIONS.includes(ext);
  }

  // Validate MIME type
  validateMimeType(mimetype) {
    return ALLOWED_MIME_TYPES.includes(mimetype);
  }

  // Check file signature (magic numbers)
  async validateFileSignature(filepath) {
    try {
      const fd = fs.openSync(filepath, 'r');
      const buffer = Buffer.alloc(512); // Read first 512 bytes
      fs.readSync(fd, buffer, 0, 512, 0);
      fs.closeSync(fd);

      // Check for dangerous signatures
      for (const signature of DANGEROUS_SIGNATURES) {
        if (buffer.indexOf(signature) !== -1) {
          return false;
        }
      }

      // Validate image signatures
      const imageSignatures = [
        { signature: Buffer.from([0xFF, 0xD8, 0xFF]), type: 'jpeg' },
        { signature: Buffer.from([0x89, 0x50, 0x4E, 0x47]), type: 'png' },
        { signature: Buffer.from([0x47, 0x49, 0x46, 0x38]), type: 'gif' },
        { signature: Buffer.from([0x52, 0x49, 0x46, 0x46]), type: 'webp' }
      ];

      const hasValidImageSignature = imageSignatures.some(({ signature }) => 
        buffer.indexOf(signature) === 0
      );

      return hasValidImageSignature;
    } catch (error) {
      console.error('File signature validation error:', error);
      return false;
    }
  }

  // Scan file content for malicious patterns
  async scanFileContent(filepath) {
    try {
      const content = fs.readFileSync(filepath, 'utf8');
      
      for (const pattern of MALICIOUS_PATTERNS) {
        if (pattern.test(content)) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      // If we can't read as text, it's likely a binary image file (good)
      return true;
    }
  }

  // Validate and sanitize image using Sharp
  async validateAndSanitizeImage(inputPath, outputPath) {
    try {
      const metadata = await sharp(inputPath).metadata();
      
      // Check dimensions
      if (metadata.width > MAX_IMAGE_DIMENSIONS.width || 
          metadata.height > MAX_IMAGE_DIMENSIONS.height) {
        throw new Error(`Image dimensions too large: ${metadata.width}x${metadata.height}`);
      }

      // Process and sanitize image (removes EXIF and other metadata)
      await sharp(inputPath)
        .resize(
          Math.min(metadata.width, MAX_IMAGE_DIMENSIONS.width),
          Math.min(metadata.height, MAX_IMAGE_DIMENSIONS.height),
          { 
            fit: 'inside',
            withoutEnlargement: true 
          }
        )
        .jpeg({ quality: 90, progressive: true }) // Convert to JPEG for consistency
        .toFile(outputPath);

      return {
        success: true,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: metadata.size
        }
      };
    } catch (error) {
      console.error('Image validation/sanitization error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Quarantine suspicious file
  quarantineFile(filepath, reason) {
    try {
      const filename = path.basename(filepath);
      const quarantinePath = path.join(this.quarantineDir, `${Date.now()}_${filename}`);
      
      fs.copyFileSync(filepath, quarantinePath);
      fs.unlinkSync(filepath); // Remove original
      
      console.warn('🚨 File quarantined:', {
        original: filepath,
        quarantine: quarantinePath,
        reason: reason,
        timestamp: new Date().toISOString()
      });

      // Log to security file
      const logEntry = JSON.stringify({
        type: 'FILE_QUARANTINED',
        timestamp: new Date().toISOString(),
        original: filepath,
        quarantine: quarantinePath,
        reason: reason
      }) + '\n';

      const logDir = path.join(__dirname, '../../logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      fs.appendFileSync(path.join(logDir, 'security.log'), logEntry);
      
      return quarantinePath;
    } catch (error) {
      console.error('Quarantine error:', error);
      return null;
    }
  }

  // Complete file security validation
  async validateFile(filepath, originalName, mimetype, userId = null) {
    const validationResults = {
      passed: true,
      errors: [],
      warnings: []
    };

    try {
      // 1. Extension validation
      if (!this.validateExtension(originalName)) {
        validationResults.errors.push('Invalid file extension');
        validationResults.passed = false;
      }

      // 2. MIME type validation
      if (!this.validateMimeType(mimetype)) {
        validationResults.errors.push('Invalid MIME type');
        validationResults.passed = false;
      }

      // 3. File size validation
      const stats = fs.statSync(filepath);
      if (stats.size > MAX_FILE_SIZE) {
        validationResults.errors.push(`File too large: ${stats.size} bytes`);
        validationResults.passed = false;
      }

      // 4. File signature validation
      const hasValidSignature = await this.validateFileSignature(filepath);
      if (!hasValidSignature) {
        validationResults.errors.push('Invalid or dangerous file signature');
        validationResults.passed = false;
      }

      // 5. Content scanning
      const contentSafe = await this.scanFileContent(filepath);
      if (!contentSafe) {
        validationResults.errors.push('Malicious content detected');
        validationResults.passed = false;
      }

      // 6. Image validation and sanitization
      if (validationResults.passed) {
        const secureFilename = this.generateSecureFilename(originalName, userId);
        const securePath = path.join(path.dirname(filepath), secureFilename);
        
        const imageResult = await this.validateAndSanitizeImage(filepath, securePath);
        
        if (imageResult.success) {
          // Remove original and use sanitized version
          if (filepath !== securePath) {
            fs.unlinkSync(filepath);
          }
          
          validationResults.sanitizedPath = securePath;
          validationResults.metadata = imageResult.metadata;
        } else {
          validationResults.errors.push(`Image processing failed: ${imageResult.error}`);
          validationResults.passed = false;
        }
      }

      // Quarantine file if validation failed
      if (!validationResults.passed) {
        this.quarantineFile(filepath, validationResults.errors.join(', '));
      }

    } catch (error) {
      console.error('File validation error:', error);
      validationResults.errors.push('Validation process failed');
      validationResults.passed = false;
      
      // Quarantine on error
      this.quarantineFile(filepath, 'Validation process error');
    }

    return validationResults;
  }
}

// Create singleton instance
const fileUploadSecurity = new FileUploadSecurity();

// Multer configuration with security
const createSecureUpload = (destination = 'uploads/temp') => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../../', destination);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Generate secure filename
      const secureFilename = fileUploadSecurity.generateSecureFilename(
        file.originalname, 
        req.user?.id
      );
      cb(null, secureFilename);
    }
  });

  const fileFilter = (req, file, cb) => {
    // Basic pre-upload validation
    if (!fileUploadSecurity.validateExtension(file.originalname)) {
      return cb(new Error('Invalid file extension'), false);
    }
    
    if (!fileUploadSecurity.validateMimeType(file.mimetype)) {
      return cb(new Error('Invalid file type'), false);
    }
    
    cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 1 // Only allow 1 file per request
    }
  });
};

// Middleware for post-upload validation
const validateUploadedFile = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    const validation = await fileUploadSecurity.validateFile(
      req.file.path,
      req.file.originalname,
      req.file.mimetype,
      req.user?.id
    );

    if (!validation.passed) {
      return res.status(400).json({
        success: false,
        error: 'File validation failed',
        details: validation.errors,
        code: 'FILE_VALIDATION_FAILED'
      });
    }

    // Update file info with sanitized version
    if (validation.sanitizedPath) {
      req.file.path = validation.sanitizedPath;
      req.file.filename = path.basename(validation.sanitizedPath);
    }

    req.fileValidation = validation;
    next();
  } catch (error) {
    console.error('Upload validation middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'File validation process failed'
    });
  }
};

module.exports = {
  FileUploadSecurity,
  fileUploadSecurity,
  createSecureUpload,
  validateUploadedFile,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE
};
