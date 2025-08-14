// Advanced Meme Generator with Full Editing Package
class AdvancedMemeGenerator {
    // Helper method to safely get DOM elements
    safeGetElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`⚠️ Element with id "${id}" not found`);
        }
        return element;
    }
    constructor() {
        console.log('🚀 MemeGenerator constructor starting...');
        // Check if canvas element exists before creating Fabric canvas
        const canvasElement = document.getElementById('memeCanvas');
        if (!canvasElement) {
            console.error('❌ Canvas element with id "memeCanvas" not found!');
            throw new Error('Canvas element not found. Please ensure the DOM is loaded.');
        }
        console.log('✅ Canvas element found, proceeding with initialization...');
        
        this.canvas = new fabric.Canvas('memeCanvas', {
            backgroundColor: '#ffffff',
            preserveObjectStacking: true
        });
        
        this.history = [];
        this.setupResponsiveCanvas();
        this.historyIndex = -1;
        this.maxHistory = 20;
        this.isLoadingFromHistory = false; // Flag to prevent infinite loops during undo/redo
        this.currentMode = null; // 'text', 'shape', null
        this.activeObject = null;
        this.availableModels = null; // Will be loaded from API
        this.selectedModel = 'aqua_lora'; // Default model
        this.selectedUserImage = null;
        this.userImages = this.loadUserImages();
        console.log(`🔍 INIT DEBUG: Loaded ${this.userImages.length} images from storage`);
        this.clipboard = null; // For copy/paste functionality
        this.pasteCount = 0; // Track multiple pastes for better positioning
        
        this.initializeEventListeners();
        this.loadAIModels();
        this.refreshUserImagesDisplay();
        console.log(`🔍 INIT DEBUG: After refreshUserImagesDisplay, userImages length: ${this.userImages.length}`);
        this.updateStorageInfo();
        this.initializeStepStates();
        this.initializeAdvancedFeatures();
        this.loadCreditInfo();
        
        // Save initial canvas state after everything is initialized
        setTimeout(() => {
            this.saveCanvasState();
            this.updateCopyPasteButtons(); // Initialize button states
        }, 100);
    }

    setupResponsiveCanvas() {
        // Set initial canvas size
        this.resizeCanvas();
        
        // Add resize event listener
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
        
        // Add orientation change event for mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.resizeCanvas();
            }, 100);
        });
    }

    resizeCanvas() {
        const container = document.querySelector('.canvas-container');
        if (!container) {
            console.warn('⚠️ Canvas container not found, using default size');
            this.canvas.setDimensions({ width: 600, height: 600 });
            return;
        }
        
        const containerWidth = Math.max(container.clientWidth - 4, 300); // Account for border, min 300px
        const isMobile = window.innerWidth <= 768;
        const isTablet = window.innerWidth <= 1024;
        
        let canvasSize;
        if (isMobile) {
            // On mobile, use most of container width
            canvasSize = Math.max(Math.min(containerWidth, window.innerWidth * 0.9), 300);
        } else if (isTablet) {
            // On tablet, use more space but keep reasonable
            canvasSize = Math.max(Math.min(containerWidth, 500), 400);
        } else {
            // On desktop, use much more available space
            const maxDesktopSize = Math.min(containerWidth * 0.95, 800); // Use 95% of container or max 800px
            canvasSize = Math.max(maxDesktopSize, 500);
        }
        
        console.log('📐 Resizing canvas to:', canvasSize, 'x', canvasSize);
        
        // Update canvas dimensions
        this.canvas.setDimensions({
            width: canvasSize,
            height: canvasSize
        });
        
        // Update the HTML canvas element size
        const canvasElement = this.canvas.getElement();
        if (canvasElement) {
            canvasElement.style.width = canvasSize + 'px';
            canvasElement.style.height = canvasSize + 'px';
            
            // Force browser reflow
            canvasElement.offsetHeight; // Trigger reflow
        }
        
        // Update container size if needed
        if (container) {
            container.style.width = canvasSize + 'px';
            container.style.height = canvasSize + 'px';
        }
        
        // Re-render canvas
        this.canvas.renderAll();
        
        console.log('📏 Canvas resized to:', canvasSize, 'x', canvasSize);
        
        // Update mobile touch handling
        this.setupMobileTouchHandling();
    }

    setupMobileTouchHandling() {
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // Enable touch scrolling on mobile
            this.canvas.allowTouchScrolling = true;
            
            // Improve touch interaction
            const canvasElement = this.canvas.getElement();
            canvasElement.style.touchAction = 'manipulation';
            
            // Add mobile-specific canvas settings
            this.canvas.selection = true;
            this.canvas.hoverCursor = 'move';
            this.canvas.moveCursor = 'move';
            
            // Make objects easier to select on mobile
            this.canvas.targetFindTolerance = 15; // Increase touch target size
        }
    }
    
    initializeEventListeners() {
        // Step toggles
        window.toggleStep = this.toggleStep.bind(this);
        
        // Primary choice selection
        const aiChoice = this.safeGetElement('aiChoice');
        if (aiChoice) {
            aiChoice.addEventListener('click', () => {
                this.selectChoice('ai');
            });
        }
        
        // Upload functionality removed - AI generation only
        
        // AI Generation - with better error handling
        this.setupGenerateButton();
        
        // Canvas tools
        const undoBtn = this.safeGetElement('undoBtn');
        if (undoBtn) undoBtn.addEventListener('click', this.undo.bind(this));
        
        const redoBtn = this.safeGetElement('redoBtn');
        if (redoBtn) redoBtn.addEventListener('click', this.redo.bind(this));
        
        const clearBtn = this.safeGetElement('clearBtn');
        if (clearBtn) clearBtn.addEventListener('click', this.clearCanvas.bind(this));
        
        const changeImageBtn = this.safeGetElement('changeImageBtn');
        if (changeImageBtn) changeImageBtn.addEventListener('click', this.changeImage.bind(this));
        
        const exportBtn = this.safeGetElement('exportBtn');
        if (exportBtn) exportBtn.addEventListener('click', this.exportMeme.bind(this));
        
        // Element tools
        const addTextBtn = this.safeGetElement('addTextBtn');
        if (addTextBtn) {
            addTextBtn.addEventListener('click', () => {
                this.setMode('text');
            });
        }
        
        const addShapeBtn = this.safeGetElement('addShapeBtn');
        if (addShapeBtn) {
            addShapeBtn.addEventListener('click', () => {
                this.setMode('shape');
                const shapeTools = this.safeGetElement('shapeTools');
                if (shapeTools) shapeTools.style.display = 'grid';
            });
        }
        
        // Shape tools
        document.querySelectorAll('.shape-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const shape = e.currentTarget.dataset.shape;
                this.addShape(shape);
            });
        });
        
        // Text controls
        const textInput = this.safeGetElement('textInput');
        if (textInput) textInput.addEventListener('input', this.updateText.bind(this));
        
        const fontFamily = this.safeGetElement('fontFamily');
        if (fontFamily) fontFamily.addEventListener('change', this.updateTextStyle.bind(this));
        
        const fontSize = this.safeGetElement('fontSize');
        if (fontSize) fontSize.addEventListener('input', this.updateFontSize.bind(this));
        
        const textColor = this.safeGetElement('textColor');
        if (textColor) textColor.addEventListener('change', this.updateTextStyle.bind(this));
        
        const strokeColor = this.safeGetElement('strokeColor');
        if (strokeColor) strokeColor.addEventListener('change', this.updateTextStyle.bind(this));
        
        const strokeWidth = this.safeGetElement('strokeWidth');
        if (strokeWidth) strokeWidth.addEventListener('input', this.updateStrokeWidth.bind(this));
        
        // Element properties
        const opacity = this.safeGetElement('opacity');
        if (opacity) opacity.addEventListener('input', this.updateOpacity.bind(this));
        
        const fillColor = this.safeGetElement('fillColor');
        if (fillColor) fillColor.addEventListener('change', this.updateFillColor.bind(this));
        
        const borderColor = this.safeGetElement('borderColor');
        if (borderColor) borderColor.addEventListener('change', this.updateBorderColor.bind(this));
        
        const borderWidth = this.safeGetElement('borderWidth');
        if (borderWidth) borderWidth.addEventListener('input', this.updateBorderWidth.bind(this));
        
        // Layer controls
        const bringForwardBtn = this.safeGetElement('bringForwardBtn');
        if (bringForwardBtn) bringForwardBtn.addEventListener('click', this.bringForward.bind(this));
        
        const sendBackwardBtn = this.safeGetElement('sendBackwardBtn');
        if (sendBackwardBtn) sendBackwardBtn.addEventListener('click', this.sendBackward.bind(this));
        
        const deleteBtn = this.safeGetElement('deleteBtn');
        if (deleteBtn) deleteBtn.addEventListener('click', this.deleteSelected.bind(this));
        
        // Copy/Paste controls
        const copyBtn = this.safeGetElement('copyBtn');
        if (copyBtn) copyBtn.addEventListener('click', this.copySelected.bind(this));
        
        const pasteBtn = this.safeGetElement('pasteBtn');
        if (pasteBtn) pasteBtn.addEventListener('click', this.pasteElement.bind(this));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
        
        // Share to social button
        document.getElementById('shareToSocialBtn').addEventListener('click', this.saveAndShare.bind(this));
        
        // Clear storage button
        document.getElementById('clearStorageBtn').addEventListener('click', this.clearAllImages.bind(this));
        
        // Canvas events
        this.canvas.on('object:modified', () => this.saveCanvasState());
        this.canvas.on('object:added', () => this.saveCanvasState());
        this.canvas.on('object:removed', () => this.saveCanvasState());
        this.canvas.on('selection:created', (e) => {
            if (e && (e.target || e.selected)) {
                this.onObjectSelected(e);
            }
        });
        this.canvas.on('selection:updated', (e) => {
            if (e && (e.target || e.selected)) {
                this.onObjectSelected(e);
            }
        });
        this.canvas.on('selection:cleared', () => this.onSelectionCleared());
    }
    
    toggleStep(stepId) {
        try {
            if (!stepId) {
                console.warn('⚠️ No stepId provided to toggleStep');
                return;
            }
            
            const step = document.getElementById(stepId);
            if (!step) {
                console.warn(`⚠️ Step element with id "${stepId}" not found`);
                return;
            }
            
            const isActive = step.classList.contains('active');
            
            if (isActive) {
                // Collapse this step
                step.classList.remove('active');
                step.classList.add('collapsed');
            } else {
                // Expand this step
                step.classList.add('active');
                step.classList.remove('collapsed');
                step.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } catch (error) {
            console.error('❌ Error toggling step:', error);
        }
    }
    
    selectChoice(choice) {
        try {
            // Only AI choice available - always show AI form
            const aiChoice = this.safeGetElement('aiChoice');
            if (aiChoice) aiChoice.classList.add('selected');
            
            const aiForm = this.safeGetElement('aiForm');
            if (aiForm) aiForm.classList.add('active');
        } catch (error) {
            console.error('❌ Error selecting choice:', error);
        }
    }
    
    async loadAIModels() {
        try {
            const response = await fetch('/api/ai/models');
            const result = await response.json();
            
            if (result.success) {
                this.availableModels = result.models;
                this.selectedModel = result.defaultModel || 'aqua_lora';
                this.updateModelDisplay();
            }
        } catch (error) {
            console.error('Failed to load available models:', error);
            // Show fallback models
            this.availableModels = {
                aqua_lora: {
                    name: "$AQUA Trained Model",
                    description: "Perfect for creating $AQUA memes and crypto-themed content. Specialized in generating the iconic soggy blue cat with crypto elements and meme formats.",
                    example: "A disgruntled wet blue cat in a rain-soaked alley, holding a stack of $AQUA coins while suspicious alley cats in trench coats exchange them in the background, puddles reflecting neon signs",
                    exampleImage: "/images/aqua-example.jpg",
                    type: "lora",
                    trained: true
                },
                flux_dev: {
                    name: "Flux Dev",
                    description: "Ideal for photorealistic and highly detailed images. Best choice for professional-quality artwork, portraits, and complex scenes requiring exceptional detail and realism.",
                    example: "A disgruntled wet blue cat sitting in a laundromat, watching their hoodie spin in the dryer.",
                    exampleImage: "/images/flux-example.jpg",
                    type: "base",
                    trained: false
                },
                dreamshaper: {
                    name: "Dreamshaper",
                    description: "Great for artistic and creative content with vibrant colors and imaginative styles. Perfect for fantasy art, creative portraits, and stylized illustrations.",
                    example: "A sprawling neon city under perpetual rainfall, holographic billboards in alien languages, a lone figure in a reflective chrome trench coat standing on a rooftop, holding an umbrella with fractal patterns. The scene is lit by a mix of magenta and cyan, with flying cars streaking through the sky.",
                    exampleImage: "/images/dreamshaper-example.jpg",
                    type: "finetuned",
                    trained: false
                }
            };
            this.selectedModel = 'aqua_lora';
            this.updateModelDisplay();
        }
    }
    
    updateModelDisplay() {
        // Update the model info display to show available models with selection
        const modelInfo = document.querySelector('.model-info');
        if (modelInfo && this.availableModels) {
            const currentModel = this.availableModels[this.selectedModel];
            
            modelInfo.innerHTML = `
                <div class="model-selection">
                    <label class="form-label">Choose AI Model:</label>
                    <div class="model-grid">
                        ${Object.entries(this.availableModels).map(([key, model]) => `
                            <div class="model-card ${key === this.selectedModel ? 'selected' : ''}" data-model="${key}">
                                <div class="model-header">
                                    <h4>${model.name}</h4>
                                </div>
                                <p class="model-description">${model.description}</p>
                                <div class="model-example-image">
                                    <img src="${model.exampleImage || '/images/placeholder.jpg'}" alt="${model.name} example" loading="lazy" />
                                    <div class="example-prompt">
                                        <strong>Prompt Used:</strong><br>
                                        ${model.example}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            
            // Add click handlers for model selection
            modelInfo.querySelectorAll('.model-card').forEach(card => {
                card.addEventListener('click', () => {
                    const modelKey = card.dataset.model;
                    this.selectModel(modelKey);
                });
            });
        }
    }
    
    selectModel(modelKey) {
        if (this.availableModels && this.availableModels[modelKey]) {
            this.selectedModel = modelKey;
            console.log(`🎯 Selected model: ${this.availableModels[modelKey].name}`);
            this.updateModelSelection();
        }
    }

    updateModelSelection() {
        // Update visual selection state without regenerating HTML
        const modelCards = document.querySelectorAll('.model-card');
        modelCards.forEach(card => {
            const modelKey = card.dataset.model;
            if (modelKey === this.selectedModel) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
    }

    setupGenerateButton() {
        const setupButton = () => {
            const generateBtn = document.getElementById('generateBtn');
            if (generateBtn) {
                // Add new listener
                generateBtn.addEventListener('click', this.generateAIImage.bind(this));
                generateBtn.setAttribute('data-listener-attached', 'true');
                console.log('✅ Generate button event listener attached');
                return true;
            } else {
                console.warn('⚠️ Generate button not found, retrying...');
                return false;
            }
        };

        // Try immediately
        if (!setupButton()) {
            // If not found, retry after a short delay
            setTimeout(() => {
                if (!setupButton()) {
                    console.error('❌ Generate button not found after retry! ID: generateBtn');
                }
            }, 500);
        }
    }

    async generateAIImage() {
        console.log('🚀 Generate AI Image button clicked!');
        
        const promptInput = document.getElementById('aiPrompt');
        if (!promptInput) {
            console.error('❌ Prompt input not found!');
            return;
        }
        
        const prompt = promptInput.value;
        console.log('📝 Prompt:', prompt);
        
        if (!prompt.trim()) {
            console.log('⚠️ Empty prompt, showing alert...');
            await this.showCustomAlert('Please enter a description for your image.', 'warning', 'Missing Description');
            return;
        }
        
        const generationStatus = this.safeGetElement('generationStatus');
        if (generationStatus) generationStatus.style.display = 'block';
        
        const generateBtn = this.safeGetElement('generateBtn');
        if (generateBtn) generateBtn.disabled = true;
        
        try {
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: prompt,
                    modelId: this.selectedModel
                })
            });
            
            const result = await response.json();
            
            if (response.status === 429) {
                // Rate limit exceeded
                const resetTime = new Date(result.resetTime).toLocaleTimeString();
                await this.showCustomAlert(`Generation limit reached! You can generate 4 images per hour. Try again after ${resetTime}.`, 'warning', 'Rate Limit Reached');
                document.getElementById('generationStatus').style.display = 'none';
                return;
            }
            
            if (result.success) {
                // Show success message with model used
                const statusDiv = document.getElementById('generationStatus');
                const demoText = result.demoMode ? ' (Demo Mode)' : '';
                statusDiv.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Generated with ${result.model.name}${demoText}! Processing...`;
                
                // Start polling for generation completion
                this.pollGenerationStatus(result.generationId, statusDiv);
                
                // Update generation counter if provided
                if (result.rateLimit) {
                    this.updateRateLimitDisplay(result.rateLimit);
                }
            } else {
                await this.showCustomAlert('AI generation failed: ' + (result.error || 'Unknown error'), 'error', 'Generation Failed');
                document.getElementById('generationStatus').style.display = 'none';
            }
        } catch (error) {
            console.error('AI generation error:', error);
            await this.showCustomAlert('Failed to generate image. Please try again.', 'error', 'Generation Failed');
            const generationStatus = this.safeGetElement('generationStatus');
            if (generationStatus) generationStatus.style.display = 'none';
        } finally {
            const generateBtn = this.safeGetElement('generateBtn');
            if (generateBtn) generateBtn.disabled = false;
        }
    }
    
    async pollGenerationStatus(generationId, statusDiv) {
        let attempts = 0;
        const maxAttempts = 30; // 5 minutes maximum
        
        // Validate inputs
        if (!generationId) {
            console.error('❌ No generation ID provided to pollGenerationStatus');
            return;
        }
        if (!statusDiv) {
            console.error('❌ No status div provided to pollGenerationStatus');
            return;
        }
        
        const checkStatus = async () => {
            try {
                const response = await fetch(`/api/ai/status/${generationId}`);
                const result = await response.json();
                
                if (result.success && result.generation) {
                    const generation = result.generation;
                    
                    if (generation.status === 'COMPLETE' && generation.generated_images && generation.generated_images.length > 0) {
                        // Generation completed successfully
                        const imageUrl = generation.generated_images[0].url;
                        console.log('AI generation completed! Image URL:', imageUrl);
                        if (statusDiv) {
                            statusDiv.innerHTML = `<i class="fas fa-check" style="color: #10B981;"></i> Image generated successfully!`;
                        }
                        
                        // Add the generated image to user images
                        await this.addUserImage(imageUrl, 'generated');
                        
                        // Show step 2 (Your Images) so user can see the generated image
                        console.log('Generated image added to Your Images gallery');
                        this.expandStep('step2');
                        
                        // Refresh the user images display to show the new image
                        this.refreshUserImagesDisplay();
                        
                        // Hide status after a moment
                        setTimeout(() => {
                            if (statusDiv) {
                                statusDiv.style.display = 'none';
                            }
                        }, 2000);
                        
                        return; // Stop polling
                    } else if (generation.status === 'FAILED') {
                        if (statusDiv) {
                            statusDiv.innerHTML = `<i class="fas fa-times" style="color: #EF4444;"></i> Generation failed. Please try again.`;
                        }
                        setTimeout(() => {
                            if (statusDiv) {
                                statusDiv.style.display = 'none';
                            }
                        }, 3000);
                        return; // Stop polling
                    }
                    // If status is PENDING, continue polling
                }
                
                attempts++;
                if (attempts >= maxAttempts) {
                    if (statusDiv) {
                        statusDiv.innerHTML = `<i class="fas fa-clock" style="color: #F59E0B;"></i> Generation is taking longer than expected. Check back later.`;
                    }
                    setTimeout(() => {
                        if (statusDiv) {
                            statusDiv.style.display = 'none';
                        }
                    }, 5000);
                    return; // Stop polling
                }
                
                // Continue polling every 15 seconds (reduced frequency to avoid rate limits)
                setTimeout(checkStatus, 15000);
                
            } catch (error) {
                console.error('Error checking generation status:', error);
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(checkStatus, 15000);
                } else {
                    if (statusDiv) {
                        statusDiv.innerHTML = `<i class="fas fa-times" style="color: #EF4444;"></i> Unable to check generation status.`;
                    }
                    setTimeout(() => {
                        if (statusDiv) {
                            statusDiv.style.display = 'none';
                        }
                    }, 3000);
                }
            }
        };
        
        // Start polling after a short delay
        setTimeout(checkStatus, 5000);
    }
    
    updateRateLimitDisplay(rateLimit) {
        // Create or update rate limit indicator
        let indicator = document.getElementById('rateLimitIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'rateLimitIndicator';
            indicator.style.cssText = `
                position: fixed;
                top: 120px;
                right: 20px;
                background: rgba(1, 24, 41, 0.95);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(77, 162, 255, 0.3);
                border-radius: 10px;
                padding: 10px 15px;
                font-size: 0.9rem;
                color: var(--text-light);
                z-index: 1000;
            `;
            document.body.appendChild(indicator);
        }
        
        const resetTime = new Date(rateLimit.resetTime).toLocaleTimeString();
        indicator.innerHTML = `
            <div style="color: var(--main-blue); font-weight: 600; margin-bottom: 3px;">
                <i class="fas fa-clock"></i> Generation Limit
            </div>
            <div>Used: ${rateLimit.used}/3 Free Generations Today</div>
            <div>Resets: ${resetTime}</div>
        `;
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 10000);
    }

    // Load and display user credit information
    async loadCreditInfo() {
        try {
            const response = await fetch('/api/limits/info');
            const result = await response.json();
            
            if (result.success) {
                this.updateCreditDisplay(result);
            }
        } catch (error) {
            console.error('Failed to load credit info:', error);
        }
    }

    updateCreditDisplay(limitInfo) {
        // Remove existing display
        const existingDisplay = document.getElementById('creditDisplayContainer');
        if (existingDisplay) {
            existingDisplay.remove();
        }

        // Create credit display container
        const container = document.createElement('div');
        container.id = 'creditDisplayContainer';
        
        if (limitInfo.type === 'authenticated') {
            // Show credit balance and claim button for authenticated users
            container.innerHTML = `
                <div class="credit-display">
                    <div class="credit-balance">
                        <i class="fas fa-coins"></i>
                        <span>Credits: ${limitInfo.credits}</span>
                    </div>
                    <button class="claim-credits-btn" id="claimCreditsBtn">
                        <i class="fas fa-gift"></i>
                        Claim Daily Credits
                    </button>
                </div>
                <div class="claim-cooldown" id="claimCooldown" style="display: none;">
                    Next claim available in: <span id="cooldownTimer"></span>
                </div>
            `;
        } else {
            // Show generation count for anonymous users
            container.innerHTML = `
                <div class="credit-display">
                    <div class="credit-balance">
                        <i class="fas fa-clock"></i>
                        <span>${limitInfo.used}/3 Free Generations Today</span>
                    </div>
                </div>
            `;
        }

        // Insert after the AI form
        const aiForm = document.getElementById('aiForm');
        if (aiForm) {
            aiForm.parentNode.insertBefore(container, aiForm.nextSibling);
        }

        // Set up claim button if it exists
        const claimBtn = document.getElementById('claimCreditsBtn');
        if (claimBtn) {
            claimBtn.addEventListener('click', this.claimDailyCredits.bind(this));
            this.checkClaimAvailability();
        }
    }

    async claimDailyCredits() {
        try {
            const claimBtn = document.getElementById('claimCreditsBtn');
            const originalText = claimBtn.innerHTML;
            
            claimBtn.disabled = true;
            claimBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Claiming...';

            const response = await fetch('/api/limits/claim-daily', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                await this.showCustomAlert(
                    `🎉 ${result.message} You earned ${result.creditsEarned} credits! New balance: ${result.newBalance}`,
                    'success',
                    'Credits Claimed!'
                );
                
                // Update the display
                this.loadCreditInfo();
            } else {
                await this.showCustomAlert(result.error, 'warning', 'Already Claimed');
                this.checkClaimAvailability();
            }

        } catch (error) {
            console.error('Failed to claim daily credits:', error);
            await this.showCustomAlert('Failed to claim daily credits. Please try again.', 'error', 'Claim Failed');
        }
    }

    async checkClaimAvailability() {
        try {
            const response = await fetch('/api/limits/claim-daily', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            const claimBtn = document.getElementById('claimCreditsBtn');
            const cooldownDiv = document.getElementById('claimCooldown');
            
            if (!claimBtn) return;

            if (!result.success && result.nextClaimTime) {
                // Already claimed, show cooldown
                claimBtn.disabled = true;
                claimBtn.innerHTML = '<i class="fas fa-clock"></i> Claimed Today';
                
                if (cooldownDiv) {
                    cooldownDiv.style.display = 'block';
                    this.startCooldownTimer(new Date(result.nextClaimTime));
                }
            } else {
                claimBtn.disabled = false;
                claimBtn.innerHTML = '<i class="fas fa-gift"></i> Claim Daily Credits';
                if (cooldownDiv) {
                    cooldownDiv.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Failed to check claim availability:', error);
        }
    }

    startCooldownTimer(nextClaimTime) {
        const timerElement = document.getElementById('cooldownTimer');
        if (!timerElement) return;

        const updateTimer = () => {
            const now = new Date();
            const timeLeft = nextClaimTime - now;

            if (timeLeft <= 0) {
                this.checkClaimAvailability();
                return;
            }

            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

            timerElement.textContent = `${hours}h ${minutes}m ${seconds}s`;
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        // Clear interval after 24 hours
        setTimeout(() => clearInterval(interval), 24 * 60 * 60 * 1000);
    }
    
    // Upload methods removed - AI generation only
    
    // processImageFile removed - AI generation only
    
    cleanupCanvas() {
        try {
            // Clear all objects from canvas
            this.canvas.clear();
            
            // Reset canvas properties
            this.canvas.backgroundColor = '#ffffff';
            
            // Clear any active selections
            this.canvas.discardActiveObject();
            
            // Force garbage collection of canvas elements
            this.canvas.renderAll();
            
            console.log('Canvas cleaned up successfully');
        } catch (error) {
            console.error('Error during canvas cleanup:', error);
        }
    }

    handleEmptyCanvas() {
        try {
            console.log('Handling empty canvas state...');
            
            // Reset canvas to clean state
            this.canvas.backgroundColor = '#ffffff';
            this.canvas.discardActiveObject();
            
            // Clear any potential corruption
            this.canvas.clear();
            
            // Force a clean render
            this.canvas.renderAll();
            
            // Reset canvas dimensions to ensure proper state
            this.canvas.setDimensions({
                width: 600,
                height: 600
            });
            
            console.log('Empty canvas handled successfully');
            
        } catch (error) {
            console.error('Error handling empty canvas:', error);
            // If handling fails, force a complete reset
            this.fixCanvasCorruption();
        }
    }
    
    loadImageToCanvas(imageUrl) {
        console.log('🚀 Loading image to canvas...', imageUrl);
        
        // Ensure canvas is initialized
        if (!this.canvas) {
            console.error('❌ Canvas not initialized. Cannot load image.');
            return;
        }
        
        console.log('✅ Canvas is initialized:', this.canvas);
        
        // Ensure canvas has proper initial dimensions
        if (this.canvas.width <= 0 || this.canvas.height <= 0) {
            console.warn('⚠️ Canvas has invalid initial dimensions, fixing...');
            this.canvas.setDimensions({ width: 600, height: 600 });
            this.canvas.requestRenderAll();
            console.log('✅ Canvas dimensions initialized to 600x600');
        }
        
        // Validate image URL
        if (!imageUrl || typeof imageUrl !== 'string') {
            console.error('❌ Invalid image URL provided:', imageUrl);
            return;
        }
        
        // Clean up canvas before loading new image
        console.log('🧹 Cleaning up canvas...');
        this.cleanupCanvas();
        
        // Set canvas background
        this.canvas.backgroundColor = '#ffffff';
        
        // Test canvas is working by adding a temporary test shape
        console.log('🧪 Testing canvas with temporary shape...');
        const testRect = new fabric.Rect({
            left: 10,
            top: 10,
            width: 50,
            height: 50,
            fill: 'red'
        });
        this.canvas.add(testRect);
        this.canvas.requestRenderAll();
        console.log('🧪 Test shape added - canvas should show red rectangle');
        
        // Convert data URL to blob to avoid CORS issues
        const convertDataUrlToBlob = (dataUrl) => {
            const arr = dataUrl.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            return new Blob([u8arr], { type: mime });
        };
        
        try {
            // Create blob URL to avoid cross-origin issues
            let processedImageUrl = imageUrl;
            if (imageUrl.startsWith('data:')) {
                const blob = convertDataUrlToBlob(imageUrl);
                processedImageUrl = URL.createObjectURL(blob);
            } else if (imageUrl.startsWith('http') && !imageUrl.includes(window.location.hostname)) {
                // For external HTTP URLs (like AI services), proxy through our server to avoid CORS
                processedImageUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
                console.log('Using proxied URL for external image:', processedImageUrl);
            }
            
            // Create image element
            const testImg = new Image();
            testImg.crossOrigin = 'anonymous';
            
            testImg.onload = () => {
                try {
                    console.log('✅ Image loaded successfully:', testImg.width, 'x', testImg.height);
                    
                    // Create Fabric image from the loaded HTML image element
                    const fabricImg = new fabric.Image(testImg);
                    
                    if (!fabricImg) {
                        console.error('Failed to create fabric image object');
                        return;
                    }
                    
                    console.log('✅ Fabric image created');
                    
                    // Ensure canvas has proper dimensions
                    let canvasWidth = this.canvas.width || 600;
                    let canvasHeight = this.canvas.height || 600;
                    
                    // Fix negative or invalid canvas dimensions
                    if (canvasWidth <= 0 || canvasHeight <= 0) {
                        console.warn('⚠️ Canvas has invalid dimensions, setting defaults...');
                        canvasWidth = 600;
                        canvasHeight = 600;
                        this.canvas.setDimensions({ width: canvasWidth, height: canvasHeight });
                        console.log('✅ Canvas dimensions fixed to:', canvasWidth, 'x', canvasHeight);
                    } else {
                        console.log('Canvas dimensions:', canvasWidth, 'x', canvasHeight);
                    }
                    
                    // Calculate scale to fit within canvas
                    const scaleX = canvasWidth / fabricImg.width;
                    const scaleY = canvasHeight / fabricImg.height;
                    const scale = Math.min(scaleX, scaleY, 1); // Don't upscale
                    
                    fabricImg.scale(scale);
                    
                    // Clear canvas and add the image
                    this.canvas.clear();
                    
                    // Set image properties
                    fabricImg.set({ 
                        selectable: true,
                        hasControls: true,
                        hasBorders: true,
                        left: 0,
                        top: 0
                    });
                    
                    // Remove test rectangle if it exists
                    const testObjects = this.canvas.getObjects().filter(obj => obj.fill === 'red');
                    testObjects.forEach(obj => this.canvas.remove(obj));
                    
                    // Add image to canvas
                    console.log('🎨 Adding image to canvas...');
                    this.canvas.add(fabricImg);
                    
                    // Center the image
                    console.log('🎯 Centering image...');
                    this.canvas.centerObject(fabricImg);
                    
                    // Set the image as active object
                    console.log('👆 Setting as active object...');
                    this.canvas.setActiveObject(fabricImg);
                    
                    // Force canvas to render
                    console.log('🖼️ Forcing canvas render...');
                    this.canvas.requestRenderAll();
                    
                    // Final verification
                    console.log('✅ Image should now be visible on canvas');
                    console.log('📊 Canvas objects count:', this.canvas.getObjects().length);
                    
                    // Fix canvas size after image load
                    console.log('🔧 Fixing canvas size after image load...');
                    setTimeout(() => {
                        this.resizeCanvas();
                        this.canvas.requestRenderAll();
                        console.log('✅ Canvas size fixed and re-rendered');
                    }, 100);
                    
                    // Ensure canvas visibility and fix layering issues
                    const canvasElement = document.getElementById('memeCanvas');
                    if (canvasElement) {
                        canvasElement.style.display = 'block';
                        canvasElement.style.visibility = 'visible';
                        canvasElement.style.opacity = '1';
                        canvasElement.style.position = 'relative';
                        
                        // Fix Fabric.js canvas layering issue
                        const upperCanvas = canvasElement.parentElement.querySelector('.upper-canvas');
                        const lowerCanvas = canvasElement.parentElement.querySelector('.lower-canvas');
                        
                        if (upperCanvas && lowerCanvas) {
                            console.log('Fixing canvas layering...');
                            
                            // Ensure lower canvas (where image renders) is visible
                            lowerCanvas.style.display = 'block';
                            lowerCanvas.style.visibility = 'visible';
                            lowerCanvas.style.opacity = '1';
                            lowerCanvas.style.zIndex = '1';
                            
                            // Ensure upper canvas (interactions) doesn't block the view
                            upperCanvas.style.backgroundColor = 'transparent';
                            upperCanvas.style.opacity = '1';
                            upperCanvas.style.pointerEvents = 'auto';
                            upperCanvas.style.zIndex = '2';
                            
                            console.log('Canvas layering fixed - lower canvas should now be visible');
                        }
                        
                        // Also ensure the parent container is visible
                        const canvasContainer = canvasElement.parentElement;
                        if (canvasContainer) {
                            canvasContainer.style.display = 'block';
                            canvasContainer.style.visibility = 'visible';
                            canvasContainer.style.opacity = '1';
                        }
                        
                        // Scroll canvas into view
                        canvasElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    
                    // Render canvas
                    this.canvas.renderAll();
                    console.log('Canvas rendered with', this.canvas.getObjects().length, 'objects');
                    
                    // Single clean render after a short delay
                    setTimeout(() => {
                        this.canvas.renderAll();
                        console.log('Canvas rendered successfully');
                    }, 100);
                    
                    console.log('Image loaded to canvas successfully');
                    
                    // Clean up blob URL if created
                    if (processedImageUrl !== imageUrl) {
                        setTimeout(() => {
                            URL.revokeObjectURL(processedImageUrl);
                        }, 1000);
                    }
                    
                    // Save initial state with image loaded
                    setTimeout(() => {
                        this.saveCanvasState();
                    }, 200);
                    
                } catch (fabricError) {
                    console.error('Error creating Fabric image:', fabricError);
                }
            };
            
            testImg.onerror = async (error) => {
                console.error('Failed to load image:', error);
                console.error('Image URL that failed:', imageUrl);
                console.error('Processed URL that failed:', processedImageUrl);
                
                // Clean up blob URL if created
                if (processedImageUrl !== imageUrl) {
                    URL.revokeObjectURL(processedImageUrl);
                }
                
                // Try fallback method: fetch and convert to base64
                if (imageUrl.startsWith('http') && processedImageUrl.includes('/api/proxy-image')) {
                    console.log('🔄 Trying fallback method: direct fetch to base64...');
                    try {
                        const response = await fetch(processedImageUrl);
                        if (response.ok) {
                            const blob = await response.blob();
                            const reader = new FileReader();
                            reader.onload = () => {
                                console.log('✅ Fallback successful, retrying with base64...');
                                this.loadImageToCanvas(reader.result);
                            };
                            reader.readAsDataURL(blob);
                            return; // Don't show error if fallback is attempted
                        }
                    } catch (fallbackError) {
                        console.error('Fallback method also failed:', fallbackError);
                    }
                }
                
                // Show user-friendly error
                alert('Failed to load generated image. This might be due to CORS restrictions or network issues.');
            };
            
            testImg.src = processedImageUrl;
            
        } catch (error) {
            console.error('Error processing image:', error);
        }
    }
    
    loadRecentImage(imageUrl) {
        this.loadImageToCanvas(imageUrl);
        this.expandStep('step3');
    }
    
    // Session-based user image management with size limits
    loadUserImages() {
        try {
            const stored = localStorage.getItem('userImages');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.warn('Failed to load user images from storage:', error);
            // Clear corrupted data
            localStorage.removeItem('userImages');
            return [];
        }
    }
    
    // Check storage size and clean up if needed
    checkStorageSize() {
        try {
            // Estimate current storage usage
            let totalSize = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length;
                }
            }
            
            // If approaching 5MB limit (browsers typically allow 5-10MB)
            const maxSize = 4 * 1024 * 1024; // 4MB limit to be safe
            if (totalSize > maxSize) {
                console.log('Storage approaching limit, cleaning up...');
                this.cleanupOldImages();
            }
            
            return totalSize;
        } catch (error) {
            console.warn('Failed to check storage size:', error);
            return 0;
        }
    }
    
    // Clean up old images to free space
    cleanupOldImages() {
        try {
            // Sort by timestamp and keep only the 5 most recent
            this.userImages.sort((a, b) => b.timestamp - a.timestamp);
            this.userImages = this.userImages.slice(0, 5);
            this.saveUserImages();
            console.log('Cleaned up old images, kept 5 most recent');
        } catch (error) {
            console.warn('Failed to cleanup images:', error);
            // If cleanup fails, clear all images
            this.userImages = [];
            localStorage.removeItem('userImages');
        }
    }
    
    // Compress image data to reduce storage size
    compressImageData(imageData, maxWidth = 800, quality = 0.7) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate new dimensions
                let { width, height } = img;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                const compressedData = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedData);
            };
            img.src = imageData;
        });
    }
    
    saveUserImages() {
        try {
            const dataString = JSON.stringify(this.userImages);
            
            // Check if the data is too large
            if (dataString.length > 3 * 1024 * 1024) { // 3MB limit for user images
                console.warn('User images data too large, cleaning up...');
                this.cleanupOldImages();
                return;
            }
            
            localStorage.setItem('userImages', dataString);
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.warn('Storage quota exceeded, cleaning up...');
                this.cleanupOldImages();
                
                // Try saving again with cleaned data
                try {
                    localStorage.setItem('userImages', JSON.stringify(this.userImages));
                } catch (secondError) {
                    console.error('Failed to save even after cleanup, clearing all images');
                    this.userImages = [];
                    localStorage.removeItem('userImages');
                    this.showCustomAlert(
                        'Storage is full. All saved images have been cleared to make space. Please upload smaller images or use fewer images.',
                        'warning',
                        'Storage Full'
                    );
                }
            } else {
                console.error('Failed to save user images:', error);
            }
        }
    }
    
    async addUserImage(imageData, type = 'upload') {
        try {
            // Compress the image to save space
            let compressedData = imageData;
            if (type === 'upload') {
                console.log('Compressing uploaded image...');
                compressedData = await this.compressImageData(imageData, 800, 0.8);
                console.log('Image compressed successfully');
            }
            
            const imageObject = {
                id: Date.now() + Math.random(),
                data: compressedData,
                type: type, // 'upload' or 'generated'
                timestamp: Date.now()
            };
            
            // Check storage before adding
            this.checkStorageSize();
            
            this.userImages.unshift(imageObject);
            
            // Limit to 8 images (reduced from 10 to save space)
            if (this.userImages.length > 8) {
                this.userImages = this.userImages.slice(0, 8);
            }
            
            this.saveUserImages();
            this.refreshUserImagesDisplay();
            this.updateStorageInfo();
            
            // Show success message for uploads
            if (type === 'upload') {
                this.showCustomAlert('Image uploaded and optimized successfully!', 'success', 'Upload Complete');
            }
            
        } catch (error) {
            console.error('Failed to add user image:', error);
            this.showCustomAlert(
                'Failed to save image. The image might be too large. Please try a smaller image.',
                'error',
                'Upload Failed'
            );
        }
    }
    
    removeUserImage(imageId) {
        this.userImages = this.userImages.filter(img => img.id !== imageId);
        this.saveUserImages();
        this.refreshUserImagesDisplay();
        this.updateStorageInfo();
    }
    
    async clearAllImages() {
        const confirmed = await this.showCustomConfirm(
            'Are you sure you want to clear all your stored images? This action cannot be undone.',
            'Clear All Images'
        );
        
        if (confirmed) {
            // Clear user images from storage
            this.userImages = [];
            
            // Clear from localStorage
            localStorage.removeItem('userImages');
            localStorage.removeItem('memeGenerator_userImages');
            
            // Refresh the display
            this.refreshUserImagesDisplay();
            this.updateStorageInfo();
            
            await this.showCustomAlert('All images have been cleared successfully.', 'success', 'Images Cleared');
        }
    }
    
    updateStorageInfo() {
        console.log('🚀 updateStorageInfo() called - starting storage analysis...');
        try {
            // Check both localStorage keys that might be used
            const storageData1 = localStorage.getItem('userImages');
            const storageData2 = localStorage.getItem('memeGenerator_userImages');
            
            // Use whichever key has data (prefer the main one)
            const storageData = storageData1 || storageData2;
            
            // Calculate actual localStorage usage (each character = 2 bytes in UTF-16)
            const sizeInBytes = storageData ? storageData.length * 2 : 0;
            const sizeInKB = Math.round(sizeInBytes / 1024);
            const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(1);
            
            // Detailed analysis for debugging
            let analysisInfo = '';
            if (storageData) {
                try {
                    const parsedData = JSON.parse(storageData);
                    const imageCount = Array.isArray(parsedData) ? parsedData.length : 0;
                    const avgSizePerImage = imageCount > 0 ? Math.round(sizeInBytes / imageCount) : 0;
                    const avgSizePerImageKB = Math.round(avgSizePerImage / 1024);
                    
                    // Analyze first few images to understand data structure
                    if (imageCount > 0 && parsedData[0]) {
                        const firstImage = parsedData[0];
                        const imageDataLength = firstImage.dataUrl ? firstImage.dataUrl.length : 0;
                        const imageDataSizeKB = Math.round((imageDataLength * 2) / 1024);
                        
                        // Check what properties each image has
                        const sampleImageKeys = Object.keys(firstImage);
                        
                        // Count images with actual data URLs vs without
                        let imagesWithData = 0;
                        let imagesWithoutData = 0;
                        parsedData.slice(0, Math.min(10, imageCount)).forEach(img => {
                            if (img.dataUrl && img.dataUrl.length > 0) {
                                imagesWithData++;
                            } else {
                                imagesWithoutData++;
                            }
                        });
                        
                        analysisInfo = `
📊 DETAILED STORAGE ANALYSIS:
- Total images in localStorage: ${imageCount}
- Total images displayed in UI: ${this.userImages.length}
- Total storage: ${sizeInKB} KB (${sizeInMB} MB)
- Average per image: ${avgSizePerImageKB} KB
- First image properties: ${sampleImageKeys.join(', ')}
- First image data URL length: ${imageDataLength} chars (${imageDataSizeKB} KB)
- Sample of first 10 images: ${imagesWithData} with data, ${imagesWithoutData} without data
- Base64 overhead: ~33% larger than original file
- Expected original size per image: ~${Math.round(avgSizePerImageKB / 1.33)} KB

🔍 DISCREPANCY DETECTED: 
- localStorage shows ${imageCount} images
- UI displays ${this.userImages.length} images
- This suggests images are loaded from different sources or cached differently`;
                    }
                } catch (parseError) {
                    analysisInfo = `\n📊 Storage data exists but couldn't parse JSON: ${parseError.message}`;
                }
            }
            
            // Debug logging to verify accurate calculation
            console.log(`📊 Storage Info - Key1 (userImages): ${storageData1 ? storageData1.length : 0} chars`);
            console.log(`📊 Storage Info - Key2 (memeGenerator_userImages): ${storageData2 ? storageData2.length : 0} chars`);
            console.log(`📊 Storage Info - Using: ${storageData ? storageData.length : 0} chars, Actual bytes: ${sizeInBytes}, Images in array: ${this.userImages.length}`);
            console.log(analysisInfo);
            
            // Additional debugging: Check where this.userImages comes from
            console.log(`🔍 DEBUG - this.userImages source analysis:`);
            console.log(`- this.userImages.length: ${this.userImages.length}`);
            if (this.userImages.length > 0) {
                console.log(`- First userImage properties: ${Object.keys(this.userImages[0]).join(', ')}`);
                console.log(`- First userImage has dataUrl: ${!!this.userImages[0].dataUrl}`);
                console.log(`- First userImage dataUrl length: ${this.userImages[0].dataUrl ? this.userImages[0].dataUrl.length : 0}`);
            }
            
            // Check all localStorage keys that might contain images
            console.log(`🔍 All localStorage keys containing 'image':`);
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.toLowerCase().includes('image')) {
                    const value = localStorage.getItem(key);
                    console.log(`- ${key}: ${value ? value.length : 0} chars`);
                }
            }
            
            const storageElement = document.getElementById('storageUsage');
            if (storageElement) {
                if (sizeInKB > 1024) {
                    storageElement.textContent = `Storage: ${sizeInMB} MB`;
                } else {
                    storageElement.textContent = `Storage: ${sizeInKB} K`;
                }
                
                // Color code based on usage
                if (sizeInBytes > 3 * 1024 * 1024) { // > 3MB
                    storageElement.style.color = '#ff4444';
                } else if (sizeInBytes > 1.5 * 1024 * 1024) { // > 1.5MB
                    storageElement.style.color = '#ffaa00';
                } else {
                    storageElement.style.color = '#888';
                }
            }
        } catch (error) {
            console.warn('Failed to update storage info:', error);
        }
    }
    
    refreshUserImagesDisplay() {
        const grid = document.getElementById('userImagesGrid');
        if (!grid) return;
        
        if (this.userImages.length === 0) {
            grid.innerHTML = `
                <div class="empty-gallery">
                    <i class="fas fa-images" style="font-size: 3rem; color: rgba(77, 162, 255, 0.3);"></i>
                    <p style="color: rgba(255,255,255,0.6); margin-top: 10px;">No images yet. Generate some images first!</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = '';
        this.userImages.forEach(image => {
            const item = document.createElement('div');
            item.className = 'recent-item';
            item.dataset.imageId = image.id;
            
            // Create image element
            const img = document.createElement('img');
            img.src = image.url || image.data;
            img.alt = 'Generated image';
            img.loading = 'lazy';
            
            // Create delete button (using trash icon)
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'remove-image';
            deleteBtn.title = 'Delete image';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            
            // Add event listeners
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeUserImage(image.id);
            });
            
            item.addEventListener('click', () => {
                this.selectUserImage(image.id);
            });
            
            // Append elements
            item.appendChild(img);
            item.appendChild(deleteBtn);
            grid.appendChild(item);
        });
        
        // Update proceed button text and functionality
        const proceedBtn = document.getElementById('proceedToEdit');
        if (proceedBtn) {
            const hasImages = this.userImages.length > 0;
            proceedBtn.disabled = !hasImages;
            if (hasImages) {
                proceedBtn.innerHTML = '<i class="fas fa-eye"></i> Preview Images';
                proceedBtn.onclick = () => {
                    if (this.userImages.length === 1) {
                        // If only one image, show it directly
                        this.showImagePreview(this.userImages[0]);
                    } else {
                        // If multiple images, show instruction
                        this.showCustomAlert('Click on any image above to preview and edit it.', 'info', 'Multiple Images');
                    }
                };
            } else {
                proceedBtn.innerHTML = '<i class="fas fa-edit"></i> Edit Selected';
                proceedBtn.onclick = () => this.proceedToEdit();
            }
        }
    }
    
    async showImagePreview(image) {
        // Validate image data
        if (!image || !image.data) {
            console.error('❌ Invalid image data provided to showImagePreview:', image);
            this.showCustomAlert('Invalid image data. Please try again.', 'error', 'Image Error');
            return;
        }
        
        // Create modal overlay if it doesn't exist
        if (!document.getElementById('imagePreviewModal')) {
            const modalHtml = `
                <div class="modal-overlay" id="imagePreviewModal" style="display: none;">
                    <div class="modal-content image-preview-modal">
                        <button class="modal-close" data-action="close-preview">&times;</button>
                        <div class="modal-header"><h2><i class="fas fa-image"></i> Image Preview</h2></div>
                        <div class="preview-content">
                            <div class="preview-image-container">
                                <img id="previewImageElement" src="" alt="Image preview">
                            </div>
                            <p id="previewImageType" style="color: var(--anim-light);"></p>
                        </div>
                        <div class="preview-actions">
                            <button class="btn-small" id="editImageBtn"><i class="fas fa-edit"></i> Use for Meme</button>
                            <button class="btn-small btn-secondary-small" data-action="close-preview"><i class="fas fa-times"></i> Close</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Add event listeners for the new modal
            document.querySelectorAll('[data-action="close-preview"]').forEach(el => {
                el.addEventListener('click', () => {
                    document.getElementById('imagePreviewModal').style.display = 'none';
                });
            });
        }
        
        // Populate and show the modal
        const previewImageElement = this.safeGetElement('previewImageElement');
        if (previewImageElement) {
            previewImageElement.src = image.data;
        }
        
        // Safely handle image type with null checks
        const imageType = image && image.type ? image.type : 'unknown';
        const previewImageType = this.safeGetElement('previewImageType');
        if (previewImageType) {
            previewImageType.textContent = `Type: ${imageType.charAt(0).toUpperCase() + imageType.slice(1)}`;
        }
        
        const imagePreviewModal = this.safeGetElement('imagePreviewModal');
        if (imagePreviewModal) {
            imagePreviewModal.style.display = 'flex';
        }
        
        // Set up "Use for Meme" button
        const editBtn = document.getElementById('editImageBtn');
        editBtn.onclick = () => {
            this.proceedToEdit(image.url || image.data);
            document.getElementById('imagePreviewModal').style.display = 'none';
        };
    }
    
    proceedToEdit(imageData) {
        const imageToLoad = imageData || this.selectedUserImage;
        if (!imageToLoad) {
            this.showCustomAlert('Please select an image from your gallery first.', 'warning', 'No Image Selected');
            return;
        }
        
        // Handle both data structures (url vs data property)
        const imageUrl = typeof imageToLoad === 'string' ? imageToLoad : (imageToLoad.url || imageToLoad.data);
        
        if (!imageUrl) {
            this.showCustomAlert('Invalid image data. Please try selecting the image again.', 'error', 'Image Error');
            return;
        }
        
        this.loadImageToCanvas(imageUrl);
        this.expandStep('step3');
    }
    
    initializeStepStates() {
        try {
            const steps = document.querySelectorAll('.generator-steps .step-container');
            if (!steps || steps.length === 0) {
                console.warn('⚠️ No step containers found for initialization');
                return;
            }
            
            steps.forEach((step, index) => {
                if (!step) {
                    console.warn(`⚠️ Step at index ${index} is null`);
                    return;
                }
                
                if (index === 0) {
                    step.classList.add('active');
                    step.classList.remove('collapsed');
                } else {
                    step.classList.add('collapsed');
                    step.classList.remove('active');
                }
            });
        } catch (error) {
            console.error('❌ Error initializing step states:', error);
        }
    }
    
    expandStep(stepId) {
        try {
            if (!stepId) {
                console.warn('⚠️ No stepId provided to expandStep');
                return;
            }
            
            const steps = document.querySelectorAll('.generator-steps .step-container');
            if (!steps || steps.length === 0) {
                console.warn('⚠️ No step containers found for expansion');
                return;
            }
            
            steps.forEach(step => {
                if (!step) {
                    console.warn('⚠️ Found null step in expandStep');
                    return;
                }
                
                if (step.id === stepId) {
                    step.classList.add('active');
                    step.classList.remove('collapsed');
                } else {
                    step.classList.add('collapsed');
                    step.classList.remove('active');
                }
            });
            
            const targetStep = document.getElementById(stepId);
            if (targetStep) {
                targetStep.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                console.warn(`⚠️ Target step with id "${stepId}" not found`);
            }
        } catch (error) {
            console.error('❌ Error expanding step:', error);
        }
    }
    
    setMode(mode) {
        this.currentMode = mode;
        
        // Reset button states
        document.getElementById('addTextBtn').classList.remove('active');
        document.getElementById('addShapeBtn').classList.remove('active');
        document.getElementById('shapeTools').style.display = 'none';
        
        if (mode === 'text') {
            document.getElementById('addTextBtn').classList.add('active');
            this.addText();
        } else if (mode === 'shape') {
            document.getElementById('addShapeBtn').classList.add('active');
            document.getElementById('shapeTools').style.display = 'grid';
        }
    }
    
    addText() {
        const text = new fabric.Textbox('Edit Me!', {
            left: 100,
            top: 100,
            fontFamily: 'Impact',
            fontSize: 40,
            fill: '#ffffff',
            stroke: '#000000',
            strokeWidth: 2,
            textAlign: 'center',
            width: 200,
            splitByGrapheme: true,
        });
        
        this.canvas.add(text);
        this.canvas.setActiveObject(text);
        this.canvas.renderAll();
        
        // Reset mode after adding
        this.setMode(null);
    }
    
    addShape(shapeType) {
        let shape;
        
        switch (shapeType) {
            case 'rectangle':
                shape = new fabric.Rect({
                    left: 100,
                    top: 100,
                    width: 150,
                    height: 100,
                    fill: 'rgba(77, 162, 255, 0.7)',
                    stroke: '#ffffff',
                    strokeWidth: 2
                });
                break;
            case 'circle':
                shape = new fabric.Circle({
                    left: 100,
                    top: 100,
                    radius: 50,
                    fill: 'rgba(77, 162, 255, 0.7)',
                    stroke: '#ffffff',
                    strokeWidth: 2
                });
                break;
            case 'triangle':
                shape = new fabric.Triangle({
                    left: 100,
                    top: 100,
                    width: 100,
                    height: 100,
                    fill: 'rgba(77, 162, 255, 0.7)',
                    stroke: '#ffffff',
                    strokeWidth: 2
                });
                break;
            case 'star':
                shape = new fabric.Polygon([
                    { x: 0, y: -50 },
                    { x: 15, y: -15 },
                    { x: 50, y: -15 },
                    { x: 25, y: 10 },
                    { x: 40, y: 50 },
                    { x: 0, y: 25 },
                    { x: -40, y: 50 },
                    { x: -25, y: 10 },
                    { x: -50, y: -15 },
                    { x: -15, y: -15 }
                ], {
                    left: 100,
                    top: 100,
                    fill: 'rgba(77, 162, 255, 0.7)',
                    stroke: '#ffffff',
                    strokeWidth: 2
                });
                break;
        }
        
        if (shape) {
            this.canvas.add(shape);
            this.canvas.setActiveObject(shape);
            this.canvas.renderAll();
        }
        
        // Reset mode after adding
        this.setMode(null);
    }
    
    updateText(e) {
        const activeObject = this.canvas.getActiveObject();
        if (activeObject && activeObject.type === 'textbox') {
            activeObject.set('text', e.target.value);
            this.canvas.renderAll();
        }
    }
    
    updateTextStyle() {
        const activeObject = this.canvas.getActiveObject();
        if (activeObject && (activeObject.type === 'textbox' || activeObject.type === 'i-text')) {
            const fontFamily = this.safeGetElement('fontFamily');
            const textColor = this.safeGetElement('textColor');
            const strokeColor = this.safeGetElement('strokeColor');
            
            activeObject.set({
                fontFamily: fontFamily ? fontFamily.value : 'Arial',
                fill: textColor ? textColor.value : '#000000',
                stroke: strokeColor ? strokeColor.value : '#ffffff'
            });
            this.canvas.renderAll();
        }
    }
    
    updateFontSize(e) {
        const fontSizeValue = this.safeGetElement('fontSizeValue');
        if (fontSizeValue) fontSizeValue.textContent = `${e.target.value}px`;
        
        const activeObject = this.canvas.getActiveObject();
        if (activeObject && (activeObject.type === 'textbox' || activeObject.type === 'i-text')) {
            activeObject.set('fontSize', parseInt(e.target.value, 10));
            this.canvas.renderAll();
        }
    }
    
    updateStrokeWidth(e) {
        const strokeWidthValue = this.safeGetElement('strokeWidthValue');
        if (strokeWidthValue) strokeWidthValue.textContent = `${e.target.value}px`;
        
        const activeObject = this.canvas.getActiveObject();
        if (activeObject && (activeObject.type === 'textbox' || activeObject.type === 'i-text')) {
            activeObject.set('strokeWidth', parseInt(e.target.value, 10));
            this.canvas.renderAll();
        }
    }
    
    updateOpacity(e) {
        const opacityValue = this.safeGetElement('opacityValue');
        if (opacityValue) opacityValue.textContent = `${e.target.value}%`;
        
        const activeObject = this.canvas.getActiveObject();
        if (activeObject) {
            activeObject.set('opacity', parseInt(e.target.value, 10) / 100);
            this.canvas.renderAll();
        }
    }
    
    updateFillColor(e) {
        const activeObject = this.canvas.getActiveObject();
        if (activeObject && activeObject.type !== 'image') {
            activeObject.set('fill', e.target.value);
            this.canvas.renderAll();
        }
    }
    
    updateBorderColor(e) {
        const activeObject = this.canvas.getActiveObject();
        if (activeObject && activeObject.type !== 'image') {
            activeObject.set('stroke', e.target.value);
            this.canvas.renderAll();
        }
    }
    
    updateBorderWidth(e) {
        const borderWidthValue = this.safeGetElement('borderWidthValue');
        if (borderWidthValue) borderWidthValue.textContent = `${e.target.value}px`;
        
        const activeObject = this.canvas.getActiveObject();
        if (activeObject && activeObject.type !== 'image') {
            activeObject.set('strokeWidth', parseInt(e.target.value, 10));
            this.canvas.renderAll();
        }
    }
    
    bringForward() {
        const activeObject = this.canvas.getActiveObject();
        if (activeObject) {
            this.canvas.bringForward(activeObject);
            this.canvas.renderAll();
        }
    }
    
    sendBackward() {
        const activeObject = this.canvas.getActiveObject();
        if (activeObject) {
            this.canvas.sendBackwards(activeObject);
            this.canvas.renderAll();
        }
    }
    
    deleteSelected() {
        const activeObjects = this.canvas.getActiveObjects();
        if (activeObjects.length) {
            activeObjects.forEach(obj => {
                this.canvas.remove(obj);
            });
            this.canvas.discardActiveObject();
            
            // Check if canvas is now empty and handle accordingly
            const remainingObjects = this.canvas.getObjects();
            if (remainingObjects.length === 0) {
                console.log('All objects deleted - performing canvas cleanup');
                this.handleEmptyCanvas();
            } else {
                this.canvas.renderAll();
            }
            
            this.saveCanvasState();
            this.updateLayerList();
            this.updateCopyPasteButtons();
        }
    }
    
    copySelected() {
        const activeObject = this.canvas.getActiveObject();
        if (activeObject) {
            activeObject.clone((cloned) => {
                this.clipboard = cloned;
                this.pasteCount = 0; // Reset paste count on new copy
                this.updateCopyPasteButtons();
            });
        }
    }
    
    pasteElement() {
        if (this.clipboard) {
            this.clipboard.clone((clonedObj) => {
                this.canvas.discardActiveObject();
                clonedObj.set({
                    left: clonedObj.left + 10 * (this.pasteCount + 1),
                    top: clonedObj.top + 10 * (this.pasteCount + 1),
                    evented: true,
                });
                
                if (clonedObj.type === 'activeSelection') {
                    clonedObj.canvas = this.canvas;
                    clonedObj.forEachObject((obj) => {
                        this.canvas.add(obj);
                    });
                    clonedObj.setCoords();
                } else {
                    this.canvas.add(clonedObj);
                }
                
                this.pasteCount++;
                this.canvas.setActiveObject(clonedObj);
                this.canvas.requestRenderAll();
            });
        }
    }
    
    handleKeyboardShortcuts(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return; // Don't interfere with text input
        }
        
        const isCtrl = e.ctrlKey || e.metaKey;
        
        if (isCtrl && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            this.undo();
        } else if (isCtrl && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            this.redo();
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            console.log('Delete key pressed - attempting to delete selected object');
            this.deleteSelected();
        } else if (isCtrl && e.key.toLowerCase() === 'c') {
            e.preventDefault();
            this.copySelected();
        } else if (isCtrl && e.key.toLowerCase() === 'v') {
            e.preventDefault();
            this.pasteElement();
        }
    }
    
    onObjectSelected(e) {
        const selected = e.selected ? e.selected[0] : e.target;
        this.activeObject = selected;
        this.updateControls(selected);
        this.updateCopyPasteButtons();
    }
    
    onSelectionCleared() {
        this.activeObject = null;
        this.resetControls();
        this.updateCopyPasteButtons();
    }
    
    updateControls(obj) {
        if (obj.type === 'textbox' || obj.type === 'i-text') {
            const textInput = this.safeGetElement('textInput');
            if (textInput) textInput.value = obj.text;
            
            const fontFamily = this.safeGetElement('fontFamily');
            if (fontFamily) fontFamily.value = obj.fontFamily;
            
            const fontSize = this.safeGetElement('fontSize');
            if (fontSize) fontSize.value = obj.fontSize;
            
            const textColor = this.safeGetElement('textColor');
            if (textColor) textColor.value = obj.fill;
            
            const strokeColor = this.safeGetElement('strokeColor');
            if (strokeColor) strokeColor.value = obj.stroke;
            
            const strokeWidth = this.safeGetElement('strokeWidth');
            if (strokeWidth) strokeWidth.value = obj.strokeWidth;
        }
        
        const opacity = this.safeGetElement('opacity');
        if (opacity) opacity.value = obj.opacity * 100;
        
        if (obj.type !== 'image') {
            const fillColor = this.safeGetElement('fillColor');
            if (fillColor) fillColor.value = obj.fill || '#ffffff';
            
            const borderColor = this.safeGetElement('borderColor');
            if (borderColor) borderColor.value = obj.stroke || '#000000';
            
            const borderWidth = this.safeGetElement('borderWidth');
            if (borderWidth) borderWidth.value = obj.strokeWidth || 0;
        }
    }
    
    resetControls() {
        const textInput = this.safeGetElement('textInput');
        if (textInput) textInput.value = '';
        
        const fontFamily = this.safeGetElement('fontFamily');
        if (fontFamily) fontFamily.value = 'Impact';
        
        const fontSize = this.safeGetElement('fontSize');
        if (fontSize) fontSize.value = 40;
        
        const textColor = this.safeGetElement('textColor');
        if (textColor) textColor.value = '#ffffff';
        
        const strokeColor = this.safeGetElement('strokeColor');
        if (strokeColor) strokeColor.value = '#000000';
        
        const strokeWidth = this.safeGetElement('strokeWidth');
        if (strokeWidth) strokeWidth.value = 2;
        
        const opacity = this.safeGetElement('opacity');
        if (opacity) opacity.value = 100;
        
        const fillColor = this.safeGetElement('fillColor');
        if (fillColor) fillColor.value = '#4DA2FF';
        
        const borderColor = this.safeGetElement('borderColor');
        if (borderColor) borderColor.value = '#ffffff';
        
        const borderWidth = this.safeGetElement('borderWidth');
        if (borderWidth) borderWidth.value = 0;
    }
    
    updateCopyPasteButtons() {
        const copyBtn = document.getElementById('copyBtn');
        const pasteBtn = document.getElementById('pasteBtn');
        
        if (copyBtn) {
            copyBtn.disabled = !this.canvas.getActiveObject();
        }
        
        if (pasteBtn) {
            pasteBtn.disabled = !this.clipboard;
        }
    }
    
    saveCanvasState() {
        if (this.isLoadingFromHistory) {
            return;
        }
        
        this.history = this.history.slice(0, this.historyIndex + 1);
        const state = this.canvas.toJSON();
        this.history.push(state);
        
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
        
        this.historyIndex = this.history.length - 1;
        this.updateUndoRedoButtons();
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.isLoadingFromHistory = true;
            this.historyIndex--;
            this.canvas.loadFromJSON(this.history[this.historyIndex], () => {
                this.canvas.renderAll();
                this.isLoadingFromHistory = false;
                this.updateUndoRedoButtons();
            });
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.isLoadingFromHistory = true;
            this.historyIndex++;
            this.canvas.loadFromJSON(this.history[this.historyIndex], () => {
                this.canvas.renderAll();
                this.isLoadingFromHistory = false;
                this.updateUndoRedoButtons();
            });
        }
    }
    
    updateUndoRedoButtons() {
        document.getElementById('undoBtn').disabled = this.historyIndex <= 0;
        document.getElementById('redoBtn').disabled = this.historyIndex >= this.history.length - 1;
    }
    
    clearCanvas() {
        const confirmed = confirm('Are you sure you want to clear the canvas? This will remove all elements.');
        if (confirmed) {
            this.cleanupCanvas();
            this.saveCanvasState();
            this.updateLayerList();
            this.updateCopyPasteButtons();
        }
    }

    changeImage() {
        // Go back to step 2 (Your Images) to select a different image
        this.expandStep('step2');
        
        // Clear any selected image to force user to make a new selection
        this.selectedUserImage = null;
        
        // Clear visual selection from all image items
        document.querySelectorAll('.recent-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Show a helpful message
        this.showNotification('Select a different image from Your Images section', 'info');
    }
    
    exportMeme() {
        this.canvas.getElement().toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `aqua_meme_${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }
    
    async saveMeme(isSharing = false) {
        try {
            // Get original image URL
            let originalImageUrl = this.selectedUserImage;
            
            // Create data URL of final meme
            const finalMemeUrl = this.canvas.toDataURL({
                format: 'png',
                quality: 0.9,
            });
            
            // Create data URL of thumbnail
            const thumbnailDataUrl = this.canvas.toDataURL({
                format: 'jpeg',
                quality: 0.7,
                multiplier: 0.5, // 50% size for thumbnail
            });
            
            // Prepare text elements data
            const textElements = this.canvas.getObjects('textbox').map(obj => ({
                text: obj.text,
                font: obj.fontFamily,
                size: obj.fontSize,
                color: obj.fill,
                strokeColor: obj.stroke,
                strokeWidth: obj.strokeWidth,
                position: { x: obj.left, y: obj.top },
                angle: obj.angle,
            }));
            
            // Get custom title from input field
            const titleInput = document.getElementById('memeTitle');
            const customTitle = titleInput && titleInput.value.trim() ? titleInput.value.trim() : null;
            
            // Send data to the server
            const response = await fetch('/api/memes/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originalImageUrl,
                    finalMemeUrl,
                    thumbnailDataUrl,
                    textElements,
                    customTitle,
                    tags: ['meme-generator', 'user-created'], // Example tags
                    source: 'web-generator',
                }),
            });
            
            const result = await response.json();
            
            if (result.success) {
                if (!isSharing) {
                    await this.showCustomAlert(
                        'Meme saved successfully! It will appear in the gallery shortly.',
                        'success',
                        'Meme Saved'
                    );
                }
                return result.meme; // Return saved meme data
            } else {
                throw new Error(result.error || 'Failed to save meme');
            }
        } catch (error) {
            console.error('Error saving meme:', error);
            if (!isSharing) {
                await this.showCustomAlert(`Error saving meme: ${error.message}`, 'error', 'Save Failed');
            }
            return null;
        }
    }
    
    async saveAndShare() {
        const savedMeme = await this.saveMeme(true); // Save silently
        if (savedMeme) {
            this.openShareModal(savedMeme.finalMemeUrl, savedMeme.id);
        } else {
            this.showCustomAlert(
                'Failed to save the meme before sharing. Please try saving it manually first.',
                'error',
                'Share Failed'
            );
        }
    }
    
    openShareModal(imageUrl, memeId = null) {
        // Fallback to canvas data if no URL provided
        if (!imageUrl) {
            imageUrl = this.canvas.toDataURL();
        }
        
        const modal = document.getElementById('shareModal');
        const previewImg = document.getElementById('sharePreviewImage');
        
        previewImg.src = imageUrl;
        modal.style.display = 'flex';
        
        // Setup close buttons
        modal.querySelectorAll('[data-action="close-modal"]').forEach(btn => {
            btn.onclick = () => modal.style.display = 'none';
        });
        
        // Setup share buttons
        const platformsDiv = modal.querySelector('.social-platforms');
        platformsDiv.innerHTML = ''; // Clear previous buttons
        
        const shareMessage = document.getElementById('shareMessage');
        const defaultText = `Check out this hilarious meme I made with the $AQUA Meme Generator! #AQUAonSUI #MemeCoin`;
        shareMessage.value = defaultText;
        
        const platforms = {
            twitter: { icon: 'fab fa-x-twitter', name: 'Post to X', direct: true },
            reddit: { icon: 'fab fa-reddit-alien', name: 'Reddit' }
        };
        
        Object.entries(platforms).forEach(([platform, details]) => {
            const btn = document.createElement('a');
            btn.href = '#';
            btn.className = `social-platform ${platform}`;
            btn.innerHTML = `<i class="${details.icon}"></i> Share on ${details.name}`;
            btn.onclick = (e) => {
                e.preventDefault();
                this.shareOnPlatform(platform, memeId, shareMessage.value);
            };
            platformsDiv.appendChild(btn);
        });
    }
    
    async shareOnPlatform(platform, memeId, text) {
        try {
            // Handle direct X upload
            if (platform === 'twitter') {
                await this.postDirectlyToX(text);
                return;
            }

            // Handle other platforms with traditional sharing
            const response = await fetch('/api/social/share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform,
                    memeId,
                    text
                }),
            });
            
            const result = await response.json();
            
            if (result.success && result.shareUrl) {
                window.open(result.shareUrl, '_blank');
            } else {
                throw new Error(result.error || 'Could not generate share link');
            }
        } catch (error) {
            console.error(`Failed to share on ${platform}:`, error);
            this.showCustomAlert(`Sharing on ${platform} failed. Please try again.`, 'error');
        }
    }

    async postDirectlyToX(text) {
        try {
            // First, save the meme to get the meme ID
            const savedMeme = await this.saveMeme(null, null, true); // true for isSharing
            if (!savedMeme || !savedMeme.id) {
                throw new Error('Failed to save meme before posting');
            }
            
            // Get current canvas as image data
            const imageData = this.canvas.toDataURL('image/jpeg', 0.9);
            
            const response = await fetch('/api/social/post-to-x', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                credentials: 'include', // This sends cookies automatically
                body: JSON.stringify({
                    imageData,
                    text,
                    memeId: savedMeme.id
                }),
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Close share modal
                const modal = document.getElementById('shareModal');
                if (modal) modal.style.display = 'none';
                
                // Show success message with link to tweet
                this.showCustomAlert(
                    `Successfully posted to X! <a href="${result.tweetUrl}" target="_blank" style="color: #1DA1F2;">View Tweet</a>`, 
                    'success', 
                    'Posted to X!'
                );
            } else {
                throw new Error(result.error || 'Failed to post to X');
            }
        } catch (error) {
            console.error('Failed to post directly to X:', error);
            
            if (error.message.includes('authentication') || error.message.includes('Authentication required')) {
                this.showCustomAlert(
                    'Please sign in with X again to get posting permissions. <br><br><button onclick="window.authManager.login()" style="background: #1DA1F2; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 6px;"><i class="fab fa-x-twitter"></i> Sign in with X</button>', 
                    'warning',
                    'X Authentication Required'
                );
            } else {
                this.showCustomAlert(
                    `Failed to post to X: ${error.message}`, 
                    'error',
                    'Post Failed'
                );
            }
        }
    }
    


    loadUserImages() {
        try {
            if (typeof Storage !== 'undefined') {
                const stored = localStorage.getItem('memeGenerator_userImages');
                return stored ? JSON.parse(stored) : [];
            }
        } catch (error) {
            console.error('Error loading user images:', error);
        }
        return [];
    }

    saveUserImages() {
        try {
            if (typeof Storage !== 'undefined') {
                localStorage.setItem('memeGenerator_userImages', JSON.stringify(this.userImages));
            }
        } catch (error) {
            console.error('Error saving user images:', error);
        }
    }

    async addUserImage(imageUrl, type = 'generated') {
        const imageData = {
            id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            url: imageUrl,
            type: type,
            timestamp: Date.now(),
            name: `${type}_${new Date().toLocaleDateString()}`
        };
        
        this.userImages.unshift(imageData); // Add to beginning
        this.saveUserImages();
        this.refreshUserImagesDisplay();
        this.updateStorageInfo();
    }



    selectUserImage(imageId) {
        const image = this.userImages.find(img => img.id === imageId);
        if (!image) {
            console.warn('Image not found:', imageId);
            return;
        }

        // Show the image selection modal
        this.showImageSelectionModal(image);
    }

    showImageSelectionModal(image) {
        const modal = document.getElementById('imageSelectionModal');
        const preview = document.getElementById('selectedImagePreview');
        
        if (!modal || !preview) {
            console.error('Image selection modal elements not found');
            return;
        }

        // Set the preview image
        preview.src = image.url || image.data;
        
        // Store the selected image for later use
        this.pendingSelectedImage = image;
        
        // Show the modal
        modal.style.display = 'flex';
        
        // Add event listeners for modal actions
        this.setupImageSelectionModalEvents();
    }

    setupImageSelectionModalEvents() {
        // Remove existing listeners to prevent duplicates
        const goBackBtn = document.getElementById('goBackToImages');
        const useImageBtn = document.getElementById('useSelectedImage');
        const closeBtn = document.querySelector('#imageSelectionModal .modal-close');
        
        if (goBackBtn) {
            goBackBtn.replaceWith(goBackBtn.cloneNode(true));
            document.getElementById('goBackToImages').addEventListener('click', () => {
                this.closeImageSelectionModal();
            });
        }
        
        if (useImageBtn) {
            useImageBtn.replaceWith(useImageBtn.cloneNode(true));
            document.getElementById('useSelectedImage').addEventListener('click', () => {
                this.useSelectedImageForCanvas();
            });
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeImageSelectionModal();
            });
        }
    }

    closeImageSelectionModal() {
        const modal = document.getElementById('imageSelectionModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.pendingSelectedImage = null;
    }

    useSelectedImageForCanvas() {
        if (!this.pendingSelectedImage) {
            console.error('No pending image to use');
            return;
        }

        // Set the selected image
        this.selectedUserImage = this.pendingSelectedImage;
        
        // Close the modal
        this.closeImageSelectionModal();
        
        // Proceed to editing step
        this.proceedToEdit();
        
        console.log('Using image for canvas:', this.selectedUserImage.id);
    }

    removeUserImage(imageId) {
        this.userImages = this.userImages.filter(img => img.id !== imageId);
        this.saveUserImages();
        this.refreshUserImagesDisplay();
        this.updateStorageInfo();
    }





    async showCustomConfirm(message, title = 'Confirm') {
        // Remove any existing confirm dialog
        const existingConfirm = document.getElementById('customConfirmModal');
        if (existingConfirm) {
            existingConfirm.remove();
        }

        const modalHtml = `
            <div class="modal-overlay" id="customConfirmModal" style="display: flex;">
                <div class="modal-content custom-alert-modal">
                    <button class="modal-close" data-action="close-confirm">&times;</button>
                    <div class="modal-header"><h2>${title}</h2></div>
                    <div class="alert-content">
                        <i class="alert-icon fas fa-question-circle warning"></i>
                        <p class="alert-message">${message}</p>
                        <div class="alert-actions" style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                            <button class="btn btn-secondary" id="confirmCancelBtn">Cancel</button>
                            <button class="btn btn-confirm" id="confirmOkBtn">Confirm</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        return new Promise(resolve => {
            const modal = document.getElementById('customConfirmModal');
            const close = (result) => {
                modal.remove();
                resolve(result);
            };
            modal.querySelector('[data-action="close-confirm"]').onclick = () => close(false);
            modal.querySelector('#confirmCancelBtn').onclick = () => close(false);
            modal.querySelector('#confirmOkBtn').onclick = () => close(true);
        });
    }

    async showCustomAlert(message, type = 'info', title = 'Notification') {
        // Remove any existing alert
        const existingAlert = document.getElementById('customAlertModal');
        if (existingAlert) {
            existingAlert.remove();
        }

        const iconClass = {
            info: 'fas fa-info-circle info',
            success: 'fas fa-check-circle success',
            error: 'fas fa-times-circle error',
            warning: 'fas fa-exclamation-triangle warning'
        }[type];

        const modalHtml = `
            <div class="modal-overlay" id="customAlertModal" style="display: flex;">
                <div class="modal-content custom-alert-modal">
                    <button class="modal-close" data-action="close-alert">&times;</button>
                    <div class="modal-header"><h2>${title}</h2></div>
                    <div class="alert-content">
                        <i class="alert-icon ${iconClass}"></i>
                        <p class="alert-message">${message}</p>
                        <div class="alert-actions">
                            <button class="btn btn-confirm" id="alertOkBtn">OK</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        return new Promise(resolve => {
            const modal = document.getElementById('customAlertModal');
            const close = () => {
                modal.remove();
                resolve();
            };
            modal.querySelector('[data-action="close-alert"]').onclick = close;
            modal.querySelector('#alertOkBtn').onclick = close;
        });
    }

    // Initialize advanced features (Phase 2 enhancements)
    initializeAdvancedFeatures() {
        this.initializeKeyboardShortcuts();
        this.initializeAdvancedTextEffects();
        this.initializeLayerManagement();
        this.initializeAutoSave();
        this.initializeCreditSystem();
    }

    // Keyboard shortcuts
    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            // Ctrl/Cmd + Z - Undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            }
            // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y - Redo
            else if ((e.ctrlKey || e.metaKey) && (e.shiftKey && e.key === 'Z' || e.key === 'y')) {
                e.preventDefault();
                this.redo();
            }
            // Ctrl/Cmd + C - Copy
            else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                e.preventDefault();
                this.copyObject();
            }
            // Ctrl/Cmd + V - Paste
            else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                e.preventDefault();
                this.pasteObject();
            }
            // Delete - Remove selected object
            else if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                this.deleteSelectedObject();
            }
            // Ctrl/Cmd + D - Duplicate
            else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                this.duplicateObject();
            }
            // Ctrl/Cmd + S - Save Draft
            else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveDraft();
            }
            // F1 - Show shortcuts help
            else if (e.key === 'F1') {
                e.preventDefault();
                this.showShortcutsHelp();
            }
        });
    }

    // Advanced text effects
    initializeAdvancedTextEffects() {
        // Shadow controls
        const enableShadow = document.getElementById('enableShadow');
        const shadowColor = document.getElementById('shadowColor');
        
        if (enableShadow) {
            enableShadow.addEventListener('change', () => this.updateTextShadow());
        }
        if (shadowColor) {
            shadowColor.addEventListener('change', () => this.updateTextShadow());
        }

        // Note: Text opacity control was simplified in compact design and handled by main opacity control

        // Note: Blend mode was removed in compact design to save space

        // Text alignment
        const alignButtons = document.querySelectorAll('.align-buttons .align-btn');
        alignButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                alignButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updateTextAlignment(btn.id);
            });
        });
    }

    // Layer management
    initializeLayerManagement() {
        // Layer control buttons
        const moveToFront = document.getElementById('moveToFront');
        const moveToBack = document.getElementById('moveToBack');
        const lockObject = document.getElementById('lockObject');
        const duplicateObject = document.getElementById('duplicateObject');

        if (moveToFront) {
            moveToFront.addEventListener('click', () => this.bringToFront());
        }
        if (moveToBack) {
            moveToBack.addEventListener('click', () => this.sendToBack());
        }
        if (lockObject) {
            lockObject.addEventListener('click', () => this.toggleLock());
        }
        if (duplicateObject) {
            duplicateObject.addEventListener('click', () => this.duplicateObject());
        }

        // Update layer list when canvas changes
        this.canvas.on('object:added', () => this.updateLayerList());
        this.canvas.on('object:removed', () => this.updateLayerList());
        this.canvas.on('selection:created', () => this.updateLayerList());
        this.canvas.on('selection:updated', () => this.updateLayerList());
        this.canvas.on('selection:cleared', () => this.updateLayerList());
    }

    // Auto-save functionality
    initializeAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            this.autoSave();
        }, 30000); // Auto-save every 30 seconds
    }

    // Credit system integration
    initializeCreditSystem() {
        // Enhanced buttons
        const saveDraftBtn = document.getElementById('saveDraftBtn');
        const publishBtn = document.getElementById('publishBtn');
        const exportBtn = document.getElementById('exportBtn');

        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', () => this.saveDraft());
        }
        if (publishBtn) {
            publishBtn.addEventListener('click', () => this.publishMeme());
        }
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportMeme());
        }

        // Load credit info on page load
        this.loadCreditInfo();
    }

    // Enhanced text effects methods
    updateTextShadow() {
        const activeObject = this.canvas.getActiveObject();
        if (!activeObject || activeObject.type !== 'i-text') return;

        const enableShadow = document.getElementById('enableShadow');
        const shadowColor = document.getElementById('shadowColor');

        if (enableShadow && enableShadow.checked) {
            const color = shadowColor ? shadowColor.value : '#000000';
            const blur = 4; // Fixed blur value for compact design
            activeObject.set('shadow', new fabric.Shadow({
                color: color,
                blur: blur,
                offsetX: 2,
                offsetY: 2
            }));
        } else {
            activeObject.set('shadow', null);
        }

        this.canvas.renderAll();
        this.saveCanvasState();
    }

    // updateTextOpacity removed - now handled by main opacity control

    // updateBlendMode removed - feature not included in compact design

    updateTextAlignment(alignmentId) {
        const activeObject = this.canvas.getActiveObject();
        if (!activeObject || activeObject.type !== 'i-text') return;

        let textAlign = 'center';
        switch (alignmentId) {
            case 'alignLeft': textAlign = 'left'; break;
            case 'alignRight': textAlign = 'right'; break;
            case 'alignCenter': textAlign = 'center'; break;
        }

        activeObject.set('textAlign', textAlign);
        this.canvas.renderAll();
        this.saveCanvasState();
    }

    // Layer management methods
    bringToFront() {
        const activeObject = this.canvas.getActiveObject();
        if (activeObject) {
            this.canvas.bringToFront(activeObject);
            this.saveCanvasState();
            this.updateLayerList();
        }
    }

    sendToBack() {
        const activeObject = this.canvas.getActiveObject();
        if (activeObject) {
            this.canvas.sendToBack(activeObject);
            this.saveCanvasState();
            this.updateLayerList();
        }
    }

    toggleLock() {
        const activeObject = this.canvas.getActiveObject();
        if (activeObject) {
            const isLocked = !activeObject.selectable;
            activeObject.set({
                selectable: isLocked,
                evented: isLocked
            });
            this.canvas.renderAll();
            this.updateLayerList();
            
            const lockBtn = document.getElementById('lockObject');
            if (lockBtn) {
                lockBtn.innerHTML = isLocked ? 
                    '<i class="fas fa-unlock"></i> Unlock' : 
                    '<i class="fas fa-lock"></i> Lock';
            }
        }
    }

    duplicateObject() {
        const activeObject = this.canvas.getActiveObject();
        if (activeObject) {
            activeObject.clone((cloned) => {
                cloned.set({
                    left: cloned.left + 20,
                    top: cloned.top + 20
                });
                this.canvas.add(cloned);
                this.canvas.setActiveObject(cloned);
                this.canvas.renderAll();
                this.saveCanvasState();
            });
        }
    }

    updateLayerList() {
        const layerList = document.getElementById('layerList');
        if (!layerList) return;

        const objects = this.canvas.getObjects();
        layerList.innerHTML = '';

        objects.forEach((obj, index) => {
            const layerItem = document.createElement('div');
            layerItem.className = 'layer-item';
            if (obj === this.canvas.getActiveObject()) {
                layerItem.classList.add('active');
            }
            if (!obj.selectable) {
                layerItem.classList.add('locked');
            }

            const layerInfo = document.createElement('div');
            layerInfo.className = 'layer-info';

            const typeIcon = document.createElement('div');
            typeIcon.className = 'layer-type-icon';
            typeIcon.innerHTML = obj.type === 'i-text' ? 'T' : 
                                obj.type === 'image' ? 'I' : 'S';

            const layerName = document.createElement('span');
            layerName.textContent = obj.type === 'i-text' ? `Text: ${obj.text?.substring(0, 20)}...` :
                                  obj.type === 'image' ? 'Image' : 'Shape';

            layerInfo.appendChild(typeIcon);
            layerInfo.appendChild(layerName);

            const layerActions = document.createElement('div');
            layerActions.className = 'layer-actions';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'layer-action-btn';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.onclick = () => this.deleteObject(obj);

            layerActions.appendChild(deleteBtn);
            layerItem.appendChild(layerInfo);
            layerItem.appendChild(layerActions);

            layerItem.onclick = () => {
                this.canvas.setActiveObject(obj);
                this.canvas.renderAll();
            };

            layerList.appendChild(layerItem);
        });
    }

    deleteObject(obj) {
        this.canvas.remove(obj);
        this.canvas.discardActiveObject();
        
        // Check if canvas is now empty and handle accordingly
        const remainingObjects = this.canvas.getObjects();
        if (remainingObjects.length === 0) {
            console.log('All objects deleted via layer panel - performing canvas cleanup');
            this.handleEmptyCanvas();
        } else {
            this.canvas.renderAll();
        }
        
        this.saveCanvasState();
        this.updateLayerList();
        this.updateCopyPasteButtons();
    }

    deleteSelectedObject() {
        const activeObject = this.canvas.getActiveObject();
        if (activeObject) {
            this.canvas.remove(activeObject);
            this.canvas.discardActiveObject();
            
            // Check if canvas is now empty and handle accordingly
            const remainingObjects = this.canvas.getObjects();
            if (remainingObjects.length === 0) {
                console.log('All objects deleted via keyboard - performing canvas cleanup');
                this.handleEmptyCanvas();
            } else {
                this.canvas.renderAll();
            }
            
            this.saveCanvasState();
            this.updateLayerList();
            this.updateCopyPasteButtons();
        }
    }

    // Auto-save and credit system methods
    autoSave() {
        if (this.canvas.getObjects().length > 0) {
            this.saveDraft(true); // Silent auto-save
        }
    }

    saveDraft(silent = false) {
        const canvasData = JSON.stringify(this.canvas.toJSON());
        localStorage.setItem('meme_draft', canvasData);
        
        if (!silent) {
            this.showAutoSaveIndicator('Draft saved locally!');
        }
    }

    async publishMeme() {
        // Implementation for publishing meme with credit deduction
        try {
            const canvasData = this.canvas.toDataURL('image/png');
            // API call to create meme with credit checking
            const response = await fetch('/api/memes/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    canvasData: canvasData,
                    // ... other meme data
                })
            });
            
            if (response.ok) {
                this.showAutoSaveIndicator('Meme published successfully!');
            } else {
                const error = await response.json();
                this.showAutoSaveIndicator(error.message || 'Failed to publish', true);
            }
        } catch (error) {
            this.showAutoSaveIndicator('Failed to publish meme', true);
        }
    }

    exportMeme() {
        const dataURL = this.canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `aqua-meme-${Date.now()}.png`;
        link.href = dataURL;
        link.click();
        
        this.showAutoSaveIndicator('Meme downloaded!');
    }

    loadCreditInfo() {
        fetch('/api/limits/info')
            .then(response => response.json())
            .then(data => {
                // Update UI with credit information
                console.log('Credit info:', data);
            })
            .catch(error => {
                console.error('Failed to load credit info:', error);
            });
    }

    showAutoSaveIndicator(message, isError = false) {
        let indicator = document.querySelector('.auto-save-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'auto-save-indicator';
            document.body.appendChild(indicator);
        }

        indicator.textContent = message;
        indicator.className = `auto-save-indicator ${isError ? 'error' : ''} show`;

        setTimeout(() => {
            indicator.classList.remove('show');
        }, 3000);
    }

    showShortcutsHelp() {
        const shortcuts = [
            { key: 'Ctrl+Z', action: 'Undo' },
            { key: 'Ctrl+Y', action: 'Redo' },
            { key: 'Ctrl+C', action: 'Copy' },
            { key: 'Ctrl+V', action: 'Paste' },
            { key: 'Ctrl+D', action: 'Duplicate' },
            { key: 'Ctrl+S', action: 'Save Draft' },
            { key: 'Delete', action: 'Delete Selected' },
            { key: 'F1', action: 'Show Help' }
        ];

        let helpDiv = document.querySelector('.shortcuts-help');
        if (!helpDiv) {
            helpDiv = document.createElement('div');
            helpDiv.className = 'shortcuts-help';
            document.body.appendChild(helpDiv);

            helpDiv.innerHTML = `
                <h4>Keyboard Shortcuts</h4>
                <ul>
                    ${shortcuts.map(s => `<li><span>${s.action}</span> <span class="shortcut-key">${s.key}</span></li>`).join('')}
                </ul>
            `;

            // Auto-hide after 10 seconds
            setTimeout(() => {
                helpDiv.classList.remove('show');
            }, 10000);
        }

        helpDiv.classList.toggle('show');
    }

    // Debug and testing functions
    runCanvasTests() {
        console.log('🧪 Starting Canvas Function Tests...');
        
        // Test 1: Add shapes
        console.log('Test 1: Adding shapes...');
        this.addShape('rectangle');
        setTimeout(() => {
            this.addShape('circle');
            setTimeout(() => {
                // Test 2: Add text
                console.log('Test 2: Adding text...');
                this.addText();
                setTimeout(() => {
                    // Test 3: Test layer operations
                    console.log('Test 3: Testing layer operations...');
                    const objects = this.canvas.getObjects();
                    if (objects.length >= 3) {
                        this.canvas.setActiveObject(objects[1]); // Select circle
                        this.bringForward();
                        this.sendBackward();
                        
                        // Test 4: Test copy/paste
                        console.log('Test 4: Testing copy/paste...');
                        this.copySelected();
                        setTimeout(() => {
                            this.pasteElement();
                            
                            // Test 5: Test delete functionality
                            console.log('Test 5: Testing delete functionality...');
                            setTimeout(() => {
                                const objectsBeforeDelete = this.canvas.getObjects().length;
                                console.log(`Objects before delete: ${objectsBeforeDelete}`);
                                
                                // Delete the active object
                                this.deleteSelected();
                                
                                setTimeout(() => {
                                    const objectsAfterDelete = this.canvas.getObjects().length;
                                    console.log(`Objects after delete: ${objectsAfterDelete}`);
                                    
                                    if (objectsAfterDelete < objectsBeforeDelete) {
                                        console.log('✅ Delete function working correctly!');
                                    } else {
                                        console.log('❌ Delete function failed - objects not removed');
                                    }
                                    
                                    // Test 6: Test undo/redo
                                    console.log('Test 6: Testing undo/redo...');
                                    this.undo();
                                    setTimeout(() => {
                                        const objectsAfterUndo = this.canvas.getObjects().length;
                                        console.log(`Objects after undo: ${objectsAfterUndo}`);
                                        
                                        this.redo();
                                        setTimeout(() => {
                                            const objectsAfterRedo = this.canvas.getObjects().length;
                                            console.log(`Objects after redo: ${objectsAfterRedo}`);
                                            
                                            console.log('🎉 Canvas function tests completed!');
                                            this.showTestResults();
                                        }, 500);
                                    }, 500);
                                }, 500);
                            }, 500);
                        }, 500);
                    }
                }, 500);
            }, 500);
        }, 500);
    }

    showTestResults() {
        const results = {
            canvasObjects: this.canvas.getObjects().length,
            historyLength: this.history.length,
            currentHistoryIndex: this.historyIndex,
            activeObject: this.canvas.getActiveObject() ? this.canvas.getActiveObject().type : 'none'
        };
        
        console.log('📊 Test Results:', results);
        
        // Show results in UI
        this.showCustomAlert(
            `Canvas Tests Completed!\n\nObjects on canvas: ${results.canvasObjects}\nHistory states: ${results.historyLength}\nActive object: ${results.activeObject}`,
            'info',
            'Test Results'
        );
    }

    // Function to manually test specific operations
    testDeleteFunction() {
        console.log('🔍 Testing delete function specifically...');
        
        // Add a test shape
        this.addShape('rectangle');
        
        setTimeout(() => {
            const objects = this.canvas.getObjects();
            console.log(`Objects before delete: ${objects.length}`);
            
            if (objects.length > 0) {
                // Select the last object
                this.canvas.setActiveObject(objects[objects.length - 1]);
                console.log('Selected object:', this.canvas.getActiveObject().type);
                
                // Delete it
                this.deleteSelected();
                
                setTimeout(() => {
                    const objectsAfter = this.canvas.getObjects();
                    console.log(`Objects after delete: ${objectsAfter.length}`);
                    
                    if (objectsAfter.length < objects.length) {
                        console.log('✅ Delete function working!');
                    } else {
                        console.log('❌ Delete function failed!');
                        console.log('Canvas objects:', this.canvas.getObjects());
                        console.log('Active object:', this.canvas.getActiveObject());
                    }
                }, 100);
            }
        }, 100);
    }

    // Function to fix canvas corruption
    fixCanvasCorruption() {
        console.log('🔧 Attempting to fix canvas corruption...');
        
        try {
            // Store current objects
            const currentObjects = this.canvas.getObjects();
            console.log(`Preserving ${currentObjects.length} objects`);
            
            // Completely dispose of the current canvas
            this.canvas.dispose();
            
            // Recreate the canvas
            this.canvas = new fabric.Canvas('memeCanvas', {
                backgroundColor: '#ffffff',
                preserveObjectStacking: true
            });
            
            // Re-add all objects
            currentObjects.forEach(obj => {
                this.canvas.add(obj);
            });
            
            // Re-initialize event listeners for canvas
            this.canvas.on('object:modified', () => this.saveCanvasState());
            this.canvas.on('object:added', () => this.saveCanvasState());
            this.canvas.on('object:removed', () => this.saveCanvasState());
            this.canvas.on('selection:created', (e) => {
                if (e && (e.target || e.selected)) {
                    this.onObjectSelected(e);
                }
            });
            this.canvas.on('selection:updated', (e) => {
                if (e && (e.target || e.selected)) {
                    this.onObjectSelected(e);
                }
            });
            this.canvas.on('selection:cleared', () => this.onSelectionCleared());
            
            // Render the canvas
            this.canvas.renderAll();
            
            console.log('✅ Canvas corruption fixed!');
            this.showCustomAlert('Canvas has been reset and corruption fixed!', 'success', 'Canvas Fixed');
            
        } catch (error) {
            console.error('❌ Failed to fix canvas corruption:', error);
            this.showCustomAlert('Failed to fix canvas corruption. Please refresh the page.', 'error', 'Fix Failed');
        }
    }
}

