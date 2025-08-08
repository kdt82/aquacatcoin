// Advanced Meme Generator with Full Editing Package
class AdvancedMemeGenerator {
    constructor() {
        this.canvas = new fabric.Canvas('memeCanvas', {
            backgroundColor: '#ffffff',
            preserveObjectStacking: true
        });
        
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 20;
        this.isLoadingFromHistory = false; // Flag to prevent infinite loops during undo/redo
        this.currentMode = null; // 'text', 'shape', null
        this.activeObject = null;
        this.selectedModel = 'creative';
        this.availableModels = {};
        this.selectedUserImage = null;
        this.userImages = this.loadUserImages();
        this.clipboard = null; // For copy/paste functionality
        this.pasteCount = 0; // Track multiple pastes for better positioning
        
        this.initializeEventListeners();
        this.loadAIModels();
        this.refreshUserImagesDisplay();
        this.updateStorageInfo();
        this.setupScrollAnimations();
        this.initializeStepStates();
        
        // Save initial canvas state after everything is initialized
        setTimeout(() => {
            this.saveCanvasState();
            this.updateCopyPasteButtons(); // Initialize button states
        }, 100);
    }
    
    initializeEventListeners() {
        // Step toggles
        window.toggleStep = this.toggleStep.bind(this);
        
        // Primary choice selection
        document.getElementById('aiChoice').addEventListener('click', () => {
            this.selectChoice('ai');
        });
        
        document.getElementById('uploadChoice').addEventListener('click', () => {
            this.selectChoice('upload');
        });
        
        // File upload
        const uploadZone = document.getElementById('uploadZone');
        const imageUpload = document.getElementById('imageUpload');
        
        uploadZone.addEventListener('click', () => imageUpload.click());
        uploadZone.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadZone.addEventListener('drop', this.handleDrop.bind(this));
        imageUpload.addEventListener('change', this.handleImageUpload.bind(this));
        
        // AI Generation
        document.getElementById('generateBtn').addEventListener('click', this.generateAIImage.bind(this));
        
        // Canvas tools
        document.getElementById('undoBtn').addEventListener('click', this.undo.bind(this));
        document.getElementById('redoBtn').addEventListener('click', this.redo.bind(this));
        document.getElementById('clearBtn').addEventListener('click', this.clearCanvas.bind(this));
        document.getElementById('exportBtn').addEventListener('click', this.exportMeme.bind(this));
        document.getElementById('saveBtn').addEventListener('click', this.saveMeme.bind(this));
        
        // Element tools
        document.getElementById('addTextBtn').addEventListener('click', () => {
            this.setMode('text');
        });
        
        document.getElementById('addShapeBtn').addEventListener('click', () => {
            this.setMode('shape');
            document.getElementById('shapeTools').style.display = 'grid';
        });
        
        // Shape tools
        document.querySelectorAll('.shape-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const shape = e.currentTarget.dataset.shape;
                this.addShape(shape);
            });
        });
        
        // Text controls
        document.getElementById('textInput').addEventListener('input', this.updateText.bind(this));
        document.getElementById('fontFamily').addEventListener('change', this.updateTextStyle.bind(this));
        document.getElementById('fontSize').addEventListener('input', this.updateFontSize.bind(this));
        document.getElementById('textColor').addEventListener('change', this.updateTextStyle.bind(this));
        document.getElementById('strokeColor').addEventListener('change', this.updateTextStyle.bind(this));
        document.getElementById('strokeWidth').addEventListener('input', this.updateStrokeWidth.bind(this));
        
        // Element properties
        document.getElementById('opacity').addEventListener('input', this.updateOpacity.bind(this));
        document.getElementById('fillColor').addEventListener('change', this.updateFillColor.bind(this));
        document.getElementById('borderColor').addEventListener('change', this.updateBorderColor.bind(this));
        document.getElementById('borderWidth').addEventListener('input', this.updateBorderWidth.bind(this));
        
        // Layer controls
        document.getElementById('bringForwardBtn').addEventListener('click', this.bringForward.bind(this));
        document.getElementById('sendBackwardBtn').addEventListener('click', this.sendBackward.bind(this));
        document.getElementById('deleteBtn').addEventListener('click', this.deleteSelected.bind(this));
        
        // Copy/Paste controls
        document.getElementById('copyBtn').addEventListener('click', this.copySelected.bind(this));
        document.getElementById('pasteBtn').addEventListener('click', this.pasteElement.bind(this));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
        
        // Share to social button
        document.getElementById('shareToSocialBtn').addEventListener('click', this.saveAndShare.bind(this));
        
        // Direct share button (for testing)
        document.getElementById('directShareBtn').addEventListener('click', this.openShareModal.bind(this));
        
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
        const step = document.getElementById(stepId);
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
    }
    
    selectChoice(choice) {
        // Remove selection from both cards
        document.querySelectorAll('.choice-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Hide both forms
        document.getElementById('aiForm').classList.remove('active');
        document.getElementById('uploadZone').classList.remove('active');
        
        if (choice === 'ai') {
            document.getElementById('aiChoice').classList.add('selected');
            document.getElementById('aiForm').classList.add('active');
        } else {
            document.getElementById('uploadChoice').classList.add('selected');
            document.getElementById('uploadZone').classList.add('active');
        }
    }
    
    async loadAIModels() {
        try {
            const response = await fetch('/api/ai/models');
            const result = await response.json();
            
            if (result.success) {
                this.availableModels = result.models;
                this.renderModelSelection();
            }
        } catch (error) {
            console.error('Failed to load AI models:', error);
            // Show fallback models
            this.availableModels = {
                creative: {
                    name: "Creative Engine",
                    description: "Best for cartoon-style memes with vibrant colors",
                    example: "A wet cartoon cat with big eyes sitting in the rain",
                    speed: "Fast",
                    recommended: true
                }
            };
            this.renderModelSelection();
        }
    }
    
    renderModelSelection() {
        const grid = document.getElementById('modelGrid');
        grid.innerHTML = '';
        
        Object.entries(this.availableModels).forEach(([key, model]) => {
            const modelCard = document.createElement('div');
            modelCard.className = `model-card ${key === 'creative' ? 'selected' : ''} ${model.recommended ? 'recommended' : ''}`;
            modelCard.dataset.model = key;
            
            modelCard.innerHTML = `
                <div class="model-name">${model.name}</div>
                <div class="model-description">${model.description}</div>
                <div class="model-example">"${model.example}"</div>
                <div class="model-meta">
                    <span class="model-speed-badge">⚡ ${model.speed}</span>
                </div>
            `;
            
            modelCard.addEventListener('click', () => {
                document.querySelectorAll('.model-card').forEach(card => {
                    card.classList.remove('selected');
                });
                modelCard.classList.add('selected');
                this.selectedModel = key;
            });
            
            grid.appendChild(modelCard);
        });
    }

    async generateAIImage() {
        const prompt = document.getElementById('aiPrompt').value;
        if (!prompt.trim()) {
            await this.showCustomAlert('Please enter a description for your image.', 'warning', 'Missing Description');
            return;
        }
        
        document.getElementById('generationStatus').style.display = 'block';
        document.getElementById('generateBtn').disabled = true;
        
        try {
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: prompt,
                    model: this.selectedModel
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
            document.getElementById('generationStatus').style.display = 'none';
        } finally {
            document.getElementById('generateBtn').disabled = false;
        }
    }
    
    async pollGenerationStatus(generationId, statusDiv) {
        let attempts = 0;
        const maxAttempts = 30; // 5 minutes maximum
        
        const checkStatus = async () => {
            try {
                const response = await fetch(`/api/ai/status/${generationId}`);
                const result = await response.json();
                
                if (result.success && result.generation) {
                    const generation = result.generation;
                    
                    if (generation.status === 'COMPLETE' && generation.generated_images && generation.generated_images.length > 0) {
                        // Generation completed successfully
                        const imageUrl = generation.generated_images[0].url;
                        statusDiv.innerHTML = `<i class="fas fa-check" style="color: #10B981;"></i> Image generated successfully!`;
                        
                        // Add the generated image to user images
                        await this.addUserImage(imageUrl, 'generated');
                        
                        // Show step 2 (Your Images) and highlight the new image
                        this.expandStep('step2');
                        
                        // Hide status after a moment
                        setTimeout(() => {
                            statusDiv.style.display = 'none';
                        }, 2000);
                        
                        return; // Stop polling
                    } else if (generation.status === 'FAILED') {
                        statusDiv.innerHTML = `<i class="fas fa-times" style="color: #EF4444;"></i> Generation failed. Please try again.`;
                        setTimeout(() => {
                            statusDiv.style.display = 'none';
                        }, 3000);
                        return; // Stop polling
                    }
                    // If status is PENDING, continue polling
                }
                
                attempts++;
                if (attempts >= maxAttempts) {
                    statusDiv.innerHTML = `<i class="fas fa-clock" style="color: #F59E0B;"></i> Generation is taking longer than expected. Check back later.`;
                    setTimeout(() => {
                        statusDiv.style.display = 'none';
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
                    statusDiv.innerHTML = `<i class="fas fa-times" style="color: #EF4444;"></i> Unable to check generation status.`;
                    setTimeout(() => {
                        statusDiv.style.display = 'none';
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
            <div>Used: ${rateLimit.used}/4 this hour</div>
            <div>Resets: ${resetTime}</div>
        `;
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 10000);
    }
    
    handleDragOver(e) {
        e.preventDefault();
        document.getElementById('uploadZone').classList.add('dragover');
    }
    
    handleDrop(e) {
        e.preventDefault();
        document.getElementById('uploadZone').classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processImageFile(files[0]);
        }
    }
    
    handleImageUpload(e) {
        const file = e.target.files[0];
        if (file) {
            this.processImageFile(file);
        }
    }
    
    processImageFile(file) {
        if (file.size > 10 * 1024 * 1024) {
            this.showCustomAlert('File too large! Please use an image under 10MB.', 'warning', 'File Size Limit');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            const imageData = e.target.result;
            await this.addUserImage(imageData, 'upload');
            
            // Show step 2 (Your Images) so user can select the uploaded image
            this.expandStep('step2');
        };
        reader.readAsDataURL(file);
    }
    
    loadImageToCanvas(imageUrl) {
        console.log('Loading image to canvas...');
        
        // Ensure canvas is initialized
        if (!this.canvas) {
            console.error('Canvas not initialized. Cannot load image.');
            return;
        }
        
        // Validate image URL
        if (!imageUrl || typeof imageUrl !== 'string') {
            console.error('Invalid image URL provided:', imageUrl);
            return;
        }
        
        // Set canvas background
        this.canvas.backgroundColor = '#ffffff';
        
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
            }
            
            // Create image element
            const testImg = new Image();
            testImg.crossOrigin = 'anonymous';
            
            testImg.onload = () => {
                try {
                    // Create Fabric image from the loaded HTML image element
                    const fabricImg = new fabric.Image(testImg);
                    
                    if (!fabricImg) {
                        console.error('Failed to create fabric image object');
                        return;
                    }
                    
                    // Scale image to fit canvas
                    const canvasWidth = this.canvas.width || 600;
                    const canvasHeight = this.canvas.height || 600;
                    
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
                    
                    // Add image to canvas
                    this.canvas.add(fabricImg);
                    
                    // Center the image
                    this.canvas.centerObject(fabricImg);
                    
                    // Set the image as active object
                    this.canvas.setActiveObject(fabricImg);
                    
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
                    
                    // Force another render after a short delay
                    setTimeout(() => {
                        this.canvas.renderAll();
                        console.log('Canvas re-rendered');
                        
                        // Check if objects are visible
                        const objects = this.canvas.getObjects();
                        if (objects.length > 0) {
                            console.log('First object:', {
                                type: objects[0].type,
                                visible: objects[0].visible,
                                opacity: objects[0].opacity,
                                left: objects[0].left,
                                top: objects[0].top
                            });
                        }
                        
                        // Deep canvas debugging
                        const canvasEl = document.getElementById('memeCanvas');
                        if (canvasEl) {
                            console.log('Canvas element details:', {
                                width: canvasEl.width,
                                height: canvasEl.height,
                                offsetWidth: canvasEl.offsetWidth,
                                offsetHeight: canvasEl.offsetHeight,
                                clientWidth: canvasEl.clientWidth,
                                clientHeight: canvasEl.clientHeight,
                                style: canvasEl.style.cssText
                            });
                            
                            // Check if there are multiple canvas elements (Fabric.js creates two)
                            const allCanvases = document.querySelectorAll('#memeCanvas, canvas');
                            console.log('Total canvas elements found:', allCanvases.length);
                            allCanvases.forEach((canvas, index) => {
                                console.log(`Canvas ${index}:`, {
                                    id: canvas.id,
                                    className: canvas.className,
                                    width: canvas.width,
                                    height: canvas.height,
                                    style: canvas.style.cssText,
                                    zIndex: getComputedStyle(canvas).zIndex
                                });
                            });
                            
                            // Check Fabric.js canvas state
                            console.log('Fabric canvas state:', {
                                width: this.canvas.width,
                                height: this.canvas.height,
                                backgroundColor: this.canvas.backgroundColor,
                                objectsCount: this.canvas.getObjects().length,
                                viewportTransform: this.canvas.viewportTransform
                            });
                            
                            // Force a complete re-render with different methods
                            console.log('Attempting multiple render methods...');
                            this.canvas.requestRenderAll();
                            this.canvas.renderAll();
                            this.canvas.calcOffset();
                            
                            // Try to trigger a repaint
                            setTimeout(() => {
                                this.canvas.clear();
                                this.canvas.add(objects[0]);
                                this.canvas.renderAll();
                                console.log('Attempted object re-add and render');
                            }, 200);
                        }
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
            
            testImg.onerror = (error) => {
                console.error('Failed to load image:', error);
                
                // Clean up blob URL if created
                if (processedImageUrl !== imageUrl) {
                    URL.revokeObjectURL(processedImageUrl);
                }
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
    
    clearAllImages() {
        const confirmed = confirm('Are you sure you want to clear all saved images? This cannot be undone.');
        if (confirmed) {
            this.userImages = [];
            localStorage.removeItem('userImages');
            this.refreshUserImagesDisplay();
            this.updateStorageInfo();
            this.showCustomAlert('All saved images have been cleared.', 'info', 'Images Cleared');
        }
    }
    
    updateStorageInfo() {
        try {
            const storageData = localStorage.getItem('userImages');
            const sizeInBytes = storageData ? storageData.length : 0;
            const sizeInKB = Math.round(sizeInBytes / 1024);
            const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(1);
            
            const storageElement = document.getElementById('storageUsage');
            if (storageElement) {
                if (sizeInKB > 1024) {
                    storageElement.textContent = `Storage: ${sizeInMB} MB`;
                } else {
                    storageElement.textContent = `Storage: ${sizeInKB} KB`;
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
        
        if (this.userImages.length === 0) {
            grid.innerHTML = `
                <div class="empty-gallery">
                    <i class="fas fa-images" style="font-size: 3rem; color: rgba(77, 162, 255, 0.3);"></i>
                    <p style="color: rgba(255,255,255,0.6); margin-top: 10px;">No images yet. Upload or generate some images first!</p>
                </div>
            `;
        } else {
            grid.innerHTML = '';
            this.userImages.forEach(image => {
                const item = document.createElement('div');
                item.className = 'recent-item';
                item.innerHTML = `
                    <img src="${image.data}" alt="User image">
                    <button class="remove-image" onclick="event.stopPropagation(); memeGenerator.removeUserImage('${image.id}')" title="Remove image">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                
                // Add click event listener to show preview modal
                item.addEventListener('click', (e) => {
                    // Prevent event if clicking on remove button
                    if (e.target.closest('.remove-image')) {
                        return;
                    }
                    this.selectUserImage(image.id);
                });
                
                grid.appendChild(item);
            });
        }
        
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
    
    selectUserImage(imageId) {
        // Find the selected image
        const selectedImage = this.userImages.find(img => img.id === imageId);
        
        if (selectedImage) {
            this.selectedUserImage = selectedImage.data;
            this.showImagePreview(selectedImage);
        } else {
            console.error('Selected image not found');
        }
    }
    
    async showImagePreview(image) {
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
        document.getElementById('previewImageElement').src = image.data;
        document.getElementById('previewImageType').textContent = `Type: ${image.type.charAt(0).toUpperCase() + image.type.slice(1)}`;
        document.getElementById('imagePreviewModal').style.display = 'flex';
        
        // Set up "Use for Meme" button
        const editBtn = document.getElementById('editImageBtn');
        editBtn.onclick = () => {
            this.proceedToEdit(image.data);
            document.getElementById('imagePreviewModal').style.display = 'none';
        };
    }
    
    proceedToEdit(imageData) {
        const imageToLoad = imageData || this.selectedUserImage;
        if (!imageToLoad) {
            this.showCustomAlert('Please select an image from your gallery first.', 'warning', 'No Image Selected');
            return;
        }
        
        this.loadImageToCanvas(imageToLoad);
        this.expandStep('step3');
    }
    
    initializeStepStates() {
        document.querySelectorAll('.generator-steps .step-container').forEach((step, index) => {
            if (index === 0) {
                step.classList.add('active');
                step.classList.remove('collapsed');
            } else {
                step.classList.add('collapsed');
                step.classList.remove('active');
            }
        });
    }
    
    expandStep(stepId) {
        document.querySelectorAll('.generator-steps .step-container').forEach(step => {
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
            activeObject.set({
                fontFamily: document.getElementById('fontFamily').value,
                fill: document.getElementById('textColor').value,
                stroke: document.getElementById('strokeColor').value
            });
            this.canvas.renderAll();
        }
    }
    
    updateFontSize(e) {
        document.getElementById('fontSizeValue').textContent = `${e.target.value}px`;
        const activeObject = this.canvas.getActiveObject();
        if (activeObject && (activeObject.type === 'textbox' || active.type === 'i-text')) {
            activeObject.set('fontSize', parseInt(e.target.value, 10));
            this.canvas.renderAll();
        }
    }
    
    updateStrokeWidth(e) {
        document.getElementById('strokeWidthValue').textContent = `${e.target.value}px`;
        const activeObject = this.canvas.getActiveObject();
        if (activeObject && (activeObject.type === 'textbox' || active.type === 'i-text')) {
            activeObject.set('strokeWidth', parseInt(e.target.value, 10));
            this.canvas.renderAll();
        }
    }
    
    updateOpacity(e) {
        document.getElementById('opacityValue').textContent = `${e.target.value}%`;
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
        document.getElementById('borderWidthValue').textContent = `${e.target.value}px`;
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
            activeObjects.forEach(obj => this.canvas.remove(obj));
            this.canvas.discardActiveObject();
            this.canvas.renderAll();
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
            this.undo();
        } else if (isCtrl && e.key.toLowerCase() === 'y') {
            this.redo();
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            this.deleteSelected();
        } else if (isCtrl && e.key.toLowerCase() === 'c') {
            this.copySelected();
        } else if (isCtrl && e.key.toLowerCase() === 'v') {
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
            document.getElementById('textInput').value = obj.text;
            document.getElementById('fontFamily').value = obj.fontFamily;
            document.getElementById('fontSize').value = obj.fontSize;
            document.getElementById('textColor').value = obj.fill;
            document.getElementById('strokeColor').value = obj.stroke;
            document.getElementById('strokeWidth').value = obj.strokeWidth;
        }
        
        document.getElementById('opacity').value = obj.opacity * 100;
        
        if (obj.type !== 'image') {
            document.getElementById('fillColor').value = obj.fill || '#ffffff';
            document.getElementById('borderColor').value = obj.stroke || '#000000';
            document.getElementById('borderWidth').value = obj.strokeWidth || 0;
        }
    }
    
    resetControls() {
        document.getElementById('textInput').value = '';
        document.getElementById('fontFamily').value = 'Impact';
        document.getElementById('fontSize').value = 40;
        document.getElementById('textColor').value = '#ffffff';
        document.getElementById('strokeColor').value = '#000000';
        document.getElementById('strokeWidth').value = 2;
        document.getElementById('opacity').value = 100;
        document.getElementById('fillColor').value = '#4DA2FF';
        document.getElementById('borderColor').value = '#ffffff';
        document.getElementById('borderWidth').value = 0;
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
            this.canvas.clear();
            this.canvas.backgroundColor = '#ffffff';
            this.canvas.renderAll();
        }
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
            
            // Send data to the server
            const response = await fetch('/api/memes/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originalImageUrl,
                    finalMemeUrl,
                    thumbnailDataUrl,
                    textElements,
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
            twitter: { icon: 'fab fa-twitter', name: 'Twitter' },
            reddit: { icon: 'fab fa-reddit-alien', name: 'Reddit' },
            facebook: { icon: 'fab fa-facebook', name: 'Facebook' },
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
    
    setupScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                }
            });
        }, observerOptions);
        
        document.querySelectorAll('.scroll-animate').forEach(el => {
            observer.observe(el);
});
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

    refreshUserImagesDisplay() {
        const grid = document.getElementById('userImagesGrid');
        if (!grid) return;

        if (this.userImages.length === 0) {
            grid.innerHTML = `
                <div class="empty-gallery">
                    <i class="fas fa-images" style="font-size: 3rem; color: rgba(77, 162, 255, 0.3);"></i>
                    <p style="color: rgba(255,255,255,0.6); margin-top: 10px;">No images yet. Upload or generate some images first!</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.userImages.map(image => `
            <div class="user-image-item" data-image-id="${image.id}" onclick="memeGenerator.selectUserImage('${image.id}')">
                <img src="${image.url}" alt="${image.name}" loading="lazy">
                <div class="image-overlay">
                    <div class="image-info">
                        <span class="image-type">${image.type}</span>
                        <span class="image-date">${new Date(image.timestamp).toLocaleDateString()}</span>
                    </div>
                    <button class="image-delete" onclick="event.stopPropagation(); memeGenerator.removeUserImage('${image.id}')" title="Delete image">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    selectUserImage(imageId) {
        const image = this.userImages.find(img => img.id === imageId);
        if (!image) return;

        this.selectedUserImage = image;
        
        // Update visual selection
        document.querySelectorAll('.user-image-item').forEach(item => {
            item.classList.remove('selected');
        });
        document.querySelector(`[data-image-id="${imageId}"]`).classList.add('selected');
        
        // Enable the "Edit Selected" button
        document.getElementById('proceedToEdit').disabled = false;
    }

    removeUserImage(imageId) {
        this.userImages = this.userImages.filter(img => img.id !== imageId);
        this.saveUserImages();
        this.refreshUserImagesDisplay();
        this.updateStorageInfo();
    }

    updateStorageInfo() {
        const storageElement = document.getElementById('storageUsage');
        if (storageElement) {
            const totalSize = this.userImages.length * 50; // Estimate 50KB per image
            storageElement.textContent = `Storage: ${totalSize} KB`;
        }
    }

    async clearAllImages() {
        const confirmed = await this.showCustomConfirm(
            'Are you sure you want to clear all your stored images? This action cannot be undone.',
            'Clear All Images'
        );
        
        if (confirmed) {
            // Clear user images from storage
            this.userImages = [];
            
            // Clear from localStorage if it exists
            if (typeof Storage !== 'undefined') {
                localStorage.removeItem('memeGenerator_userImages');
            }
            
            // Refresh the display
            if (typeof this.refreshUserImagesDisplay === 'function') {
                this.refreshUserImagesDisplay();
            }
            if (typeof this.updateStorageInfo === 'function') {
                this.updateStorageInfo();
            }
            
            await this.showCustomAlert('All images have been cleared successfully.', 'success', 'Images Cleared');
        }
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
}

// Initialize the generator once the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.memeGenerator = new AdvancedMemeGenerator();
}); 