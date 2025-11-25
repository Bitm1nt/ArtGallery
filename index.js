// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAgq9nILlMXcmfjJGXyu9VgxRc0rBB8M2A",
    authDomain: "art-gallery-website-4b646.firebaseapp.com",
    databaseURL: "https://art-gallery-website-4b646-default-rtdb.firebaseio.com",
    projectId: "art-gallery-website-4b646",
    storageBucket: "art-gallery-website-4b646.firebasestorage.app",
    messagingSenderId: "467391852619",
    appId: "1:467391852619:web:9e4d6612bf2402c9adddce"
};

// Initialize Firebase
let database;
let firebaseInitialized = false;

try {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    firebaseInitialized = true;
} catch (error) {
    console.error("Firebase initialization error:", error);
    firebaseInitialized = false;
}

// Generate a unique fingerprint for the user
function generateUserFingerprint() {
    const components = [
        navigator.userAgent,
        navigator.language,
        navigator.hardwareConcurrency || 'unknown',
        screen.colorDepth,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        !!navigator.cookieEnabled,
        !!navigator.javaEnabled(),
        navigator.platform
    ].join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < components.length; i++) {
        const char = components.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    return 'user_' + Math.abs(hash).toString(36);
}

// Check if user has already downloaded this artwork
function hasUserDownloaded(artworkTitle) {
    const fingerprint = generateUserFingerprint();
    const userDownloads = JSON.parse(localStorage.getItem('userDownloads') || '{}');
    
    // Check both fingerprint and localStorage as fallback
    return userDownloads[artworkTitle] === fingerprint || 
           localStorage.getItem(`downloaded_${artworkTitle}`) === 'true';
}

// Mark artwork as downloaded by this user
function markAsDownloaded(artworkTitle) {
    const fingerprint = generateUserFingerprint();
    const userDownloads = JSON.parse(localStorage.getItem('userDownloads') || '{}');
    
    userDownloads[artworkTitle] = fingerprint;
    localStorage.setItem('userDownloads', JSON.stringify(userDownloads));
    localStorage.setItem(`downloaded_${artworkTitle}`, 'true');
}

// Clear all user download records (called when gallery is reset)
function clearUserDownloads() {
    localStorage.removeItem('userDownloads');
    // Clear individual artwork flags
    const artworks = [
        'Bloom Eye', 'Become a Challenge', 'Disposable', 'Approval', 'ECig', 'Adol',
        'Address', 'Am I', 'Broken Screen', 'Empty', 'Filled', 'For Profit',
        'Fri B', 'Fri S', 'Hate', 'Rejected View', 'Unpalatable', 'Unsatisfied Fem',
        'Urinal', 'Wet', 'adol 2', 'Another Screen', 'Blame', 'Body n Smoke', 'Cost Blame',
        'Edit Screen', 'Eyes', 'Gun Fear', 'Library Vape', 'Locker 1', 'Locker 2', 
        'Locker 3', 'Memories', 'next', 'Process Plaster Ink', 'Process', 'Public', 
        'Refuse and Dance', 'To Anon', 'Turn It Off'
    ];
    
    artworks.forEach(artwork => {
        localStorage.removeItem(`downloaded_${artwork}`);
    });
}

