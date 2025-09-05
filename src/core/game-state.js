// Game State Management
// Core game state and phase management for the multiplayer Go counting game

// Helper functions to get correct board data based on hard mode
function getCurrentBoards() {
    if (gameState.settings && gameState.settings.hardMode && typeof window.boardsHard !== 'undefined') {
        return window.boardsHard;
    }
    return boards;
}

function getCurrentDeadStones() {
    if (gameState.settings && gameState.settings.hardMode && typeof window.deadStonesHard !== 'undefined') {
        return window.deadStonesHard;
    }
    return window.deadStones;
}

// Multiplayer game state
let socket;
let socketInitialized = false;
let gameState = {
    phase: 'menu', // menu, lobby, playing, finished, summary
    roomId: null,
    playerId: null,
    playerName: '',
    isCreator: false,
    players: [],
    currentBoard: 0,
    boardSequence: [],
    startTime: null
};

// User-controlled phase state that takes priority over server state
let userOverridePhase = null; // When set, this phase takes priority over server gameState

// Helper function to get the effective phase (considering user override)
function getEffectivePhase() {
    return userOverridePhase || gameState.phase;
}

// Player board results tracking
let playerBoardResults = []; // Accumulated results across all games
let currentGameBoardResults = []; // Results for the current game only
let currentGameInstanceId = null; // Unique identifier for the current game instance
let historicalGameData = {}; // Store past game summaries by gameId

// Summary screen state
let viewingSummary = false;
let reviewingBoardIndex = -1; // -1 = grid view, >=0 = reviewing specific board
let viewingHistoricalGame = null; // Historical game data being viewed
let currentHistoricalBoardResults = []; // Board results for current historical game being viewed

// Board transformation variables (for consistent display in summary)
let currentBoardTransforms = null;
let cachedSummaryData = null; // Cache for summary screen board data

// Function to reset board results for new game
function resetBoardResults() {
    currentGameBoardResults = []; // Reset current game results
    currentGameInstanceId = `${gameState.roomId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`; // Generate unique game instance ID
    viewingSummary = false;
    reviewingBoardIndex = -1;
    summaryLogged = false; // Reset logging flag for new game
    cachedSummaryData = null; // Clear cached summary data
    viewingHistoricalGame = null;
    console.log('🔄 Board results reset for new game. Game Instance ID:', currentGameInstanceId);
}

// Game variables (from original)
let score = 0;
let started = false;
let failed = false;
let timer = 0;
let maxTime = 0; // Maximum time for current game
let boardStartTime = null;
let correctColor; // The correct color for the current board
let penaltyMode = false; // Track if player is in penalty delay
let lobbyCountdown = 0; // Legacy countdown variable (no longer used for automatic lobby return)
let lobbyCountdownActive = false; // Whether countdown is currently active
let lobbyCountdownCancelled = false; // Whether countdown was cancelled by user
let selectedColorValue = 1; // 1 for black, -1 for white

// Current game board data
let board = null; // Current board being displayed

// Helper function to determine if current player won
function didCurrentPlayerWin() {
    if (!gameState.players || gameState.players.length === 0) {
        return false;
    }
    
    // Find current player
    const currentPlayer = gameState.players.find(p => p.id === gameState.playerId);
    if (!currentPlayer) {
        return false;
    }
    
    // Find highest score
    const highestScore = Math.max(...gameState.players.map(p => p.score));
    
    // Check if current player has the highest score
    const isWinner = currentPlayer.score === highestScore;
    
    // Check if there are ties
    const winnersCount = gameState.players.filter(p => p.score === highestScore).length;
    const isTie = winnersCount > 1;
    
    console.log(`🏆 Score check: Current player: ${currentPlayer.score}, Highest: ${highestScore}, Winners: ${winnersCount}, Tie: ${isTie}`);
    
    return { isWinner, isTie, score: currentPlayer.score, highestScore };
}

