const launchConfig = require('../config/launch');

// Middleware to check for auto-launch
function checkAutoLaunch(req, res, next) {
  try {
    // Check if we should auto-launch
    if (launchConfig.shouldAutoLaunch()) {
      console.log('🚀 Auto-launch triggered!');
      launchConfig.autoLaunch();
    }
    
    // Add launch status to request object for use in routes
    req.launchConfig = launchConfig.getConfig();
    req.isLive = req.launchConfig.isLive;
    req.shouldShowCountdown = launchConfig.shouldShowCountdown();
    
    next();
  } catch (error) {
    console.error('Error in launch middleware:', error);
    // Don't block the request, just continue
    req.launchConfig = launchConfig.getConfig();
    req.isLive = false;
    req.shouldShowCountdown = false;
    next();
  }
}

// Admin middleware to manually control launch
function adminLaunchControl(req, res, next) {
  // Simple admin check - in production you'd want proper authentication
  const adminKey = req.headers['x-admin-key'] || req.query.adminKey;
  const expectedKey = process.env.ADMIN_LAUNCH_KEY || 'aqua-admin-2025';
  
  if (adminKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
}

module.exports = {
  checkAutoLaunch,
  adminLaunchControl
};