// Check gallery reset
function checkGalleryReset() {
    if (!database || !firebaseInitialized) return;
    
    database.ref('galleryReset').on('value', (snapshot) => {
        const resetData = snapshot.val();
        if (resetData && resetData.resetTime) {
            // Gallery was reset - clear local download records
            clearUserDownloads();
            console.log('Gallery reset detected - user download records cleared');
            
            // Remove the reset flag to avoid repeated clearing
            database.ref('galleryReset').remove().catch(error => {
                console.error('Error removing reset flag:', error);
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('meteor-container');
    const meteorCount = 20;
    
    // Global variable to store current configuration
    let currentConfig = null;
    let visitorTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let currentArtData = null; // Store current art data for download

    // Art Modal functionality with screenshot protection
    function initializeArtModal() {
        const modal = document.getElementById('art-modal');
        const closeBtn = document.querySelector('.art-modal-close');
        const closeBtnFooter = document.querySelector('.close-btn');
        const downloadBtn = document.getElementById('download-art');
        const artBoxes = document.querySelectorAll('.art-box');

        // Enhanced protection functions
        function enableImageProtection() {
            // Add protection overlay
            const overlay = document.createElement('div');
            overlay.className = 'image-protection-overlay';
            document.querySelector('.art-modal-body').appendChild(overlay);
            
            // Add CSS class to body when modal is open
            document.body.classList.add('art-modal-open');
            
            // Disable text selection in modal
            modal.style.userSelect = 'none';
            modal.style.webkitUserSelect = 'none';
            modal.style.mozUserSelect = 'none';
            modal.style.msUserSelect = 'none';
        }

        function disableImageProtection() {
            // Remove protection overlay
            const overlay = document.querySelector('.image-protection-overlay');
            if (overlay) {
                overlay.remove();
            }
            
            // Remove CSS class from body
            document.body.classList.remove('art-modal-open');
            
            // Re-enable text selection
            modal.style.userSelect = '';
            modal.style.webkitUserSelect = '';
            modal.style.mozUserSelect = '';
            modal.style.msUserSelect = '';
        }

        // Open modal when art box is clicked
        artBoxes.forEach(box => {
            box.addEventListener('click', function() {
                const artTitle = this.getAttribute('data-art');
                const artDate = this.getAttribute('data-date');
                const artImage = this.getAttribute('data-image');
                
                document.getElementById('modal-art-title').textContent = artTitle;
                document.getElementById('modal-art-date').textContent = artDate;
                document.getElementById('modal-art-image').src = artImage;
                document.getElementById('modal-art-image').alt = artTitle;
                
                // Set current art data
                currentArtData = {
                    title: artTitle,
                    image: artImage,
                    date: artDate
                };
                
                // Load download statistics and update quality display
                loadDownloadStats(artTitle);
                
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
                
                // Enable protection when modal opens
                enableImageProtection();
                
                console.log('Art modal opened with protection enabled');
            });
        });

        // Close modal functions
        function closeModal() {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            currentArtData = null;
            
            // Disable protection when modal closes
            disableImageProtection();
        }

        closeBtn.addEventListener('click', closeModal);
        closeBtnFooter.addEventListener('click', closeModal);

        // Close modal when clicking outside
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                closeModal();
            }
        });

        // Set up download button with loading animation
        downloadBtn.addEventListener('click', function() {
            if (currentArtData) {
                // Check if user has already downloaded
                if (hasUserDownloaded(currentArtData.title)) {
                    showAlreadyDownloadedMessage(currentArtData.title);
                    return;
                }
                
                startDownloadAnimation();
                setTimeout(() => {
                    downloadArtwork(currentArtData.image, currentArtData.title);
                }, 2000); // 2 second delay to show animation
            }
        });

        // Start dev tools detection when modal system is initialized
    }

    // Start download button animation
    function startDownloadAnimation() {
        const downloadBtn = document.getElementById('download-art');
        const originalText = downloadBtn.innerHTML;
        let dots = 0;
        
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = 'Downloading';
        
        const interval = setInterval(() => {
            dots = (dots + 1) % 4;
            downloadBtn.innerHTML = 'Downloading' + '.'.repeat(dots);
        }, 500);
        
        // Store interval ID to clear later
        downloadBtn.dataset.intervalId = interval;
    }

    // Stop download button animation
    function stopDownloadAnimation() {
        const downloadBtn = document.getElementById('download-art');
        const intervalId = downloadBtn.dataset.intervalId;
        
        if (intervalId) {
            clearInterval(intervalId);
            downloadBtn.removeAttribute('data-interval-id');
        }
        
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = '📥 Download Artwork';
    }

    function loadDownloadStats(artTitle) {
        if (!database || !firebaseInitialized) {
            console.log('Firebase not available for loading download stats');
            // Set default values when Firebase is not available
            updateQualityDisplay(0, 100, 'premium');
            updateDownloadButtonStatus(artTitle);
            return;
        }
        
        const statsRef = database.ref('downloadStats/' + encodeArtTitle(artTitle));
        statsRef.once('value').then((snapshot) => {
            const stats = snapshot.val();
            const downloadCount = stats ? stats.downloadCount || 0 : 0;
            const quality = calculateQuality(downloadCount); // This shows current quality for NEXT download
            const qualityTier = getQualityTier(quality);
            
            // Update display with enhanced styling
            updateQualityDisplay(downloadCount, quality, qualityTier);
            updateDownloadButtonStatus(artTitle);
            
        }).catch((error) => {
            console.error('Error loading download stats:', error);
            // Fallback display
            updateQualityDisplay(0, 100, 'premium');
            updateDownloadButtonStatus(artTitle);
        });
    }

    // Update download button status based on whether user has downloaded
    function updateDownloadButtonStatus(artTitle) {
        const downloadBtn = document.getElementById('download-art');
        if (!downloadBtn) return;
        
        if (hasUserDownloaded(artTitle)) {
            downloadBtn.disabled = true;
            downloadBtn.classList.add('download-disabled');
            downloadBtn.innerHTML = '✅ Already Downloaded';
            
            // Add indicator in the quality info
            let indicator = document.getElementById('already-downloaded-indicator');
            if (!indicator) {
                indicator = document.createElement('span');
                indicator.id = 'already-downloaded-indicator';
                indicator.className = 'already-downloaded-indicator';
                indicator.textContent = '';
                
                const qualityText = document.querySelector('.quality-text');
                if (qualityText) {
                    qualityText.appendChild(indicator);
                }
            }
        } else {
            downloadBtn.disabled = false;
            downloadBtn.classList.remove('download-disabled');
            downloadBtn.innerHTML = '📥 Download Artwork';
            
            // Remove indicator if exists
            const indicator = document.getElementById('already-downloaded-indicator');
            if (indicator) {
                indicator.remove();
            }
        }
    }

    // Update quality display with enhanced styling
    function updateQualityDisplay(downloadCount, quality, qualityTier) {
        const downloadValue = document.getElementById('download-value');
        const qualityValue = document.getElementById('quality-value');
        const currentQuality = document.getElementById('current-quality');
        const nextDrop = document.getElementById('next-drop');
        const qualityProgress = document.querySelector('.quality-progress-bar');
        
        if (downloadValue) downloadValue.textContent = downloadCount;
        if (qualityValue) {
            qualityValue.textContent = quality + '%';
            qualityValue.className = '';
            qualityValue.classList.add(`quality-${qualityTier}`);
            
            // Add pulse animation for low quality
            if (qualityTier === 'low') {
                qualityValue.classList.add('quality-pulse');
            } else {
                qualityValue.classList.remove('quality-pulse');
            }
        }
        
        if (currentQuality) {
            currentQuality.textContent = quality + '%';
        }
        
        // Show revival note when quality is 5% or less
        const qualityNote = document.querySelector('.quality-note');
        if (qualityNote) {
            if (quality <= 5) {
                qualityNote.innerHTML = '⚠️ Quality has reached minimum level.<br>You Can Still Download The Art. <br>Waiting for artist revival to restore quality.';
                qualityNote.style.color = '#ff6b6b';
            } else {
                qualityNote.innerHTML = '⚠️ Quality decreases by 5% every download.<br>Early downloads get the highest quality versions!';
                qualityNote.style.color = '#ff9800';
            }
        }
        
        // Update progress bar
        if (qualityProgress) {
            qualityProgress.style.width = quality + '%';
            qualityProgress.className = 'quality-progress-bar';
            if (qualityTier === 'medium') qualityProgress.classList.add('medium');
            if (qualityTier === 'low') qualityProgress.classList.add('low');
        }
        
        // Update tier badge
        updateQualityTierBadge(qualityTier);
    }

    // Update quality tier badge
    function updateQualityTierBadge(tier) {
        let tierElement = document.getElementById('quality-tier');
        if (!tierElement) {
            tierElement = document.createElement('span');
            tierElement.id = 'quality-tier';
            tierElement.className = 'quality-tier';
            const qualityText = document.querySelector('.quality-text');
            if (qualityText) {
                qualityText.appendChild(tierElement);
            }
        }
        
        tierElement.className = `quality-tier tier-${tier}`;
        
        const tierNames = {
            'premium': 'PREMIUM QUALITY',
            'medium': 'STANDARD QUALITY', 
            'low': 'BASIC QUALITY'
        };
        
        tierElement.textContent = tierNames[tier] || 'UNKNOWN';
    }

    // Encode art title for Firebase key
    function encodeArtTitle(title) {
        return title.replace(/[.#$\/\[\]]/g, '_');
    }

    // Calculate quality based on download count - UPDATED: 5% per download
    function calculateQuality(downloadCount) {
        // First download is 100%, then decreases by 5% each subsequent download
        // downloadCount represents previous downloads, so for the first download (count=0) we want 100%
        const quality = Math.max(5, 100 - (downloadCount * 5));
        return quality;
    }

    // Get quality tier based on percentage
    function getQualityTier(quality) {
        if (quality >= 80) return 'premium';
        if (quality >= 50) return 'medium';
        return 'low';
    }

    function downloadArtwork(imageUrl, title) {
        if (!currentArtData) return;
        
        // Get current download stats
        const encodedTitle = encodeArtTitle(title);
        
        let downloadPromise;
        
        if (database && firebaseInitialized) {
            const statsRef = database.ref('downloadStats/' + encodedTitle);
            downloadPromise = statsRef.once('value').then((snapshot) => {
                const stats = snapshot.val() || { downloadCount: 0 };
                const currentDownloadCount = stats.downloadCount;
                
                // Calculate quality BEFORE incrementing download count
                const quality = calculateQuality(currentDownloadCount);
                
                const newDownloadCount = currentDownloadCount + 1;
                
                // Update download count in Firebase
                return statsRef.set({
                    downloadCount: newDownloadCount,
                    lastDownloaded: new Date().toISOString(),
                    totalDownloads: (stats.totalDownloads || 0) + 1
                }).then(() => {
                    return { quality: quality, downloadCount: newDownloadCount };
                });
            }).catch((error) => {
                console.error('Error updating download stats:', error);
                return { quality: 100, downloadCount: 1 };
            });
        } else {
            // Firebase not available, use local storage as fallback
            const localKey = 'downloadStats_' + encodedTitle;
            const localStats = JSON.parse(localStorage.getItem(localKey) || '{"downloadCount":0}');
            const currentDownloadCount = localStats.downloadCount;
            const quality = calculateQuality(currentDownloadCount);
            const newDownloadCount = currentDownloadCount + 1;
            localStats.downloadCount = newDownloadCount;
            localStats.lastDownloaded = new Date().toISOString();
            localStorage.setItem(localKey, JSON.stringify(localStats));
            downloadPromise = Promise.resolve({ quality: quality, downloadCount: newDownloadCount });
        }
        
        downloadPromise.then((result) => {
            const quality = result.quality;
            const downloadCount = result.downloadCount;
            const qualityTier = getQualityTier(quality);
            
            // Mark as downloaded for this user
            markAsDownloaded(title);
            
            // Check if it's a GIF (no quality reduction for GIFs)
            if (imageUrl.toLowerCase().endsWith('.gif')) {
                // For GIFs, download the original file without quality reduction
                const link = document.createElement('a');
                link.href = imageUrl;
                link.download = `${title.replace(/\s+/g, '_')}.gif`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Update display immediately
                updateQualityDisplay(downloadCount, quality, qualityTier);
                
                // Stop download animation
                stopDownloadAnimation();
                
                showDownloadConfirmation(title, quality, qualityTier, downloadCount);
                
                // Track download in analytics if Firebase is available
                if (database && firebaseInitialized) {
                    trackDownloadAnalytics(title, quality, downloadCount);
                }
                return;
            }
            
            // For non-GIF images, apply quality reduction
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate new dimensions based on quality
                const scale = quality / 100;
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                
                // Draw image with reduced quality
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Convert to blob with reduced quality
                canvas.toBlob(function(blob) {
                    // Create download link
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${title.replace(/\s+/g, '_')}_${quality}%_quality.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    // Clean up URL
                    setTimeout(() => URL.revokeObjectURL(url), 100);
                    
                    // Update display immediately
                    updateQualityDisplay(downloadCount, quality, qualityTier);
                    
                    // Stop download animation
                    stopDownloadAnimation();
                    
                    // Show download confirmation with donation links
                    showDownloadConfirmation(title, quality, qualityTier, downloadCount);
                    
                    // Track download in analytics if Firebase is available
                    if (database && firebaseInitialized) {
                        trackDownloadAnalytics(title, quality, downloadCount);
                    }
                    
                }, 'image/png', 0.9);
            };
            img.onerror = function() {
                // Fallback to original download if canvas manipulation fails
                const link = document.createElement('a');
                link.href = imageUrl;
                link.download = `${title.replace(/\s+/g, '_')}_${quality}%_quality.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Update display immediately
                updateQualityDisplay(downloadCount, quality, qualityTier);
                
                // Stop download animation
                stopDownloadAnimation();
                
                showDownloadConfirmation(title, quality, qualityTier, downloadCount);
                
                if (database && firebaseInitialized) {
                    trackDownloadAnalytics(title, quality, downloadCount);
                }
            };
            img.src = imageUrl;
            
            // ADDED: Refresh stats from Firebase to ensure real-time sync
            if (database && firebaseInitialized) {
                setTimeout(() => {
                    loadDownloadStats(title);
                }, 1000);
            }
        }).catch((error) => {
            console.error('Error in download process:', error);
            // Final fallback - simple download
            const link = document.createElement('a');
            link.href = imageUrl;
            link.download = `${title.replace(/\s+/g, '_')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Mark as downloaded for this user
            markAsDownloaded(title);
            
            // Stop download animation
            stopDownloadAnimation();
            
            showDownloadConfirmation(title, 100, 'premium', 1);
        });
    }

    // Track download analytics
    function trackDownloadAnalytics(title, quality, downloadCount) {
        if (!database || !firebaseInitialized) return;
        
        const analyticsRef = database.ref('downloadAnalytics').push();
        analyticsRef.set({
            artwork: title,
            quality: quality,
            downloadCount: downloadCount,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            language: navigator.language
        }).catch(error => {
            console.error('Error tracking analytics:', error);
        });
    }

    // Show message when user tries to download same artwork again
    function showAlreadyDownloadedMessage(title) {
        const alertOverlay = document.createElement('div');
        alertOverlay.className = 'art-alert-overlay download-confirmation-overlay';
        alertOverlay.innerHTML = `
            <div class="art-alert mobile-optimized">
                <div class="art-alert-header">
                    <h3>Already Downloaded</h3>
                    <span class="art-alert-close">&times;</span>
                </div>
                <div class="art-alert-body">
                    <p>You have already downloaded "<strong>${title}</strong>".</p>
                    <p style="margin-top: 15px; color: #ccc; font-size: 14px;">
                        Each artwork can only be downloaded once per gallery session. 
                        The gallery must be reset by the artist for new downloads.
                    </p>
                </div>
                <div class="art-alert-footer">
                    <button class="art-alert-button">OK</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(alertOverlay);
        
        // Store the current scroll position
        const scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        
        // Add event listeners
        const closeBtn = alertOverlay.querySelector('.art-alert-close');
        const okBtn = alertOverlay.querySelector('.art-alert-button');
        
        const closeAlert = () => {
            // Restore scroll position
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            window.scrollTo(0, parseInt(scrollY || '0') * -1);
            
            alertOverlay.remove();
        };
        
        closeBtn.addEventListener('click', closeAlert);
        okBtn.addEventListener('click', closeAlert);
        alertOverlay.addEventListener('click', (e) => {
            if (e.target === alertOverlay) closeAlert();
        });
        
        // Close with Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeAlert();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    // Show enhanced download confirmation with donation links and proper logos
    function showDownloadConfirmation(title, quality, qualityTier, downloadCount) {
        // Create custom confirmation with donation links
        const confirmationOverlay = document.createElement('div');
        confirmationOverlay.className = 'art-alert-overlay download-confirmation-overlay';
        confirmationOverlay.innerHTML = `
            <div class="art-alert download-complete-modal mobile-optimized">
                <div class="art-alert-header download-complete-header">
                    <h3>🎨 Download Complete!</h3>
                    <span class="art-alert-close download-complete-close">&times;</span>
                </div>
                <div class="art-alert-body download-complete-body">
                    <p class="download-artwork-title">"${title}"</p>
                    <div class="download-stats-container">
                        <div class="download-stat-row">
                            <span class="download-stat-label">Quality:</span>
                            <span class="download-stat-value quality-stat-value quality-${qualityTier}">${quality}%</span>
                        </div>
                        <div class="download-stat-row">
                            <span class="download-stat-label">Total Downloads:</span>
                            <span class="download-stat-value" style="color: #4caf50;">${downloadCount}</span>
                        </div>
                    </div>
                    
                    <div class="support-artist-section">
                        <h4 class="support-artist-title">💝 Support the Artist</h4>
                        <p style="color: #ccc; margin-bottom: 20px; font-size: 14px;">Thank you for your support! Your contribution helps create more amazing artwork.</p>
                        
                        <div class="donation-platforms">
                            <div class="donation-platform" onclick="showZelleQR()">
                                <div class="platform-icon">💜</div>
                                <div class="platform-name">Zelle</div>
                                <div class="platform-username">QR Code Only</div>
                                <div style="font-size: 10px; color: #888; margin-top: 5px;">(Tap to view QR)</div>
                            </div>
                            <div class="donation-platform" onclick="copyToClipboard('Devil0fish', 'Venmo')">
                                <div class="platform-icon">💙</div>
                                <div class="platform-name">Venmo</div>
                                <div class="platform-username">@Devil0fish</div>
                                <div style="font-size: 10px; color: #888; margin-top: 5px;">(Tap to copy)</div>
                            </div>
                            <div class="donation-platform" onclick="copyToClipboard('$devil0fish', 'Cash App')">
                                <div class="platform-icon">💚</div>
                                <div class="platform-name">Cash App</div>
                                <div class="platform-username">$devil0fish</div>
                                <div style="font-size: 10px; color: #888; margin-top: 5px;">(Tap to copy)</div>
                            </div>
                            <div class="donation-platform" onclick="window.open('https://www.instagram.com/teeth.grind?igsh=MTNvMW9yMHgxaTVxMQ%3D%3D&utm_source=qr', '_blank')">
                                <div class="platform-icon">📷</div>
                                <div class="platform-name">Instagram</div>
                                <div class="platform-username">@teeth.grind</div>
                                <div style="font-size: 10px; color: #888; margin-top: 5px;">(Tap to follow)</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="art-alert-footer download-complete-footer">
                    <button class="art-alert-button continue-button">Continue Browsing</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(confirmationOverlay);
        
        // Store the current scroll position
        const scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        
        // Add event listeners
        const closeBtn = confirmationOverlay.querySelector('.download-complete-close');
        const okBtn = confirmationOverlay.querySelector('.continue-button');
        
        const closeAlert = () => {
            // Restore scroll position
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            window.scrollTo(0, parseInt(scrollY || '0') * -1);
            
            confirmationOverlay.remove();
        };
        
        closeBtn.addEventListener('click', closeAlert);
        okBtn.addEventListener('click', closeAlert);
        confirmationOverlay.addEventListener('click', (e) => {
            if (e.target === confirmationOverlay) closeAlert();
        });
        
        // Close with Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeAlert();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // Clean up event listener when modal closes
        confirmationOverlay.addEventListener('click', (e) => {
            if (e.target === confirmationOverlay) {
                document.removeEventListener('keydown', handleEscape);
            }
        });
    }

    // Show Zelle QR code modal
    window.showZelleQR = function() {
        const qrOverlay = document.createElement('div');
        qrOverlay.className = 'art-alert-overlay download-confirmation-overlay';
        qrOverlay.innerHTML = `
            <div class="art-alert mobile-optimized" style="max-width: 300px;">
                <div class="art-alert-header">
                    <h3>Zelle QR Code</h3>
                    <span class="art-alert-close">&times;</span>
                </div>
                <div class="art-alert-body" style="text-align: center;">
                    <p style="color: #ccc; margin-bottom: 20px;">Scan with your banking app to send via Zelle</p>
                    <div style="background: white; padding: 20px; border-radius: 12px; display: inline-block;">
                        <div style="width: 200px; height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
                            <img src="images/qr.png" style="width:250px; height:auto;"></img>
                        </div>
                    </div>
                    <p style="color: #888; font-size: 12px; margin-top: 15px;">Use your banking app's Zelle feature to scan this code</p>
                </div>
                <div class="art-alert-footer">
                    <button class="art-alert-button">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(qrOverlay);
        
        // Store the current scroll position
        const scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        
        // Add event listeners
        const closeBtn = qrOverlay.querySelector('.art-alert-close');
        const okBtn = qrOverlay.querySelector('.art-alert-button');
        
        const closeAlert = () => {
            // Restore scroll position
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            window.scrollTo(0, parseInt(scrollY || '0') * -1);
            
            qrOverlay.remove();
        };
        
        closeBtn.addEventListener('click', closeAlert);
        okBtn.addEventListener('click', closeAlert);
        qrOverlay.addEventListener('click', (e) => {
            if (e.target === qrOverlay) closeAlert();
        });
    };

    // Copy to clipboard function
    window.copyToClipboard = function(text, platform) {
        navigator.clipboard.writeText(text).then(() => {
            // Show copy notification
            const notification = document.createElement('div');
            notification.className = 'copy-notification';
            notification.textContent = `${platform} info copied to clipboard!`;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            const notification = document.createElement('div');
            notification.className = 'copy-notification';
            notification.textContent = `${platform} info copied to clipboard!`;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 3000);
        });
    };

    // Load configuration from Firebase with real-time updates
    function loadArtConfig() {
        if (!database || !firebaseInitialized) {
            console.log('Firebase not available for loading art config');
            // Use default config when Firebase is not available
            currentConfig = {
                START_DATE: null,
                END_DATE: null,
                IS_VISIBLE: true, // Default to visible when Firebase fails
                MANUAL_CONTROL: false
            };
            initializeArtSection();
            return;
        }
        
        database.ref('artConfig').on('value', (snapshot) => {
            const config = snapshot.val();
            currentConfig = config;
            
            if (config) {
                initializeArtSection();
            } else {
                // No config found - set default
                const defaultConfig = {
                    START_DATE: null,
                    END_DATE: null,
                    IS_VISIBLE: false,
                    MANUAL_CONTROL: false,
                    lastUpdated: new Date().toISOString()
                };
                database.ref('artConfig').set(defaultConfig).catch(error => {
                    console.error('Error setting default config:', error);
                });
            }
        }, (error) => {
            console.error('Error loading art config:', error);
            // Fallback to default config
            currentConfig = {
                START_DATE: null,
                END_DATE: null,
                IS_VISIBLE: true, // Default to visible when Firebase fails
                MANUAL_CONTROL: false
            };
            initializeArtSection();
        });
    }

    // Convert date string to local date (handles date-only format)
    function convertToLocalTime(dateString) {
        if (!dateString) return null;
        // If it's already a full datetime, use as is, otherwise treat as date-only
        if (dateString.includes('T')) {
            return new Date(dateString);
        } else {
            // For date-only strings, set to start of day in local timezone
            return new Date(dateString + 'T00:00:00');
        }
    }

    // Check if art should be available (using visitor's local time)
    function isArtAvailable() {
        if (!currentConfig) return true; // Default to available if no config
        
        if (currentConfig.MANUAL_CONTROL) {
            return currentConfig.IS_VISIBLE;
        }
        
        if (!currentConfig.IS_VISIBLE) return false;
        
        const now = new Date(); // Visitor's local time
        const startDate = currentConfig.START_DATE ? convertToLocalTime(currentConfig.START_DATE) : null;
        const endDate = currentConfig.END_DATE ? convertToLocalTime(currentConfig.END_DATE) : null;
        
        // If no dates set and manual control is off, use IS_VISIBLE flag
        if (!startDate && !endDate) {
            return currentConfig.IS_VISIBLE;
        }
        
        // Check timeframe using visitor's local time
        if (startDate && now < startDate) return false;
        if (endDate && now > endDate) return false;
        
        return true;
    }

    // Format date for display in visitor's timezone - UPDATED: Date only
    function formatDisplayDate(dateString) {
        if (!dateString) return '';
        try {
            const date = convertToLocalTime(dateString);
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric'
            });
        } catch (error) {
            return 'Invalid Date';
        }
    }

    // Update availability text - MODIFIED: Show both start and end dates
    function updateAvailabilityText() {
        if (!currentConfig) {
            const availabilityText = document.querySelector('.hero .under.semibold');
            if (availabilityText) {
                availabilityText.innerHTML = 'Exclusive Art Pieces From Me';
                availabilityText.style.color = '#4caf50';
            }
            return;
        }
        
        const now = new Date();
        const startDate = currentConfig.START_DATE ? convertToLocalTime(currentConfig.START_DATE) : null;
        const endDate = currentConfig.END_DATE ? convertToLocalTime(currentConfig.END_DATE) : null;
        const availabilityText = document.querySelector('.hero .under.semibold');
        
        if (!availabilityText) return;

        if (currentConfig.MANUAL_CONTROL) {
            availabilityText.innerHTML = currentConfig.IS_VISIBLE ? 
                'Gallery is currently active' : 
                'Gallery is currently not available';
            availabilityText.className = 'under semibold ' + (currentConfig.IS_VISIBLE ? 'status-active' : 'status-unavailable');
        } else if (!currentConfig.IS_VISIBLE) {
            availabilityText.innerHTML = 'My gallery is currently unavailable. Check back soon!';
            availabilityText.className = 'under semibold status-unavailable';
        } else if (startDate && now < startDate) {
            // Art hasn't started yet - show both dates
            if (endDate) {
                availabilityText.innerHTML = `Coming Soon! Exhibition: ${formatDisplayDate(currentConfig.START_DATE)} - ${formatDisplayDate(currentConfig.END_DATE)}`;
            } else {
                availabilityText.innerHTML = `Coming Soon! Starting ${formatDisplayDate(currentConfig.START_DATE)}`;
            }
            availabilityText.className = 'under semibold status-upcoming';
        } else if (endDate && now > endDate) {
            // Art has ended
            availabilityText.innerHTML = 'My gallery is currently unavailable. Check back soon!';
            availabilityText.className = 'under semibold status-ended';
        } else {
            // Art is currently available
            if (startDate && endDate) {
                availabilityText.innerHTML = `Exclusive Art Pieces From Me - Exhibition: ${formatDisplayDate(currentConfig.START_DATE)} - ${formatDisplayDate(currentConfig.END_DATE)}`;
            } else if (endDate) {
                availabilityText.innerHTML = `Exclusive Art Pieces From Me - Available until ${formatDisplayDate(currentConfig.END_DATE)}`;
            } else {
                availabilityText.innerHTML = 'Exclusive Art Pieces From Me';
            }
            availabilityText.className = 'under semibold status-active';
        }
    }

    // Show custom art alert
    function showArtAlert() {
        if (!currentConfig) {
            // Default alert when no config
            const alertOverlay = document.createElement('div');
            alertOverlay.className = 'art-alert-overlay';
            alertOverlay.innerHTML = `
                <div class="art-alert">
                    <div class="art-alert-header">
                        <h3>Gallery Available</h3>
                        <span class="art-alert-close">&times;</span>
                    </div>
                    <div class="art-alert-body">
                        <p>The art gallery is currently available to view.</p>
                    </div>
                    <div class="art-alert-footer">
                        <button class="art-alert-button">OK</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(alertOverlay);
            
            // Add event listeners
            const closeBtn = alertOverlay.querySelector('.art-alert-close');
            const okBtn = alertOverlay.querySelector('.art-alert-button');
            const closeAlert = () => alertOverlay.remove();
            
            closeBtn.addEventListener('click', closeAlert);
            okBtn.addEventListener('click', closeAlert);
            alertOverlay.addEventListener('click', (e) => {
                if (e.target === alertOverlay) closeAlert();
            });
            return;
        }
        
        const now = new Date();
        const startDate = currentConfig.START_DATE ? convertToLocalTime(currentConfig.START_DATE) : null;
        const endDate = currentConfig.END_DATE ? convertToLocalTime(currentConfig.END_DATE) : null;
        
        let message, title;
        
        if (currentConfig.MANUAL_CONTROL) {
            title = currentConfig.IS_VISIBLE ? 'Gallery Active' : 'Gallery Unavailable';
            message = currentConfig.IS_VISIBLE ? 
                'The gallery is currently active' : 
                'The gallery is currently not available';
        } else if (!currentConfig.IS_VISIBLE) {
            title = 'Gallery Unavailable';
            message = 'The art gallery is currently not available to visitors. Check back soon!';
        } else if (startDate && now < startDate) {
            title = 'Coming Soon!';
            if (endDate) {
                message = `The artwork collection will be available from ${formatDisplayDate(currentConfig.START_DATE)} to ${formatDisplayDate(currentConfig.END_DATE)}.`;
            } else {
                message = `The artwork collection will be available starting ${formatDisplayDate(currentConfig.START_DATE)}.`;
            }
        } else if (endDate && now > endDate) {
            title = 'Exhibition Ended';
            message = 'This artwork collection has ended. Stay tuned for future exhibitions!';
        } else {
            title = 'Gallery Active';
            if (startDate && endDate) {
                message = `The gallery is currently active! Exhibition period: ${formatDisplayDate(currentConfig.START_DATE)} - ${formatDisplayDate(currentConfig.END_DATE)}`;
            } else {
                message = 'The gallery is currently active!';
            }
        }
        
        // Create custom alert
        const alertOverlay = document.createElement('div');
        alertOverlay.className = 'art-alert-overlay';
        alertOverlay.innerHTML = `
            <div class="art-alert">
                <div class="art-alert-header">
                    <h3>${title}</h3>
                    <span class="art-alert-close">&times;</span>
                </div>
                <div class="art-alert-body">
                    <p>${message}</p>
                </div>
                <div class="art-alert-footer">
                    <button class="art-alert-button">OK</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(alertOverlay);
        
        // Add event listeners
        const closeBtn = alertOverlay.querySelector('.art-alert-close');
        const okBtn = alertOverlay.querySelector('.art-alert-button');
        const closeAlert = () => alertOverlay.remove();
        
        closeBtn.addEventListener('click', closeAlert);
        okBtn.addEventListener('click', closeAlert);
        alertOverlay.addEventListener('click', (e) => {
            if (e.target === alertOverlay) closeAlert();
        });
    }

    // Handle Start Now button click
    function handleStartNowClick(e) {
        e.preventDefault();
        
        if (isArtAvailable()) {
            // Scroll to art section
            const artSection = document.getElementById('features');
            if (artSection) {
                artSection.scrollIntoView({ behavior: 'smooth' });
            }
        } else {
            // Show custom alert
            showArtAlert();
        }
    }

    // Initialize art section visibility and spacing
    function initializeArtSection() {
        // Update availability text
        updateAvailabilityText();
        
        const artSection = document.querySelector('.art-display');
        if (!artSection) return;

        // Show/hide art section based on availability
        if (isArtAvailable()) {
            artSection.style.display = 'flex';
            // Remove spacer if art is available
            const spacer = document.querySelector('.art-section-spacer');
            if (spacer) {
                spacer.remove();
            }
        } else {
            artSection.style.display = 'none';
        }
        
        // Add event listener to Start Now button
        const startNowButton = document.querySelector('.waitlistbutton');
        if (startNowButton) {
            startNowButton.removeEventListener('click', handleStartNowClick); // Remove existing to avoid duplicates
            startNowButton.addEventListener('click', handleStartNowClick);
        }
    }

    // Set up real-time monitoring for automatic updates
    function setupRealTimeMonitoring() {
        // Check every 30 seconds for changes
        setInterval(() => {
            if (currentConfig) {
                initializeArtSection();
                updateAvailabilityText();
            }
        }, 30000); // Check every 30 seconds
        
        // Also check when the page becomes visible again
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden && currentConfig) {
                initializeArtSection();
                updateAvailabilityText();
            }
        });
    }

    // Meteor and background stars functions
    function createBackgroundStars(container, count) {
        for (let i = 0; i < count; i++) {
            const star = document.createElement('div');
            star.className = 'background-star';
            
            const posX = Math.random() * 100;
            const posY = Math.random() * 100;
            const opacity = 0.3 + Math.random() * 0.7;
            const duration = 2 + Math.random() * 2;
            const delay = Math.random() * 5;
            
            star.style.cssText = `
                left: ${posX}%;
                top: ${posY}%;
                --twinkle-opacity: ${opacity};
                --twinkle-duration: ${duration}s;
                animation-delay: ${delay}s;
            `;
            
            container.appendChild(star);
        }
    }
    
    function createMeteor(container, index) {
        const spawnX = Math.random() * 100;
        const spawnY = -10 - (Math.random() * 20);
        const angle = 25 + Math.random() * 10;
        const distanceX = 200 + Math.random() * 150;
        const distanceY = 50 + Math.random() * 50;
        const tailLength = 60 + Math.random() * 40;
        const shineWidth = 20 + Math.random() * 20;
        const duration = 2 + Math.random();
        const delay = Math.random() * 15;
        
        const meteor = document.createElement('div');
        meteor.className = 'meteor';
        
        meteor.style.cssText = `
            --angle: ${angle}deg;
            --distance-x: ${distanceX}px;
            --distance-y: ${distanceY}px;
            --tail-length: ${tailLength}px;
            --shine-width: ${shineWidth}px;
            --duration: ${duration}s;
            --delay: ${delay}s;
            top: ${spawnY}px;
            left: ${spawnX}%;
        `;
        
        container.appendChild(meteor);
        
        const totalTime = (delay + duration) * 1000;
        setTimeout(() => {
            meteor.remove();
            setTimeout(() => createMeteor(container, index), 1000 + Math.random() * 4000);
        }, totalTime);
    }

    // Mobile menu functionality
    function initializeMobileMenu() {
        const mobileMenu = document.getElementById('mobile-menu');
        const navLinks = document.querySelector('.nav-links');

        if (mobileMenu && navLinks) {
            mobileMenu.addEventListener('click', function() {
                this.classList.toggle('active');
                navLinks.classList.toggle('active');
                document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
            });

            document.querySelectorAll('.nav-links a').forEach(link => {
                link.addEventListener('click', (e) => {
                    if (window.innerWidth <= 768) {
                        e.preventDefault();
                        mobileMenu.classList.remove('active');
                        navLinks.classList.remove('active');
                        document.body.style.overflow = '';
                        
                        setTimeout(() => {
                            const target = document.querySelector(link.getAttribute('href'));
                            if (target) {
                                target.scrollIntoView({ behavior: 'smooth' });
                            }
                        }, 400);
                    }
                });
            });

            document.addEventListener('click', (e) => {
                if (window.innerWidth <= 768 && 
                    !e.target.closest('nav') && 
                    navLinks.classList.contains('active')) {
                    mobileMenu.classList.remove('active');
                    navLinks.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });

            window.addEventListener('resize', () => {
                if (window.innerWidth > 768) {
                    mobileMenu.classList.remove('active');
                    navLinks.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        }
    }

    // FAQ functionality
    function initializeFAQ() {
        const questions = document.querySelectorAll('.question');
        
        questions.forEach(question => {
            const header = question.querySelector('.question-header');
            const answer = question.querySelector('.question-answer');
            const toggle = question.querySelector('.question-toggle');
            
            header.addEventListener('click', function() {
                questions.forEach(q => {
                    if (q !== question) {
                        q.classList.remove('active');
                        q.querySelector('.question-answer').style.maxHeight = null;
                        q.querySelector('.question-toggle').textContent = '+';
                    }
                });
                
                const isActive = question.classList.toggle('active');
                
                if (isActive) {
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                    toggle.textContent = '×';
                } else {
                    answer.style.maxHeight = null;
                    toggle.textContent = '+';
                }
            });
        });
    }

    // Scroll animation functionality
    function animateOnScroll() {
        const elements = document.querySelectorAll('.scroll-animate');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-fade-up');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        });

        elements.forEach(element => {
            observer.observe(element);
        });
    }

    // Initialize everything
    function initializeAll() {
        // Create background elements
        createBackgroundStars(container, 150);
        
        for (let i = 0; i < meteorCount; i++) {
            createMeteor(container, i);
        }

        // Load configuration and initialize
        loadArtConfig();
        initializeArtModal(); // Initialize art modal
        initializeMobileMenu();
        initializeFAQ();
        animateOnScroll();
        setupRealTimeMonitoring(); // Add real-time monitoring
        checkGalleryReset(); // ADDED: Check for gallery resets

        // Additional event listeners
        window.addEventListener('load', animateOnScroll);
        window.addEventListener('resize', animateOnScroll);
        setTimeout(animateOnScroll, 500);
    }

    // Start the initialization
    initializeAll();
});