// Update game state from server
function updateGameState(serverGameState) {
    if (serverGameState.roomId) {
        gameState.roomId = serverGameState.roomId;
    }
    
    if (serverGameState.gameState) {
        const newPhase = serverGameState.gameState === 'waiting' ? 'lobby' : 
                        serverGameState.gameState === 'playing' ? 'playing' : 'finished';
        
        // Preserve user-controlled phase states (summary and lobby)
        if (userOverridePhase === 'summary') {
            console.log('🔒 User override active: preserving summary phase (server wants:', newPhase, ', keeping: summary)');
            gameState.phase = 'summary'; // Ensure phase matches user override
        } else if (gameState.phase === 'summary') {
            console.log('🔒 Already in summary phase: preserving user summary phase (server wants:', newPhase, ', keeping: summary)');
            userOverridePhase = 'summary'; // Set user override to prevent future server changes
        } else if (userOverridePhase === 'lobby') {
            console.log('🔒 User override active: preserving lobby phase (server wants:', newPhase, ', keeping: lobby)');
            gameState.phase = 'lobby'; // Ensure phase matches user override
        } else if (gameState.phase === 'lobby' && (newPhase === 'finished' || newPhase === 'playing')) {
            console.log('🔒 Player in lobby: preserving lobby phase (server wants:', newPhase, ', keeping: lobby)');
            userOverridePhase = 'lobby'; // Set user override to prevent future server changes
        } else {
            gameState.phase = newPhase;
            console.log('📝 Updated phase to:', newPhase);
        }
    }
    
    if (serverGameState.players) {
        gameState.players = serverGameState.players;
    }
    
    if (serverGameState.boardSequence) {
        gameState.boardSequence = serverGameState.boardSequence;
    }
    
    if (serverGameState.currentBoard !== undefined) {
        gameState.currentBoard = serverGameState.currentBoard;
    }
    
    if (serverGameState.startTime) {
        gameState.startTime = serverGameState.startTime;
    }
    
    if (serverGameState.allPlayersFinished !== undefined) {
        gameState.allPlayersFinished = serverGameState.allPlayersFinished;
    }
    
    if (serverGameState.settings) {
        console.log('🔄 Updating settings from server...');
        console.log('- Server hardMode:', serverGameState.settings.hardMode);
        
        // Update settings from server (always use server settings for room parameters)
        gameState.settings = serverGameState.settings;
        
        // Always use server's hard mode setting - this is a room parameter, not user preference
        if (serverGameState.settings.hardMode !== undefined) {
            gameState.settings.hardMode = serverGameState.settings.hardMode;
            console.log('✓ Updated hard mode from server:', serverGameState.settings.hardMode);
            // Update localStorage to keep it in sync
            saveToStorage(STORAGE_KEYS.HARD_MODE, serverGameState.settings.hardMode);
            console.log('✓ Synced hard mode to localStorage:', serverGameState.settings.hardMode);
        }
        
        // Always use server's scoring mode setting - this is a room parameter, not user preference
        if (serverGameState.settings.scoringMode !== undefined) {
            gameState.settings.scoringMode = serverGameState.settings.scoringMode;
            console.log('🔄 Syncing scoring mode from server:', serverGameState.settings.scoringMode);
            // Update localStorage to keep it in sync
            saveToStorage(STORAGE_KEYS.SCORING_MODE, serverGameState.settings.scoringMode);
            console.log('✓ Synced scoring mode to localStorage:', serverGameState.settings.scoringMode);
        }
        
        // Update maxTime based on server settings
        if (serverGameState.settings.timePerBoard && serverGameState.settings.timePerBoard > 0) {
            maxTime = serverGameState.settings.timePerBoard * 1000; // Convert to milliseconds
            console.log('Updated maxTime from server settings:', maxTime);
        }
        
        console.log('✓ Final hardMode setting:', gameState.settings.hardMode);
        
        // Debug state after server update
        setTimeout(debugHardModeState, 50);
    }
}

// Export functions for global access (since we're not using ES6 modules yet)
window.getCurrentBoards = getCurrentBoards;
window.getCurrentDeadStones = getCurrentDeadStones;
window.getEffectivePhase = getEffectivePhase;
window.resetBoardResults = resetBoardResults;
window.didCurrentPlayerWin = didCurrentPlayerWin;

// Export variables for global access
window.socket = socket;
window.socketInitialized = socketInitialized;
window.gameState = gameState;
window.userOverridePhase = userOverridePhase;
window.playerBoardResults = playerBoardResults;
window.currentGameBoardResults = currentGameBoardResults;
window.currentGameInstanceId = currentGameInstanceId;
window.historicalGameData = historicalGameData;
window.viewingSummary = viewingSummary;
window.reviewingBoardIndex = reviewingBoardIndex;
window.viewingHistoricalGame = viewingHistoricalGame;
window.currentHistoricalBoardResults = currentHistoricalBoardResults;
window.currentBoardTransforms = currentBoardTransforms;
window.cachedSummaryData = cachedSummaryData;
window.score = score;
window.started = started;
window.failed = failed;
window.timer = timer;
window.maxTime = maxTime;
window.boardStartTime = boardStartTime;
window.correctColor = correctColor;
window.penaltyMode = penaltyMode;
window.lobbyCountdown = lobbyCountdown;
window.lobbyCountdownActive = lobbyCountdownActive;
window.lobbyCountdownCancelled = lobbyCountdownCancelled;
window.selectedColorValue = selectedColorValue;
window.board = board;
window.updateGameState = updateGameState;