/**
 * Authentication Module for AquaCat Meme Generator
 * Handles X (Twitter) OAuth, credit system, and user state management
 */

class AuthManager {
  constructor() {
    this.user = null;
    this.isAuthenticated = false;
    this.rateLimitInfo = null;
    this.init();
  }

  async init() {
    await this.checkAuthStatus();
    this.setupEventListeners();
    this.updateUI();
  }

  // Check current authentication status
  async checkAuthStatus() {
    try {
      const response = await fetch('/auth/me', {
        method: 'GET',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success && data.authenticated) {
        this.user = data.user;
        this.isAuthenticated = true;
      } else {
        this.user = null;
        this.isAuthenticated = false;
      }
      
      // Get rate limit info for anonymous users
      if (!this.isAuthenticated) {
        await this.getRateLimitInfo();
      }
      
    } catch (error) {
      console.error('Auth status check failed:', error);
      this.user = null;
      this.isAuthenticated = false;
    }
  }

  // Get rate limit information for anonymous users
  async getRateLimitInfo() {
    try {
      const response = await fetch('/api/limits/info', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        this.rateLimitInfo = await response.json();
      }
    } catch (error) {
      console.error('Failed to get rate limit info:', error);
    }
  }

  // Initiate X (Twitter) login
  async login() {
    try {
      // Pass current URL as return URL
      const currentUrl = window.location.href;
      const response = await fetch(`/auth/x/login?returnUrl=${encodeURIComponent(currentUrl)}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success && data.authUrl) {
        // Redirect to X OAuth
        window.location.href = data.authUrl;
      } else {
        throw new Error('Failed to initiate login');
      }
    } catch (error) {
      console.error('Login failed:', error);
      this.showNotification('Login failed. Please try again.', 'error');
    }
  }

  // Logout user
  async logout() {
    try {
      const response = await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.user = null;
        this.isAuthenticated = false;
        this.updateUI();
        this.showNotification('Logged out successfully!', 'success');
        
        // Refresh rate limit info for anonymous user
        await this.getRateLimitInfo();
      }
    } catch (error) {
      console.error('Logout failed:', error);
      this.showNotification('Logout failed. Please try again.', 'error');
    }
  }

  // Claim daily bonus
  async claimDailyBonus() {
    if (!this.isAuthenticated) return;

    try {
      const response = await fetch('/auth/daily-bonus', {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.user.credits = data.credits;
        this.updateUI();
        this.showNotification(`Daily bonus claimed! +${data.bonusAmount} credits`, 'success');
      } else {
        this.showNotification(data.error || 'Failed to claim daily bonus', 'error');
      }
    } catch (error) {
      console.error('Daily bonus claim failed:', error);
      this.showNotification('Failed to claim daily bonus', 'error');
    }
  }

  // Check if user can perform an action (generation/remix)
  canPerformAction(actionType = 'generation') {
    if (this.isAuthenticated) {
      const cost = actionType === 'remix' ? 5 : 5; // Both cost 5 credits
      return this.user.credits >= cost;
    } else {
      // Anonymous user - check rate limits
      return this.rateLimitInfo && this.rateLimitInfo.remaining > 0;
    }
  }

  // Get remaining generations for anonymous users
  getRemainingGenerations() {
    if (this.isAuthenticated) {
      return Math.floor(this.user.credits / 5); // Each generation costs 5 credits
    } else {
      return this.rateLimitInfo ? this.rateLimitInfo.remaining : 0;
    }
  }

  // Update UI elements based on authentication state
  updateUI() {
    this.updateHeader();
    this.updateGeneratorUI();
    this.updateGalleryUI();
    this.handleUrlParams();
  }

  // Update header authentication elements
  updateHeader() {
    const authContainer = document.getElementById('auth-container');
    if (!authContainer) return;

    if (this.isAuthenticated) {
      authContainer.innerHTML = `
        <div class="user-info">
          <div class="credits-display">
            <i class="fas fa-coins"></i>
            <span class="credits-count">${this.user.credits}</span>
            <span class="credits-label">credits</span>
          </div>
          <div class="user-menu">
            <div class="user-avatar" data-action="toggle-menu">
              ${this.user.profileImage 
                ? `<img src="${this.user.profileImage}" alt="${this.user.displayName}">`
                : `<i class="fas fa-user"></i>`
              }
              <span class="username">${this.user.displayName}</span>
              <i class="fas fa-chevron-down"></i>
            </div>
            <div class="user-dropdown" id="user-dropdown">
              <div class="dropdown-item" data-action="show-profile">
                <i class="fas fa-user"></i> Profile
              </div>
              ${this.user.canClaimDailyBonus ? 
                `<div class="dropdown-item daily-bonus" data-action="claim-daily">
                  <i class="fas fa-gift"></i> Claim Daily Bonus (+30)
                </div>` : ''
              }
              <div class="dropdown-item" data-action="show-history">
                <i class="fas fa-history"></i> Credit History
              </div>
              <div class="dropdown-divider"></div>
              <div class="dropdown-item logout" data-action="logout">
                <i class="fas fa-sign-out-alt"></i> Logout
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      const remainingGens = this.getRemainingGenerations();
      authContainer.innerHTML = `
        <div class="anonymous-info">
          <div class="anonymous-limits">
            <i class="fas fa-clock"></i>
            <span class="limit-count">${remainingGens}/3</span>
            <span class="limit-label">free generations today</span>
          </div>
          <button class="btn btn-twitter" data-action="login">
            <i class="fab fa-x-twitter"></i>
            Sign in with X
          </button>
        </div>
      `;
    }


  }

  // Update meme generator UI based on authentication
  updateGeneratorUI() {
    const generateBtn = document.getElementById('generate-btn');
    if (!generateBtn) return;

    if (this.canPerformAction('generation')) {
      generateBtn.disabled = false;
      generateBtn.innerHTML = this.isAuthenticated 
        ? '<i class="fas fa-magic"></i> Generate (5 credits)'
        : '<i class="fas fa-magic"></i> Generate (Free)';
    } else {
      generateBtn.disabled = true;
      generateBtn.innerHTML = this.isAuthenticated
        ? '<i class="fas fa-coins"></i> Insufficient Credits'
        : '<i class="fas fa-clock"></i> Daily Limit Reached';
    }
  }

  // Update gallery UI for remix buttons
  updateGalleryUI() {
    const remixButtons = document.querySelectorAll('.remix-btn');
    remixButtons.forEach(btn => {
      if (this.isAuthenticated) {
        if (this.user.credits >= 5) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-edit"></i> Remix (5 credits)';
        } else {
          btn.disabled = true;
          btn.innerHTML = '<i class="fas fa-coins"></i> Insufficient Credits';
        }
      } else {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign in to Remix';
      }
    });
  }

  // Handle URL parameters (welcome, login success, etc.)
  handleUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('welcome') === 'true') {
      const credits = urlParams.get('credits');
      this.showNotification(`Welcome to AquaCat! You've received ${credits} credits!`, 'success');
      this.clearUrlParams();
    }
    