// Initialize the generator once the DOM and Fabric.js are ready
function initializeMemeGenerator() {
    console.log('🚀 Initializing Meme Generator...');
    
    if (typeof fabric === 'undefined') {
        console.log('⏳ Waiting for Fabric.js to load...');
        setTimeout(initializeMemeGenerator, 100);
        return;
    }
    
    console.log('✅ Fabric.js loaded, creating AdvancedMemeGenerator...');
    
    try {
        window.memeGenerator = new AdvancedMemeGenerator();
        console.log('✅ AdvancedMemeGenerator created successfully!');
    } catch (error) {
        console.error('❌ Failed to create AdvancedMemeGenerator:', error);
        console.log('🔄 Retrying in 500ms...');
        setTimeout(initializeMemeGenerator, 500);
        return;
    }
    
    // Add test functions to global scope for debugging
    window.testCanvas = () => window.memeGenerator.runCanvasTests();
    window.testDelete = () => window.memeGenerator.testDeleteFunction();
    window.fixCanvas = () => window.memeGenerator.fixCanvasCorruption();
    window.resetCanvas = () => {
        window.memeGenerator.cleanupCanvas();
        window.memeGenerator.handleEmptyCanvas();
        console.log('Canvas has been completely reset');
    };
    
    console.log('🎨 Meme Generator initialized!');
    console.log('💡 Debug commands available:');
    console.log('  - testCanvas() - Run full canvas tests');
    console.log('  - testDelete() - Test delete function specifically');
    console.log('  - fixCanvas() - Fix canvas corruption issues');
    console.log('  - resetCanvas() - Emergency canvas reset');
}

