const fs = require('fs');
const path = require('path');

// Configuration file path
const configPath = path.join(__dirname, '../../launch-config.json');

// Default configuration
const defaultConfig = {
  isLive: false,
  launchDate: '2025-08-25T12:00:00-07:00', // August 25, 2025 12:00 PM PDT
  countdownVisibleDate: '2025-08-18T12:00:00-07:00', // August 18, 2025 12:00 PM PDT
  moonbagsRedirectUrl: 'https://moonbags.io',
  lastUpdated: new Date().toISOString()
};

// Load configuration
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return { ...defaultConfig, ...config };
    }
  } catch (error) {
    console.error('Error loading launch config:', error);
  }
  return defaultConfig;
}

// Save configuration
function saveConfig(config) {
  try {
    const updatedConfig = {
      ...config,
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving launch config:', error);
    return false;
  }
}

// Check if we should auto-launch
function shouldAutoLaunch() {
  const config = loadConfig();
  const now = new Date();
  const launchDate = new Date(config.launchDate);
  
  return !config.isLive && now >= launchDate;
}

// Check if countdown should be visible
function shouldShowCountdown() {
  const config = loadConfig();
  const now = new Date();
  const visibilityDate = new Date(config.countdownVisibleDate);
  
  return now >= visibilityDate;
}

// Auto-launch the site
function autoLaunch() {
  const config = loadConfig();
  config.isLive = true;
  const success = saveConfig(config);
  
  if (success) {
    console.log('🚀 AUTO-LAUNCH: Site is now LIVE!');
  }
  
  return success;
}

// Get current configuration
function getConfig() {
  return loadConfig();
}

// Update configuration
function updateConfig(updates) {
  const config = loadConfig();
  const newConfig = { ...config, ...updates };
  return saveConfig(newConfig);
}

module.exports = {
  loadConfig,
  saveConfig,
  shouldAutoLaunch,
  shouldShowCountdown,
  autoLaunch,
  getConfig,
  updateConfig
};
