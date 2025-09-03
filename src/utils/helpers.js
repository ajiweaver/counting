// Helper Functions
// General utility functions used throughout the application

// Auto-detect server URL based on environment
const SERVER_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
    ? 'http://localhost:3000' 
    : 'https://counting-server-production.up.railway.app';

// Development mode detection
const IS_LOCALHOST = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Dynamic dev mode that can be toggled locally
let isDevelopmentMode = false;

// Helper function to convert color text to emoji
function formatAnswerWithEmojis(answer) {
    if (typeof answer !== 'string') return answer;
    return answer
        .replace(/\bblack\b/g, '⚫')
        .replace(/\bwhite\b/g, '⚪')
        .replace(/\bB\+/g, '⚫+')
        .replace(/\bW\+/g, '⚪+');
}

// Time formatting utilities
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
}

// Copy to clipboard functionality
function copyRoomLink() {
    if (!gameState.roomId) {
        console.error('No room ID available to copy');
        return;
    }
    
    // Create shareable link with room ID as parameter
    const roomLink = `${window.location.origin}${window.location.pathname}?room=${gameState.roomId}`;
    
    // Copy to clipboard
    if (navigator.clipboard && window.isSecureContext) {
        // Modern clipboard API
        navigator.clipboard.writeText(roomLink).then(() => {
            showCopyFeedback('Link copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy with clipboard API:', err);
            fallbackCopyToClipboard(roomLink);
        });
    } else {
        // Fallback for older browsers or non-HTTPS
        fallbackCopyToClipboard(roomLink);
    }
}

function copyRoomLinkWithAnimation(element) {
    // Add animation class for keyframe animation
    element.classList.add('animate-click');
    
    // Call the copy function
    copyRoomLink();
    
    // Remove the animation class after animation completes
    setTimeout(() => {
        element.classList.remove('animate-click');
    }, 120);
}

function fallbackCopyToClipboard(text) {
    // Create temporary textarea
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    
    try {
        textarea.select();
        textarea.setSelectionRange(0, 99999); // For mobile devices
        const successful = document.execCommand('copy');
        if (successful) {
            showCopyFeedback('Link copied to clipboard!');
        } else {
            showCopyFeedback('Failed to copy link', true);
        }
    } catch (err) {
        console.error('Fallback copy failed:', err);
        showCopyFeedback('Failed to copy link', true);
    } finally {
        document.body.removeChild(textarea);
    }
}

function showCopyFeedback(message, isError = false) {
    // Create a toast notification
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${isError ? '#f44336' : '#4CAF50'};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: bold;
        z-index: 2000;
        opacity: 0;
        transform: translateY(-10px);
        transition: all 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    `;
    
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
    
    console.log(message);
}

// Browser URL management
function updateBrowserURL(roomId) {
    if (!roomId) {
        console.error('No room ID provided to update URL');
        return;
    }
    
    try {
        // Create the room URL with the same format as the shareable link
        const roomURL = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
        
        // Update the browser URL without reloading the page
        window.history.pushState({roomId: roomId}, '', roomURL);
        
        console.log('Updated browser URL to:', roomURL);
    } catch (error) {
        console.error('Failed to update browser URL:', error);
    }
}

function resetBrowserURL() {
    try {
        // Reset to base URL without room parameter
        const baseURL = `${window.location.origin}${window.location.pathname}`;
        
        // Update the browser URL without reloading the page
        window.history.pushState({}, '', baseURL);
        
        console.log('Reset browser URL to base:', baseURL);
    } catch (error) {
        console.error('Failed to reset browser URL:', error);
    }
}

// Prevent infinite retry loops
let retryCount = 0;
const MAX_RETRIES = 3;

function resetRetryCount() {
    retryCount = 0;
}

function canRetry() {
    return retryCount < MAX_RETRIES;
}

function incrementRetry() {
    retryCount++;
}


// Export functions for global access
window.SERVER_URL = SERVER_URL;
window.IS_LOCALHOST = IS_LOCALHOST;
window.isDevelopmentMode = isDevelopmentMode;
window.formatAnswerWithEmojis = formatAnswerWithEmojis;
window.getTimeAgo = getTimeAgo;
window.formatDuration = formatDuration;
window.copyRoomLink = copyRoomLink;
window.copyRoomLinkWithAnimation = copyRoomLinkWithAnimation;
window.fallbackCopyToClipboard = fallbackCopyToClipboard;
window.showCopyFeedback = showCopyFeedback;
window.updateBrowserURL = updateBrowserURL;
window.resetBrowserURL = resetBrowserURL;
window.resetRetryCount = resetRetryCount;
window.canRetry = canRetry;
window.incrementRetry = incrementRetry;