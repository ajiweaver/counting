// Main Entry Point
// Initialize the application and coordinate all modules

// Game state variables that need to be globally accessible
// These will be initialized by individual modules but accessed globally

// Default game settings
let defaultTimePerBoard = 60;
let defaultTotalBoards = 10;

// Development mode settings
let IS_DEV_MODE = window.location.hostname === 'localhost' || window.location.search.includes('dev=1');

// Console backup for development mode
const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug
};

// URL parameters
const urlParams = new URLSearchParams(window.location.search);

// Animation variables
let errorShakeIntensity = 0;
let errorShakeDecay = 0.95;
let errorShakeTime = 0;
let errorShakeDuration = 30;

// UI variables
let leaderboardVisible = false;
let leaderboardAutoHidden = false;
let summaryLogged = false;

// Hard mode variables
let hardModeEnabled = false;
let selectedColor = 1; // 1 for black, -1 for white
let selectedScoreIndex = 0; // Index in scoreChoices array
let scoreChoices = [1, 2, 3, 4]; // Available score choices
let selectedDifference = null;
let normalModeBlackStone = null;
let normalModeWhiteStone = null;
let scoreButtonBounces = [0, 0, 0, 0];
const bounceDecay = 0.85;

// Normal mode stone button variables
let stoneToggleButtonY;
let stoneToggleAnimation = 0;
let stoneToggleAnimationDecay = 0.9;

// Game settings variables
let currentTimePerBoard = defaultTimePerBoard;
let currentTotalBoards = defaultTotalBoards;

// UI animation variables
let blackStoneBounce = 0; // bounce animation for black stone
let whiteStoneBounce = 0; // bounce animation for white stone
let stoneButtonBounce = 0; // bounce animation for stone button
const bounceStrength = 0.3; // strength of bounce effect

// Success animation variables
let successAnimationIntensity = 0; // green glow intensity for correct answers
const successAnimationDecay = 0.88; // how fast success animation fades

// Canvas drawing variables
let R, D, halfStrokeWeight;

// Track leaderboard history calls for debugging
let leaderboardHistoryCalls = 0;
let leaderboardHistoryErrors = 0;
let lastLeaderboardHistoryCall = null;
let leaderboardHistoryCallCount = 0;
let lastHistoryLoadTime = 0;
let historyLoadInProgress = false;

// UI initialization tracking
let uiInitialized = false;

// Initialize application
function initializeApp() {
    console.log('🚀 Initializing Counting Battle application...');
    
    // Check for room ID in URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomIdFromUrl = urlParams.get('room');
    
    if (roomIdFromUrl) {
        console.log('🔗 Room ID found in URL, attempting to reconnect:', roomIdFromUrl);
        // Store room ID and attempt reconnection after a short delay
        saveToStorage('currentRoomId', roomIdFromUrl);
        setTimeout(() => tryReconnectToRoom(roomIdFromUrl), 1000);
    }
    
    // Initialize socket connection
    initSocket();
    
    // Initialize UI
    initializeUI();
    
    // Show main menu
    showMainMenu();
    
    console.log('✅ Application initialized successfully');
}