// Terms of Service Modal Functions
function openTosModal() {
    const modal = document.getElementById('tosModal');
    const dateSpan = document.getElementById('tosDate');
    
    // Set current date
    if (dateSpan) {
        dateSpan.textContent = new Date().toLocaleDateString();
    }
    
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
}

function closeTosModal() {
    const modal = document.getElementById('tosModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Restore scrolling
    }
}

// Close modal when clicking outside of it
document.addEventListener('click', (event) => {
    const modal = document.getElementById('tosModal');
    if (event.target === modal) {
        closeTosModal();
    }
});

// Start initialization when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize meme generator first
    initializeMemeGenerator();
    
    // Setup animations after a short delay to ensure DOM is ready
    setTimeout(() => {
        setupScrollAnimations();
    }, 200);
    
    // Add global fallback for Generate button
    setTimeout(() => {
        const generateBtn = document.getElementById('generateBtn');
        if (generateBtn && !generateBtn.hasAttribute('data-listener-attached')) {
            generateBtn.addEventListener('click', function() {
                console.log('🔄 Fallback Generate button clicked!');
                if (window.memeGenerator && window.memeGenerator.generateAIImage) {
                    window.memeGenerator.generateAIImage();
                } else {
                    console.error('❌ Meme generator not available!');
                }
            });
            generateBtn.setAttribute('data-listener-attached', 'true');
            console.log('🛡️ Fallback Generate button listener added');
        }
    }, 1000);
});