    if (urlParams.get('login_success') === 'true') {
      const credits = urlParams.get('credits');
      this.showNotification(`Welcome back! You have ${credits} credits.`, 'success');
      this.clearUrlParams();
    }
    
    if (urlParams.get('auth_error')) {
      const error = urlParams.get('auth_error');
      this.showNotification(`Authentication failed: ${error}`, 'error');
      this.clearUrlParams();
    }
  }

  // Clear URL parameters
  clearUrlParams() {
    const url = new URL(window.location);
    url.search = '';
    window.history.replaceState({}, '', url);
  }

  // Toggle user menu dropdown
  toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) {
      dropdown.classList.toggle('show');
    }
  }

  // Show user profile modal
  showProfile() {
    // TODO: Implement profile modal
    console.log('Profile modal not implemented yet');
  }

  // Show credit history modal
  async showCreditHistory() {
    if (!this.isAuthenticated) return;

    try {
      const response = await fetch('/auth/credit-history', {
        method: 'GET',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.displayCreditHistory(data.history);
      }
    } catch (error) {
      console.error('Failed to get credit history:', error);
    }
  }

  // Display credit history in a modal
  displayCreditHistory(history) {
    // TODO: Create proper modal
    console.log('Credit History:', history);
    alert('Credit history logged to console (modal not implemented yet)');
  }

  // Show notification
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
      <button class="notification-close" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    // Add to page
    const container = document.getElementById('notification-container') || document.body;
    container.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  // Setup event listeners
  setupEventListeners() {
    // Handle auth-related clicks with event delegation
    document.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.getAttribute('data-action');
      
      if (action) {
        switch (action) {
          case 'login':
            this.login();
            break;
          case 'logout':
            this.logout();
            break;
          case 'toggle-menu':
            this.toggleUserMenu();
            break;
          case 'show-profile':
            this.showProfile();
            break;
          case 'claim-daily':
            this.claimDailyBonus();
            break;
          case 'show-history':
            this.showCreditHistory();
            break;
        }
        return;
      }

      // Close dropdowns when clicking outside
      if (!e.target.closest('.user-menu')) {
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) {
          dropdown.classList.remove('show');
        }
      }
    });

    // Refresh auth status periodically
    setInterval(() => {
      this.checkAuthStatus().then(() => this.updateUI());
    }, 5 * 60 * 1000); // Every 5 minutes
  }
}

// Initialize auth manager when DOM is loaded
let authManager;
document.addEventListener('DOMContentLoaded', () => {
  authManager = new AuthManager();
});

// Make authManager available globally
window.authManager = authManager;