// Initialize UI elements
function initializeUI() {
    if (uiInitialized) {
        console.log('UI already initialized, skipping');
        return;
    }
    
    console.log('=== initializeUI called ===');
    const timeSlider = document.getElementById('time-per-board');
    const totalBoardsInput = document.getElementById('total-boards');
    const timeDisplay = document.getElementById('time-display');
    const playerNameInput = document.getElementById('player-name');
    
    // Load saved settings from localStorage
    const savedTime = loadFromStorage(STORAGE_KEYS.TIME_PER_BOARD, defaultTimePerBoard);
    const savedTotalBoards = loadFromStorage(STORAGE_KEYS.TOTAL_BOARDS, defaultTotalBoards);
    const savedPlayerName = loadFromStorage(STORAGE_KEYS.PLAYER_NAME, '');
    const savedRoomId = loadFromStorage(STORAGE_KEYS.ROOM_ID, null);
    
    console.log('DOM Elements found:');
    console.log('- timeSlider:', !!timeSlider, timeSlider ? `value=${timeSlider.value}` : 'null');
    console.log('- totalBoardsInput:', !!totalBoardsInput, totalBoardsInput ? `value=${totalBoardsInput.value}` : 'null');
    console.log('- timeDisplay:', !!timeDisplay);
    console.log('- playerNameInput:', !!playerNameInput);
    console.log('localStorage values:');
    console.log('- savedTime:', savedTime);
    console.log('- savedTotalBoards:', savedTotalBoards);
    console.log('- savedPlayerName:', savedPlayerName);
    console.log('- savedRoomId:', savedRoomId);
    
    // Restore player name if saved
    if (playerNameInput && savedPlayerName) {
        playerNameInput.value = savedPlayerName;
        console.log('Restored player name:', savedPlayerName);
    }
    
    if (timeSlider) {
        console.log('=== Initializing time input ===');
        console.log('HTML attribute value:', timeSlider.getAttribute('value'));
        console.log('DOM .value property:', timeSlider.value);
        console.log('DOM .defaultValue property:', timeSlider.defaultValue);
        
        // Set initial value from localStorage or default
        if (savedTime && !isNaN(savedTime)) {
            currentTimePerBoard = parseInt(savedTime);
            console.log('✓ Restoring saved time:', currentTimePerBoard);
        } else {
            currentTimePerBoard = parseInt(timeSlider.value) || defaultTimePerBoard;
            console.log('✓ Using default time:', currentTimePerBoard);
        }
        
        // Set the input value
        timeSlider.value = currentTimePerBoard;
        console.log('✓ Set input value to:', timeSlider.value);
        
        saveToStorage(STORAGE_KEYS.TIME_PER_BOARD, currentTimePerBoard);
        console.log('✓ Saved to localStorage:', currentTimePerBoard);
        
        // Event handling for number input - only validate on blur to allow editing
        const blurHandler = function(e) {
            let newValue = parseInt(e.target.value);
            
            // Validate the value only when user is done editing (blur event)
            if (isNaN(newValue) || newValue < 1 || newValue > 600) {
                console.log('❌ Invalid value:', newValue, 'resetting to previous');
                e.target.value = currentTimePerBoard;
                return;
            }
            
            console.log('🎯 Number input changed to:', newValue);
            handleTimeChange(newValue);
        };
        
        // Add event listeners - update on input, validate on blur
        timeSlider.addEventListener('input', function(e) {
            let newValue = parseInt(e.target.value);
            
            console.log('🎯 Number input changed to:', newValue);
            handleTimeChange(newValue);
        });
        timeSlider.addEventListener('blur', blurHandler);
        timeSlider.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                blurHandler(e);
            }
        });
        
        console.log('✓ Added event listeners');
        console.log('=== Time input initialization complete ===');
    }
    
    // Initialize dev mode toggle (only show for localhost)
    const devModeToggle = document.getElementById('dev-mode-toggle');
    const devModeCheckbox = document.getElementById('dev-mode-checkbox');
    
    if (window.location.hostname === 'localhost') {
        console.log('=== Initializing dev mode toggle ===');
        devModeToggle.style.display = 'block';
        
        // Show board editor link on localhost
        const boardEditorLink = document.getElementById('board-editor-link');
        if (boardEditorLink) {
            boardEditorLink.style.display = 'inline-block';
            console.log('🎨 Board editor link enabled for localhost');
        }
        
        // Set initial state
        devModeCheckbox.checked = IS_DEV_MODE;
        
        // Add event listener for dev mode toggle
        devModeCheckbox.addEventListener('change', function(e) {
            IS_DEV_MODE = e.target.checked;
            console.log('🔧 Dev mode toggled to:', IS_DEV_MODE);
            
            // Update dev mode indicator if it exists
            const devIndicator = document.getElementById('dev-mode-indicator');
            if (devIndicator) {
                devIndicator.style.display = IS_DEV_MODE ? 'inline' : 'none';
            }
        });
        
        console.log('✓ Dev mode toggle initialized, current state:', IS_DEV_MODE);
    }
    
    // Hard mode is now controlled in room lobby settings, no local checkbox needed
    
    // Initialize total boards input
    if (totalBoardsInput) {
        console.log('=== Initializing total boards input ===');
        
        // Set initial value from localStorage or default
        if (savedTotalBoards && !isNaN(savedTotalBoards)) {
            currentTotalBoards = parseInt(savedTotalBoards);
            console.log('✓ Restoring saved total boards:', currentTotalBoards);
        } else {
            currentTotalBoards = parseInt(totalBoardsInput.value) || 20;
            console.log('✓ Using default total boards:', currentTotalBoards);
        }
        
        // Set the input value
        totalBoardsInput.value = currentTotalBoards;
        console.log('✓ Set input value to:', totalBoardsInput.value);
        
        saveToStorage(STORAGE_KEYS.TOTAL_BOARDS, currentTotalBoards);
        console.log('✓ Saved to localStorage:', currentTotalBoards);
        
        // Event handler for total boards input - only validate on blur to allow editing
        const boardsBlurHandler = function(e) {
            let newValue = parseInt(e.target.value);
            
            // Validate the value only when user is done editing (blur event)
            if (isNaN(newValue) || newValue < 1 || newValue > 50) {
                console.log('❌ Invalid total boards value:', newValue, 'resetting to previous');
                e.target.value = currentTotalBoards;
                return;
            }
            
            currentTotalBoards = newValue;
            console.log('✓ Updated currentTotalBoards to:', currentTotalBoards);
            
            // Save to localStorage
            saveToStorage(STORAGE_KEYS.TOTAL_BOARDS, currentTotalBoards);
            console.log('✓ Saved to localStorage:', currentTotalBoards);
        };
        
        // Add event listeners - update on input, validate on blur
        totalBoardsInput.addEventListener('input', function(e) {
            let newValue = parseInt(e.target.value);
            
            currentTotalBoards = newValue;
            console.log('✓ Updated currentTotalBoards to:', currentTotalBoards);
            
            // Save to localStorage
            saveToStorage(STORAGE_KEYS.TOTAL_BOARDS, currentTotalBoards);
            console.log('✓ Saved to localStorage:', currentTotalBoards);
        });
        totalBoardsInput.addEventListener('blur', boardsBlurHandler);
        totalBoardsInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                boardsBlurHandler(e);
            }
        });
        
        console.log('✓ Total boards input initialization complete');
    }
    
    // Try to reconnect to saved room if exists
    if (savedRoomId) {
        console.log('Found saved room ID:', savedRoomId);
        tryReconnectToRoom(savedRoomId);
    }
    
    uiInitialized = true;
}

