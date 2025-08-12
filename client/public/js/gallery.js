let currentPage = 1;
let currentCategory = 'all';
let currentSort = 'newest';
let currentMemeId = null;
let currentTab = 'all'; // 'all' or 'remixable'

// Initialize gallery
document.addEventListener('DOMContentLoaded', function() {
    loadGalleryStats();
    loadGallery();
    initializeEventListeners();
});

function initializeEventListeners() {
    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentTab = this.dataset.tab;
            currentPage = 1;
            loadGallery();
        });
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentCategory = this.dataset.category;
            currentPage = 1;
            loadGallery();
        });
    });

    // Sort dropdown
    document.getElementById('sortBy').addEventListener('change', function() {
        currentSort = this.value;
        currentPage = 1;
        loadGallery();
    });

    // Search input
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchMemes();
        }
    });

    // Modal close
    document.querySelector('.modal-close').addEventListener('click', function() {
        document.getElementById('memeModal').style.display = 'none';
    });

    // Close modal on outside click
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('memeModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

async function loadGalleryStats() {
    try {
        const response = await fetch('/api/gallery/stats');
        const data = await response.json();

        if (data.success) {
            document.getElementById('totalMemes').textContent = data.stats.totalMemes.toLocaleString();
            document.getElementById('totalLikes').textContent = data.stats.totalLikes.toLocaleString();
            document.getElementById('totalShares').textContent = data.stats.totalShares.toLocaleString();
            document.getElementById('createdToday').textContent = data.stats.createdToday;
        }
    } catch (error) {
        console.error('Error loading gallery stats:', error);
    }
}

async function loadGallery() {
    const grid = document.getElementById('galleryGrid');
    grid.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><p>Loading memes...</p></div>';

    try {
        let endpoint = '/api/gallery';
        if (currentTab === 'remixable') {
            endpoint = '/api/gallery/remixable';
        }

        const params = new URLSearchParams({
            page: currentPage,
            limit: 12
        });

        if (currentTab === 'all') {
            params.append('category', currentCategory);
            params.append('sortBy', currentSort);
        } else {
            params.append('sortBy', currentSort);
        }

        const response = await fetch(`${endpoint}?${params}`);
        const data = await response.json();

        if (data.success) {
            displayMemes(data.memes || data.images);
            displayPagination(data.pagination);
        } else {
            grid.innerHTML = '<div class="loading"><p>Failed to load memes</p></div>';
        }
    } catch (error) {
        console.error('Error loading gallery:', error);
        grid.innerHTML = '<div class="loading"><p>Error loading memes</p></div>';
    }
}

function displayMemes(memes) {
    const grid = document.getElementById('galleryGrid');
    
    if (memes.length === 0) {
        grid.innerHTML = '<div class="loading"><p>No memes found. Be the first to create one!</p></div>';
        return;
    }

    grid.innerHTML = memes.map(meme => {
        const isOriginal = meme.isRemixable && (meme.generationType === 'ai' || meme.generationType === 'upload');
        const isRemix = meme.generationType === 'remix';
        const badge = isOriginal ? '<div class="original-badge">Original</div>' : 
                     isRemix ? '<div class="remix-badge">Remix</div>' : '';
        
        const title = getTitleFromTextElements(meme.textElements) || 
                     (meme.aiPrompt ? meme.aiPrompt.substring(0, 30) + '...' : 'Untitled Meme');

        const metaInfo = isOriginal ? 
            `${meme.generationType.toUpperCase()} • Remixed ${meme.timesRemixed || 0} times` :
            `${meme.generationType.toUpperCase()} • ${formatDate(meme.createdAt)}`;

        const useOriginalBtn = isOriginal ? 
            `<a href="/meme-generator?remix=${meme.id}" class="action-btn remix-btn">
                <i class="fas fa-paint-brush"></i> Use Original
            </a>` : '';

        // Use thumbnail, fallback to finalMemeUrl, then to a placeholder
        const imageUrl = meme.thumbnail || meme.finalMemeUrl || '/images/placeholder-meme.jpg';
        
        return `
            <div class="meme-card" onclick="openMemeModal('${meme.id}')">
                <img src="${imageUrl}" alt="Meme" class="meme-image" loading="lazy" onerror="this.src='/images/placeholder-meme.jpg'; this.onerror=null;">
                <div class="meme-info">
                    ${badge}
                    <div class="meme-title">${title}</div>
                    <div class="meme-meta">${metaInfo}</div>
                    <div class="meme-stats">
                        <span><i class="fas fa-heart"></i> ${meme.likes || 0}</span>
                        <span><i class="fas fa-share"></i> ${meme.shareCount || 0}</span>
                        <span><i class="fas fa-eye"></i> ${meme.views || 0}</span>
                    </div>
                    <div class="meme-actions" onclick="event.stopPropagation()">
                        <div class="action-btn" onclick="likeMeme('${meme.id}')">
                            <i class="fas fa-heart"></i> Like
                        </div>
                        ${useOriginalBtn}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function displayPagination(pagination) {
    const paginationDiv = document.getElementById('pagination');
    
    if (pagination.totalPages <= 1) {
        paginationDiv.style.display = 'none';
        return;
    }

    paginationDiv.style.display = 'flex';
    
    let paginationHTML = '';
    
    // Previous button
    if (pagination.hasPrev) {
        paginationHTML += `<div class="page-btn" onclick="changePage(${pagination.currentPage - 1})">Previous</div>`;
    }
    
    // Page numbers
    for (let i = Math.max(1, pagination.currentPage - 2); i <= Math.min(pagination.totalPages, pagination.currentPage + 2); i++) {
        paginationHTML += `<div class="page-btn ${i === pagination.currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</div>`;
    }
    
    // Next button
    if (pagination.hasNext) {
        paginationHTML += `<div class="page-btn" onclick="changePage(${pagination.currentPage + 1})">Next</div>`;
    }
    
    paginationDiv.innerHTML = paginationHTML;
}

function changePage(page) {
    currentPage = page;
    loadGallery();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function openMemeModal(memeId) {
    try {
        const response = await fetch(`/api/memes/${memeId}`);
        const data = await response.json();

        if (data.success) {
            const meme = data.meme;
            currentMemeId = memeId;

            document.getElementById('modalTitle').textContent = getTitleFromTextElements(meme.textElements) || 'Untitled Meme';
            document.getElementById('modalImage').src = meme.finalMemeUrl;
            document.getElementById('modalLikes').textContent = meme.likes || 0;
            document.getElementById('modalShares').textContent = meme.shareCount || 0;
            document.getElementById('modalViews').textContent = meme.views || 0;

            // Show/hide remix button based on if it's an original image
            const remixButton = document.getElementById('remixButton');
            if (meme.isRemixable && (meme.generationType === 'ai' || meme.generationType === 'upload')) {
                remixButton.style.display = 'block';
                remixButton.onclick = () => useOriginalImage(memeId);
            } else {
                remixButton.style.display = 'none';
            }

            // Increment view count
            fetch(`/api/memes/${memeId}/view`, { method: 'POST' });

            document.getElementById('memeModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading meme details:', error);
    }
}

async function likeMeme(memeId) {
    try {
        const response = await fetch(`/api/memes/${memeId}/like`, { method: 'PUT' });
        const data = await response.json();
        
        if (data.success) {
            // Update UI
            const likeElements = document.querySelectorAll(`[onclick*="${memeId}"]`);
            likeElements.forEach(el => {
                const likeSpan = el.closest('.meme-card, .modal-body').querySelector('.fas.fa-heart').parentNode;
                if (likeSpan) likeSpan.innerHTML = `<i class="fas fa-heart"></i> ${data.likes}`;
            });
            
            // Update modal if open
            if (currentMemeId === memeId) {
                document.getElementById('modalLikes').textContent = data.likes;
            }
        }
    } catch (error) {
        console.error('Error liking meme:', error);
    }
}

function useOriginalImage(memeId) {
    // Redirect to meme generator with the original image
    window.location.href = `/meme-generator?remix=${memeId}`;
}

async function shareMeme(memeId) {
    try {
        const response = await fetch(`/api/social/share`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                memeId: memeId,
                platform: 'twitter',
                text: 'Check out this hilarious AQUA meme!'
            })
        });

        const data = await response.json();
        if (data.success && data.shareUrl) {
            window.open(data.shareUrl, '_blank');
        }
    } catch (error) {
        console.error('Error sharing meme:', error);
    }
}

async function searchMemes() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) {
        loadGallery();
        return;
    }

    const grid = document.getElementById('galleryGrid');
    grid.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i><p>Searching...</p></div>';

    try {
        const response = await fetch('/api/gallery/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: query,
                category: currentCategory,
                page: 1,
                limit: 12
            })
        });

        const data = await response.json();
        if (data.success) {
            displayMemes(data.memes);
            displayPagination(data.pagination);
        } else {
            grid.innerHTML = '<div class="loading"><p>Search failed</p></div>';
        }
    } catch (error) {
        console.error('Error searching:', error);
        grid.innerHTML = '<div class="loading"><p>Search error</p></div>';
    }
}

function getTitleFromTextElements(textElements) {
    if (!textElements || textElements.length === 0) return null;
    return textElements[0].text.substring(0, 40) + (textElements[0].text.length > 40 ? '...' : '');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

// Initialize scroll animations
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