// Setup scroll animations function (standalone)
function setupScrollAnimations() {
    console.log('🎬 Setting up scroll animations...');
    
    const container = document.querySelector('.meme-generator-container');
    const elements = document.querySelectorAll('.scroll-animate');
    
    console.log('🔍 Animation debug:', {
        container: !!container,
        elementsFound: elements.length,
        elementsArray: Array.from(elements).map(el => el.className)
    });
    
    if (!container || elements.length === 0) {
        console.error('❌ Animation setup failed - container or elements not found');
        console.log('Available elements:', document.querySelectorAll('*[class*="animate"]'));
        return;
    }
    
    // Only enable animations if we can successfully set them up
    try {
        // Add animation class to container to enable CSS animations
        container.classList.add('js-animations');
        console.log('✅ Animation CSS class added to container');
        console.log('🔍 Container classes:', container.className);
        
        // Add staggered animation
        elements.forEach((el, index) => {
            if (!el) {
                console.warn(`⚠️ Element at index ${index} is null in animation setup`);
                return;
            }
            
            console.log(`⏳ Scheduling animation for element ${index}:`, el.className);
            setTimeout(() => {
                if (el && el.classList) {
                    el.classList.add('in-view');
                    console.log(`✨ Applied in-view to element ${index}:`, el.className);
                }
            }, index * 150);
        });
        
        // Set up intersection observer for future elements
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry && entry.target && entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                }
            });
        }, observerOptions);
        
        elements.forEach(el => {
            if (el) {
                observer.observe(el);
            }
        });
        
        console.log('✅ Scroll animations setup complete');
    } catch (error) {
        console.error('❌ Animation setup failed:', error);
        // If animation setup fails, remove the animation class so content stays visible
        if (container) {
            container.classList.remove('js-animations');
        }
    }
}

// Close modal with Escape key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        const modal = document.getElementById('tosModal');
        if (modal && modal.style.display === 'block') {
            closeTosModal();
        }
    }
}); 