// Try to reconnect to a room (from URL or storage)
function tryReconnectToRoom(roomId) {
    console.log('Attempting to reconnect to room:', roomId);
    
    // Check if room still exists
    socket.emit('get-room-info', roomId, (response) => {
        if (response.success) {
            console.log('Room still exists, attempting to rejoin');
            
            // Set up game state
            gameState.roomId = roomId;
            let playerName = document.getElementById('player-name').value.trim();
            if (!playerName) {
                playerName = loadFromStorage(STORAGE_KEYS.PLAYER_NAME, '') || getRandomName();
                document.getElementById('player-name').value = playerName;
            }
            gameState.playerName = playerName;
            
            // Try to rejoin the room
            socket.emit('join-room', {
                roomId: roomId,
                playerName: playerName,
                playerUUID: getPlayerUUID(), // Include UUID for reconnection
                isDevMode: IS_DEV_MODE
            }, (joinResponse) => {
                if (joinResponse.success) {
                    console.log('Successfully reconnected to room:', roomId);
                    console.log('Server response player:', joinResponse.player);
                    console.log('Server response gameState:', joinResponse.gameState);
                    
                    // Update game state first
                    updateGameState(joinResponse.gameState);
                    
                    // Sync local game variables with room settings on auto-rejoin
                    if (joinResponse.gameState.settings) {
                        currentTimePerBoard = joinResponse.gameState.settings.timePerBoard;
                        currentTotalBoards = joinResponse.gameState.settings.totalBoards;
                        console.log('🔄 Synced local variables with room settings on auto-rejoin:', {
                            currentTimePerBoard,
                            currentTotalBoards
                        });
                    }
                    
                    // IMPORTANT: Set isCreator flag from server response (after updateGameState)
                    gameState.isCreator = joinResponse.player.isCreator;
                    console.log('Final gameState - isCreator:', gameState.isCreator, 'phase:', gameState.phase);
                    showRoomLobby();
                    
                    // Force UI update to ensure Start Game button appears
                    setTimeout(async () => {
                        console.log('Force updating UI after reconnection');
                        await updateUI();
                        // Note: showRoomLobby() already loads leaderboard history, so we don't need to do it again here
                    }, 100);
                } else {
                    console.log('Failed to rejoin room:', joinResponse.error);
                    clearRoomStorage();
                    showMainMenu();
                }
            });
        } else {
            console.log('Saved room no longer exists:', response.error);
            clearRoomStorage();
            showMainMenu();
        }
    });
}

