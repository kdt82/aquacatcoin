document.addEventListener('DOMContentLoaded', () => {
    // Sparkle Effect
    const hero = document.querySelector('.hero');
    if (hero) {
        for (let i = 0; i < 30; i++) {
            let sparkle = document.createElement('div');
            sparkle.className = 'sparkle';
            sparkle.style.left = `${Math.random() * 100}%`;
            sparkle.style.top = `${Math.random() * 100}%`;
            sparkle.style.animationDuration = `${Math.random() * 2 + 3}s`;
            sparkle.style.animationDelay = `${Math.random() * 3}s`;
            hero.appendChild(sparkle);
        }
    }

    // Scroll Animation
    const scrollElements = document.querySelectorAll('.scroll-animate');
    const roadmapTimeline = document.querySelector('.roadmap-timeline');

    const elementInView = (el, dividend = 1) => {
        if (!el) return false;
        const elementTop = el.getBoundingClientRect().top;
        return (
            elementTop <= (window.innerHeight || document.documentElement.clientHeight) / dividend
        );
    };

    const displayScrollElement = (element) => {
        element.classList.add('in-view');
    };

    const handleScrollAnimation = () => {
        scrollElements.forEach((el) => {
            if (elementInView(el, 1.25)) {
                displayScrollElement(el);
            }
        });

        if (elementInView(roadmapTimeline, 1.25)) {
            roadmapTimeline.classList.add('in-view');
        }
    };

    window.addEventListener('scroll', () => {
        handleScrollAnimation();
    });

    // New Contract Address Copy Logic
    const copyBtn = document.querySelector('.copy-button');
    const addressValue = document.querySelector('.contract-address-value');

    if (copyBtn && addressValue) {
        copyBtn.addEventListener('click', () => {
            const address = addressValue.textContent;
            if (address && address !== 'SOON') {
                navigator.clipboard.writeText(address).then(() => {
                    if (!copyBtn.classList.contains('copied')) {
                        copyBtn.classList.add('copied');
                        const originalIcon = copyBtn.innerHTML;
                        
                        setTimeout(() => {
                            copyBtn.classList.remove('copied');
                            copyBtn.innerHTML = originalIcon;
                        }, 2000);
                    }
                }).catch(err => {
                    console.error('Failed to copy address: ', err);
                });
            }
        });
    }

    // Countdown Timer Functionality
    initializeCountdownTimer();
});

// Countdown Timer Implementation
function initializeCountdownTimer() {
    // Get configuration from server (set in EJS template)
    const config = window.launchConfig || {};
    const visibilityDate = new Date(config.countdownVisibleDate || '2025-08-14T12:00:00-07:00');
    const launchDate = new Date(config.launchDate || '2025-08-21T12:00:00-07:00');
    
    const countdownContainer = document.getElementById('countdownContainer');
    const daysElement = document.getElementById('days');
    const hoursElement = document.getElementById('hours');
    const minutesElement = document.getElementById('minutes');
    
    // Check for test mode (URL parameter)
    const urlParams = new URLSearchParams(window.location.search);
    const testMode = urlParams.get('countdown-test') === 'true';
    
    function updateCountdown() {
        const now = new Date();
        
        // Check if we should show the countdown
        // Use server-provided visibility status or fall back to date check
        if (!testMode && !config.shouldShowCountdown && now < visibilityDate) {
            countdownContainer.style.display = 'none';
            return;
        }
        
        // Show the countdown container
        countdownContainer.style.display = 'block';
        
        // Calculate time remaining until launch
        const timeRemaining = launchDate - now;
        
        if (timeRemaining <= 0) {
            // Launch time reached - trigger auto-launch
            handleLaunchComplete();
            return;
        }
        
        // Calculate days, hours, minutes
        const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        
        // Update display with animation
        updateTimeDisplay(daysElement, days);
        updateTimeDisplay(hoursElement, hours);
        updateTimeDisplay(minutesElement, minutes);
        
        // Add pulsing effect when time is low
        if (days === 0 && hours < 1) {
            countdownContainer.classList.add('final-countdown');
        }
    }
    
    function updateTimeDisplay(element, value) {
        if (element && element.textContent !== value.toString()) {
            element.style.transform = 'scale(1.2)';
            element.style.color = '#87CEEB';
            
            setTimeout(() => {
                element.textContent = value;
                element.style.transform = 'scale(1)';
                element.style.color = '#e6cd87'; // Golden color to match CSS
            }, 150);
        }
    }
    
    function handleLaunchComplete() {
        // Hide countdown and show launch message
        const countdownCard = document.querySelector('.countdown-card');
        if (countdownCard) {
            countdownCard.innerHTML = `
                <h2 class="countdown-title">🎉 LAUNCH WINDOW IS OPEN!</h2>
                <p class="countdown-subtitle">The soggiest launch in crypto history is here! 💧</p>
                <p class="countdown-launch-info">We're now live!<br>— Start creating and sharing your $AQUA memes!</p>
                <div style="margin-top: 20px;">
                    <a href="/meme-generator" class="btn btn-primary" style="margin: 0 10px;">Start Creating Memes</a>
                    <a href="/gallery" class="btn btn-secondary" style="margin: 0 10px;">View Gallery</a>
                </div>
            `;
        }
        
        // Auto-redirect to live site (this would need backend route changes)
        console.log('🚀 Launch time reached! Time to go live!');
        
        // Optional: Automatically redirect to the live meme generator after a few seconds
        setTimeout(() => {
            // This could redirect to the live routes instead of coming-soon
            // window.location.href = '/meme-generator';
        }, 5000);
    }
    
    // Initial update
    updateCountdown();
    
    // Update every minute
    setInterval(updateCountdown, 60000);
    
    // Add test mode indicator
    if (testMode) {
        console.log('🧪 Countdown Timer Test Mode Active');
        console.log('Visibility Date:', visibilityDate);
        console.log('Launch Date:', launchDate);
        
        // Add test mode indicator to the page
        const testIndicator = document.createElement('div');
        testIndicator.innerHTML = '🧪 TEST MODE - Countdown visible for testing';
        testIndicator.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #ff6b6b;
            color: white;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 12px;
            z-index: 10000;
            font-weight: bold;
        `;
        document.body.appendChild(testIndicator);
    }
}

// The old copy logic can be removed or kept for other purposes.
// For this task, I'm assuming it's no longer needed for the hero section.
/*
// Copy contract address function
function copyContract() {
  const contractAddress = "0x123...abc (Coming Soon)";
  
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(contractAddress).then(() => {
      showCopySuccess();
    }).catch(err => {
      console.error('Failed to copy: ', err);
      fallbackCopyTextToClipboard(contractAddress);
    });
  } else {
    fallbackCopyTextToClipboard(contractAddress);
  }
}

function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  textArea.style.top = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    document.execCommand('copy');
    showCopySuccess();
  } catch (err) {
    console.error('Fallback: Oops, unable to copy', err);
  }
  
  document.body.removeChild(textArea);
}

function showCopySuccess() {
  const copyBtn = document.getElementById('copyBtn');
  const originalHTML = copyBtn.innerHTML;
  
  copyBtn.innerHTML = '<i class="fas fa-check"></i>';
  copyBtn.classList.add('copied');
  
  setTimeout(() => {
    copyBtn.innerHTML = originalHTML;
    copyBtn.classList.remove('copied');
  }, 2000);
} 
*/ 