// Start the application when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Export global variables for other modules
window.errorShakeIntensity = errorShakeIntensity;
window.errorShakeDecay = errorShakeDecay;
window.leaderboardVisible = leaderboardVisible;
window.leaderboardAutoHidden = leaderboardAutoHidden;
window.summaryLogged = summaryLogged;
window.hardModeEnabled = hardModeEnabled;
window.selectedColor = selectedColor;
window.selectedScoreIndex = selectedScoreIndex;
window.scoreChoices = scoreChoices;
window.stoneToggleButtonY = stoneToggleButtonY;
window.stoneToggleAnimation = stoneToggleAnimation;
window.stoneToggleAnimationDecay = stoneToggleAnimationDecay;
window.currentTimePerBoard = currentTimePerBoard;
window.currentTotalBoards = currentTotalBoards;
window.leaderboardHistoryCalls = leaderboardHistoryCalls;
window.leaderboardHistoryErrors = leaderboardHistoryErrors;
window.lastLeaderboardHistoryCall = lastLeaderboardHistoryCall;
window.tryReconnectToRoom = tryReconnectToRoom;
window.initializeUI = initializeUI;
window.defaultTimePerBoard = defaultTimePerBoard;
window.defaultTotalBoards = defaultTotalBoards;
window.blackStoneBounce = blackStoneBounce;
window.whiteStoneBounce = whiteStoneBounce;

// Debug function availability
window.debugFunctionAvailability = function() {
    console.log('Function availability check:');
    console.log('- showMainMenu:', typeof showMainMenu);
    console.log('- showRoomLobby:', typeof showRoomLobby);
    console.log('- createRoom:', typeof createRoom);
    console.log('- setup:', typeof setup);
    console.log('- draw:', typeof draw);
};
window.stoneButtonBounce = stoneButtonBounce;
window.bounceStrength = bounceStrength;
window.R = R;
window.D = D;
window.halfStrokeWeight = halfStrokeWeight;
window.IS_DEV_MODE = IS_DEV_MODE;
window.urlParams = urlParams;
window.uiInitialized = uiInitialized;
window.selectedDifference = selectedDifference;
window.normalModeBlackStone = normalModeBlackStone;
window.normalModeWhiteStone = normalModeWhiteStone;
window.scoreButtonBounces = scoreButtonBounces;
window.bounceDecay = bounceDecay;
window.successAnimationIntensity = successAnimationIntensity;
window.successAnimationDecay = successAnimationDecay;
window.errorShakeTime = errorShakeTime;
window.errorShakeDuration = errorShakeDuration;
window.leaderboardHistoryCallCount = leaderboardHistoryCallCount;
window.lastHistoryLoadTime = lastHistoryLoadTime;
window.historyLoadInProgress = historyLoadInProgress;
window.originalConsole = originalConsole;

        const blurHandler = function(e) {
            let newValue = parseInt(e.target.value);
            
            // Validate the value only when user is done editing (blur event)
            if (isNaN(newValue) || newValue < 1 || newValue > 600) {
                console.log('❌ Invalid value:', newValue, 'resetting to previous');
                e.target.value = currentTimePerBoard;
                return;
            }
            
            console.log('🎯 Number input changed to:', newValue);
            handleTimeChange(newValue);
        };


        const boardsBlurHandler = function(e) {
            let newValue = parseInt(e.target.value);
            
            // Validate the value only when user is done editing (blur event)
            if (isNaN(newValue) || newValue < 1 || newValue > 50) {
                console.log('❌ Invalid total boards value:', newValue, 'resetting to previous');
                e.target.value = currentTotalBoards;
                return;
            }
            
            currentTotalBoards = newValue;
            console.log('✓ Updated currentTotalBoards to:', currentTotalBoards);
            
            // Save to localStorage
            saveToStorage(STORAGE_KEYS.TOTAL_BOARDS, currentTotalBoards);
            console.log('✓ Saved to localStorage:', currentTotalBoards);
        };
