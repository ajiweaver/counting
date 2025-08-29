// goscorer functions are imported via inline module script in index.html and made available globally

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
let gameState = {
    phase: 'menu', // menu, lobby, playing, finished
    roomId: null,
    playerId: null,
    playerName: '',
    isCreator: false,
    players: [],
    currentBoard: 0,
    boardSequence: [],
    startTime: null
};

// Leaderboard state
let leaderboardVisible = true;
let leaderboardAutoHidden = false;

// Game variables (from original)
let board;
let score = 0;
let timer = 0;
let maxTime = 0; // Maximum time for current game
let started = false;
let correct;
let failed = false;
let defaultTimePerBoard = 60;
let defaultTotalBoards = 10;
let penaltyMode = false; // Track if player is in penalty delay
let lobbyCountdown = 0; // Countdown timer for automatic lobby return (in seconds)
let lobbyCountdownActive = false; // Whether countdown is currently active
let lobbyCountdownCancelled = false; // Whether countdown was cancelled by user

// Hard mode variables
let selectedColorValue = 1; // 1 for black, -1 for white
let selectedDifference = null; // number
let scoreChoices = []; // array of 4 score difference choices

// Animation variables
let stoneButtonBounce = 0; // bounce animation for stone button
let scoreButtonBounces = [0, 0, 0, 0]; // bounce animations for score buttons
const bounceDecay = 0.85; // how quickly bounce animation fades
const bounceStrength = 0.3; // strength of bounce effect

// UI variables
let R, D, halfStrokeWeight;
let sx, sy, bx, by, wx, wy;

// Auto-detect server URL based on environment
const SERVER_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://counting-production.up.railway.app';

// Development mode detection
// Dynamic dev mode that can be toggled locally
let IS_DEV_MODE = window.location.hostname === 'localhost' || window.location.search.includes('dev=1');

// Mock data control - separate from dev mode
let useMockData = false;

// Mock data for development/testing
const MOCK_GAMES = [
    {
        roomId: "ABC123",
        completedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
        duration: 127,
        players: [
            { name: "clever_tesla", score: 8, finished: true, isCreator: true },
            { name: "happy_curie", score: 6, finished: true, isCreator: false },
            { name: "zen_lovelace", score: 4, finished: true, isCreator: false }
        ]
    },
    {
        roomId: "ABC123", 
        completedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
        duration: 203,
        players: [
            { name: "wizardly_newton", score: 5, finished: true, isCreator: false },
            { name: "epic_hopper", score: 5, finished: true, isCreator: true },
            { name: "clever_tesla", score: 3, finished: true, isCreator: false }
        ]
    },
    {
        roomId: "ABC123",
        completedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
        duration: 89,
        players: [
            { name: "happy_curie", score: 0, finished: true, isCreator: true },
            { name: "zen_lovelace", score: 0, finished: true, isCreator: false },
            { name: "epic_hopper", score: 0, finished: true, isCreator: false }
        ]
    },
    {
        roomId: "ABC123",
        completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        duration: 156,
        players: [
            { name: "clever_tesla", score: 12, finished: true, isCreator: true }
        ]
    },
    {
        roomId: "XYZ789", // Different room
        completedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        duration: 245,
        players: [
            { name: "amazing_turing", score: 7, finished: true, isCreator: true },
            { name: "brilliant_euler", score: 7, finished: true, isCreator: false },
            { name: "wise_archimedes", score: 7, finished: true, isCreator: false },
            { name: "funny_fibonacci", score: 7, finished: true, isCreator: false }
        ]
    },
    {
        roomId: "ABC123",
        completedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        duration: 67,
        players: [
            { name: "focused_darwin", score: 15, finished: true, isCreator: true },
            { name: "elegant_galileo", score: 14, finished: true, isCreator: false },
            { name: "jolly_kepler", score: 13, finished: true, isCreator: false },
            { name: "peaceful_pascal", score: 12, finished: true, isCreator: false },
            { name: "clever_tesla", score: 11, finished: true, isCreator: false }
        ]
    },
    {
        roomId: "ABC123",
        completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        duration: 334,
        players: [
            { name: "zen_lovelace", score: 3, finished: true, isCreator: false },
            { name: "happy_curie", score: 3, finished: true, isCreator: true }
        ]
    },
    // Perfect completion cases - players finished all boards successfully
    {
        roomId: "ABC123",
        completedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(), // 3 minutes ago
        duration: 180, // 3 minutes for 20 boards (9 seconds per board avg)
        players: [
            { name: "perfect_hawking", score: 20, finished: true, isCreator: true }, // Completed all 20 boards
            { name: "brilliant_euler", score: 18, finished: true, isCreator: false }, // Missed 2 boards
            { name: "focused_darwin", score: 15, finished: true, isCreator: false } // Missed 5 boards
        ]
    },
    {
        roomId: "ABC123", 
        completedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
        duration: 240, // 4 minutes for 20 boards (12 seconds per board avg)
        players: [
            { name: "flawless_feynman", score: 20, finished: true, isCreator: false }, // Perfect game
            { name: "amazing_turing", score: 20, finished: true, isCreator: true }, // Also perfect
            { name: "wise_archimedes", score: 19, finished: true, isCreator: false }, // Almost perfect
            { name: "clever_tesla", score: 17, finished: true, isCreator: false }
        ]
    },
    {
        roomId: "ABC123",
        completedAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(), // 2.5 hours ago
        duration: 420, // 7 minutes for 20 boards (21 seconds per board avg)
        players: [
            { name: "methodical_marie", score: 20, finished: true, isCreator: true }, // Completed all boards
            { name: "patient_pascal", score: 16, finished: true, isCreator: false }
        ]
    },
    {
        roomId: "XYZ789", // Different room - speed run scenario  
        completedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(), // 1.5 hours ago
        duration: 120, // 2 minutes for 20 boards (6 seconds per board avg) - very fast!
        players: [
            { name: "lightning_lovelace", score: 20, finished: true, isCreator: true }, // Perfect speed run
            { name: "rapid_ramanujan", score: 19, finished: true, isCreator: false }, // Almost perfect speed
            { name: "quick_qutub", score: 14, finished: true, isCreator: false } // Good but not perfect
        ]
    }
];

// Mock boards for development testing
const MOCK_BOARDS = [
    // Board 0: Simple corner capture - Black wins
    `. . . . . . . . .
. . . . . . . . .
. . X X X . . . .
. . X O O X . . .
. . X O . O X . .
. . X O O O X . .
. . X X X X . . .
. . . . . . . . .
. . . . . . . . .`,
    
    // Board 1: Territory battle - White wins
    `. . . . . . . . .
. . O O O . . . .
. O . . . O . . .
. O . X X . O . .
. O . X . X O . .
. O . X X . O . .
. . O . . O . . .
. . . O O . . . .
. . . . . . . . .`,
    
    // Board 2: Complex center fight - Black wins by 1
    `. . . . . . . . .
. . X O O . . . .
. X . X O . O . .
. X X . X O . . .
. . X X X O O . .
. . . X O . . . .
. . X . X O O . .
. . . X X X O . .
. . . . . . . . .`,
    
    // Board 3: Large territory - White wins big
    `O O O O O . . . .
O . . . O . . . .
O . . . O . . . .
O . . . O X X X .
O . . . O X . X .
O . . . O X . X .
O . . . O X X X .
O O O O O . . . .
. . . . . . . . .`,
    
    // Board 4: Close endgame - Black wins by half point
    `X X O O . . . . .
X O X O . . . . .
X O X O . . . . .
X O O X X . . . .
X X O O X . . . .
. X X O O . . . .
. . X X O . . . .
. . . X O . . . .
. . . . . . . . .`,
    
    // Board 5: Seki position - Black wins
    `. . . . . . . . .
. . X X O O . . .
. X . X O . O . .
. X X O O O . . .
. . X X O . . . .
. . . X O . . . .
. . . X O . . . .
. . . . . . . . .
. . . . . . . . .`
];

// Development helper functions
if (IS_DEV_MODE) {
    // Expose helper functions for testing
    window.setTestRoomId = async function(roomId) {
        gameState.roomId = roomId;
        console.log('🚀 Test room ID set to:', roomId);
        await showRoomLobby();
    };
    
    window.showMockData = function() {
        useMockData = true;
        console.log('🚀 Mock data enabled! Available mock room IDs:');
        const roomIds = [...new Set(MOCK_GAMES.map(g => g.roomId))];
        roomIds.forEach(id => {
            const count = MOCK_GAMES.filter(g => g.roomId === id).length;
            console.log(`  - ${id} (${count} games)`);
        });
        console.log('\nUse setTestRoomId("ABC123") to test with mock data');
        console.log('Use hideMockData() to disable mock data');
    };
    
    window.hideMockData = function() {
        useMockData = false;
        console.log('🚀 Mock data disabled! Will use real server data');
    };
    
    window.setTestBoardId = function(boardId) {
        // If no boardId provided, randomly choose one from the real boards
        if (boardId === undefined || boardId === null) {
            boardId = Math.floor(Math.random() * boards.length);
            console.log(`🎲 Randomly selected board ID: ${boardId}`);
        }
        
        if (boardId < 0 || boardId >= boards.length) {
            console.error(`❌ Invalid board ID: ${boardId}. Available: 0-${boards.length - 1}`);
            return;
        }
        
        // Set up a simple game state for testing using the real board ID
        gameState.boardSequence = [boardId]; // Use the actual board ID
        gameState.currentBoard = 0;
        gameState.phase = 'playing';
        
        // Ensure we're not in a failed state so buttons show
        failed = false;
        
        console.log(`🚀 Test board ${boardId} loaded!`);
        console.log('Board preview:');
        const currentBoards = getCurrentBoards();
        console.log(currentBoards[boardId]);
        console.log('\nBoard will render immediately with dead stone support!');
        
        // Clear UI overlay and set up for immediate board testing
        document.getElementById('ui-overlay').style.display = 'none';
        
        // Set up game variables for testing
        started = true;
        failed = false;
        penaltyMode = false;
        score = 0;
        maxTime = 600000; // Set maxTime for the timer bar to work properly
        
        // Set up game state with UI mode settings
        if (!gameState.settings) {
            gameState.settings = {};
        }
        
        // Check current hard mode setting from UI or use default
        const hardModeCheckbox = document.getElementById('hard-mode');
        gameState.settings.hardMode = hardModeCheckbox ? hardModeCheckbox.checked : false;
        
        console.log(`🎮 Testing in ${gameState.settings.hardMode ? 'HARD' : 'NORMAL'} mode`);
        
        // Load the board and force rendering
        if (typeof loadMultiplayerBoard === 'function') {
            loadMultiplayerBoard(0);
        }
        
        // Force canvas redraw by triggering draw function if it exists
        if (typeof window.redraw === 'function') {
            window.redraw();
        }
        
        // Also start timer for test mode
        timer = 0;
        
        console.log('🎯 Board loaded and rendering triggered!');
    };
    
    window.showMockBoards = function() {
        console.log('🚀 Available mock boards:');
        MOCK_BOARDS.forEach((board, id) => {
            const lines = board.trim().split('\n');
            const description = lines[0].includes('X X X') ? 'Complex' : 
                               lines.some(l => l.includes('O O O O O')) ? 'Territory' :
                               'Standard';
            console.log(`  - ${id}: ${description} position`);
        });
        console.log('\nUse setTestBoardId(0) to test with mock board');
        console.log('Use showMockBoards() to see all available boards');
    };
    
    window.setRealBoardId = function(boardId) {
        // If no boardId provided, randomly choose one
        if (boardId === undefined || boardId === null) {
            boardId = Math.floor(Math.random() * boards.length);
            console.log(`🎲 Randomly selected real board ID: ${boardId}`);
        }
        
        if (boardId < 0 || boardId >= boards.length) {
            console.error(`❌ Invalid board ID: ${boardId}. Available: 0-${boards.length - 1}`);
            return;
        }
        
        // Clear UI overlay and set up for immediate board testing
        document.getElementById('ui-overlay').style.display = 'none';
        
        // Set up game variables for testing
        started = true;
        failed = false;
        penaltyMode = false;
        timer = 600000; // 600 seconds for testing
        score = 0;
        
        // Set maxTime for the timer bar to work properly
        maxTime = 600000;
        
        // Set up a simple game state for testing with real boards
        gameState.boardSequence = [boardId]; // Use the selected real board
        gameState.currentBoard = 0;
        gameState.phase = 'playing';
        
        // Ensure we're not in a failed state so buttons show
        failed = false;
        
        console.log(`🚀 Real board ${boardId} loaded!`);
        console.log(`Board preview (first few lines):`);
        const currentBoards = getCurrentBoards();
        const boardLines = currentBoards[boardId].trim().split('\n').slice(0, 3);
        boardLines.forEach(line => console.log(line));
        if (currentBoards[boardId].trim().split('\n').length > 3) {
            console.log('...');
        }
        
        // Set up game state with UI mode settings
        if (!gameState.settings) {
            gameState.settings = {};
        }
        
        // Check current hard mode setting from UI or use default
        const hardModeCheckbox = document.getElementById('hard-mode');
        gameState.settings.hardMode = hardModeCheckbox ? hardModeCheckbox.checked : false;
        
        console.log(`🎮 Testing in ${gameState.settings.hardMode ? 'HARD' : 'NORMAL'} mode`);
        
        // Load the board immediately
        if (typeof loadMultiplayerBoard === 'function') {
            loadMultiplayerBoard(0);
        }
    };

    window.resetBoards = function() {
        if (window.originalBoards) {
            boards = window.originalBoards.slice();
            console.log('🚀 Original boards restored');
        }
    };
    
    // Query leaderboard data from console
    window.queryLeaderboard = async function(roomId = null) {
        console.log('📊 Querying leaderboard data...');
        try {
            const timestamp = Date.now();
            const url = `${SERVER_URL}/leaderboard?t=${timestamp}`;
            const response = await fetch(url, {
                cache: 'no-cache',
                headers: { 'Cache-Control': 'no-cache' }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('🎯 Current room ID:', gameState.roomId || 'None set');
            console.log('📊 Total games in system:', data.totalGames || 0);
            
            if (data.games && data.games.length > 0) {
                // Show available room IDs
                const roomIds = [...new Set(data.games.map(g => g.roomId))];
                console.log('🏠 Available room IDs:', roomIds);
                
                // Filter by room if specified
                const targetRoom = roomId || gameState.roomId;
                if (targetRoom) {
                    const roomGames = data.games.filter(g => g.roomId === targetRoom);
                    console.log(`🎮 Games for room ${targetRoom}:`, roomGames.length);
                    roomGames.forEach((game, i) => {
                        console.log(`  ${i + 1}. ${game.completedAt} - Winner: ${game.players[0]?.name} (${game.players[0]?.score} pts)`);
                    });
                    return roomGames;
                } else {
                    console.log('🎮 All games:', data.games);
                    return data.games;
                }
            } else {
                console.log('📭 No games found in system');
                return [];
            }
        } catch (error) {
            console.error('❌ Error querying leaderboard:', error);
            return null;
        }
    };
    
    console.log('🚀 Development mode active!');
    console.log('Game testing: showMockData(), hideMockData(), setTestRoomId("ABC123")');
    console.log('Board testing: showMockBoards(), setTestBoardId(), setRealBoardId()');
    console.log('Data testing: queryLeaderboard(), queryLeaderboard("ROOM123")');
}

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

// Always available console functions (even in production)
// Helper function to get total scores for players in current room
async function getTotalScoresForRoom() {
    try {
        const timestamp = Date.now();
        const url = `${SERVER_URL}/leaderboard?t=${timestamp}`;
        const response = await fetch(url, { cache: 'no-cache' });
        
        if (!response.ok) return {};
        
        const data = await response.json();
        const roomGames = data.games?.filter(game => game.roomId === gameState.roomId) || [];
        
        // Calculate total scores for each player
        const totalScores = {};
        roomGames.forEach(game => {
            game.players.forEach(player => {
                if (!totalScores[player.name]) {
                    totalScores[player.name] = 0;
                }
                totalScores[player.name] += player.score;
            });
        });
        
        return totalScores;
    } catch (error) {
        console.error('Error fetching total scores:', error);
        return {};
    }
}

window.debugRoomHistory = async function() {
    console.log('🏠 Debug: Room History Analysis');
    console.log('=====================================');
    
    try {
        console.log('Current gameState:', {
            roomId: gameState.roomId,
            roomIdType: typeof gameState.roomId,
            phase: gameState.phase,
            playerName: gameState.playerName
        });
        
        // Check if history element exists
        const historyContent = document.getElementById('history-content');
        console.log('History element exists:', !!historyContent);
        if (historyContent) {
            console.log('Current history content:', historyContent.innerHTML);
        }
        
        // Fetch leaderboard data (same as loadLeaderboardHistory)
        const timestamp = Date.now();
        const url = `${SERVER_URL}/leaderboard?t=${timestamp}`;
        console.log('Fetching from:', url);
        
        const response = await fetch(url, {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
            return null;
        }
        
        const data = await response.json();
        console.log('Raw leaderboard data:', data);
        
        if (data.success && data.games && data.games.length > 0) {
            const availableRoomIds = [...new Set(data.games.map(game => game.roomId))];
            console.log('Available room IDs:', availableRoomIds.map(id => `"${id}" (${typeof id})`));
            
            // Filter exactly like loadLeaderboardHistory does
            const roomGames = data.games.filter(game => game.roomId === gameState.roomId);
            console.log(`Filtered games for room "${gameState.roomId}":`, roomGames);
            
            if (roomGames.length === 0) {
                console.log('❌ No games found for current room');
                console.log('Checking each game individually:');
                data.games.forEach((game, index) => {
                    const match = game.roomId === gameState.roomId;
                    console.log(`Game ${index}: roomId="${game.roomId}" (${typeof game.roomId}) ${match ? '✅' : '❌'} matches "${gameState.roomId}" (${typeof gameState.roomId})`);
                });
            } else {
                console.log(`✅ Found ${roomGames.length} games for current room`);
                roomGames.forEach((game, index) => {
                    console.log(`Game ${index + 1}:`, {
                        gameId: game.gameId,
                        timestamp: new Date(game.timestamp).toLocaleString(),
                        players: game.players.map(p => `${p.name}: ${p.score}`)
                    });
                });
            }
            
            return roomGames;
        } else {
            console.log('❌ No games in leaderboard data');
            return [];
        }
    } catch (error) {
        console.error('❌ Error in debugRoomHistory:', error);
        return null;
    }
};

window.debugLeaderboard = async function(roomId = null) {
    console.log('🔍 Debug: Querying leaderboard data...');
    try {
        const timestamp = Date.now();
        const url = `${SERVER_URL}/leaderboard?t=${timestamp}`;
        const response = await fetch(url, { cache: 'no-cache' });
        
        if (!response.ok) {
            console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
            return null;
        }
        
        const data = await response.json();
        console.log('Current state:', {
            currentRoomId: gameState.roomId,
            totalGamesInSystem: data.totalGames,
            gameStatePhase: gameState.phase
        });
        
        if (data.games?.length > 0) {
            const roomIds = [...new Set(data.games.map(g => g.roomId))];
            console.table({
                'Total Games': data.totalGames,
                'Available Room IDs': roomIds.join(', '),
                'Current Room': gameState.roomId || 'None',
                'Games for Current Room': gameState.roomId ? data.games.filter(g => g.roomId === gameState.roomId).length : 0
            });
            
            if (roomId || gameState.roomId) {
                const target = roomId || gameState.roomId;
                console.log('🔍 debugLeaderboard filtering:');
                console.log('- target roomId:', target, '(type:', typeof target, ')');
                console.log('- available roomIds:', [...new Set(data.games.map(g => g.roomId))].map(id => `${id} (${typeof id})`));
                const games = data.games.filter(g => g.roomId === target);
                console.log(`Games for room ${target}:`, games);
                return games;
            }
            return data.games;
        } else {
            console.log('📭 No completed games in system');
            return [];
        }
    } catch (error) {
        console.error('❌ Network error:', error);
        return null;
    }
};

// Initialize socket connection
function initSocket() {
    socket = io(SERVER_URL);
    
    socket.on('connect', () => {
        console.log('Connected to server');
        gameState.playerId = socket.id;
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });
    
    // Game events
    socket.on('player-joined', async (data) => {
        updateGameState(data.gameState);
        await updateUI();
        
        // Only reload leaderboard history when the current user joins (not when others join)
        const joinedPlayer = data.player;
        if (gameState.phase === 'lobby' && gameState.roomId && 
            joinedPlayer && joinedPlayer.id === gameState.playerId) {
            // Don't load if showRoomLobby will be called soon (which loads it anyway)
            setTimeout(() => {
                console.log('🔄 Loading history after current user joined (if not loaded recently) - roomId:', gameState.roomId);
                loadLeaderboardHistory(); // This will be debounced if called too frequently
            }, 1000); // Longer delay to avoid conflict with showRoomLobby
        }
    });
    
    socket.on('player-left', async (data) => {
        updateGameState(data.gameState);
        await updateUI();
    });
    
    socket.on('game-started', (data) => {
        updateGameState(data);
        startMultiplayerGame();
    });
    
    socket.on('player-answered', (data) => {
        console.log(`${data.playerName} answered: ${data.answer} (${data.isCorrect ? 'Correct' : 'Wrong'})`);
        // Could show this in UI
    });
    
    socket.on('score-updated', (data) => {
        // Update our local game state with server scores
        gameState.players = data.players;
        
        // Check if all players are finished
        const wasAllFinished = gameState.allPlayersFinished;
        gameState.allPlayersFinished = gameState.players.every(player => player.finished);
        
        // Auto-show leaderboard when game finishes
        if (!wasAllFinished && gameState.allPlayersFinished) {
            console.log('All players finished detected in score-updated - waiting for game-finished event');
            // Set local player phase to finished so they see game over board state
            gameState.phase = 'finished';
            timer = -1; // Stop timer
            
            // Note: Color setting is now handled by the dedicated 'game-finished' event
            // This ensures all players get synchronized color updates
        }
        
        updateLeaderboard();
    });

    socket.on('game-restarted', (data) => {
        updateGameState(data);
        startMultiplayerGame();
    });

    socket.on('returned-to-lobby', async (data) => {
        updateGameState(data);
        await returnToLobbyUI();
    });

    // Handle game finished event - ensures all players get final colors
    socket.on('game-finished', (data) => {
        console.log('🏁 Game finished event received:', data);
        
        // Update game state with final results
        updateGameState(data.gameState);
        gameState.phase = 'finished';
        timer = -1;
        
        // Set win/loss background color for all players (always override previous colors)
        failed = true; // Mark as finished state
        const winResult = didCurrentPlayerWin();
        console.log('🎯 Final win calculation:', winResult);
        
        if (winResult.isWinner) {
            if (winResult.isTie) {
                document.bgColor = 'goldenrod'; // Gold for tie
                console.log('🏆 Game finished - You tied for first place! Setting background to goldenrod');
            } else {
                document.bgColor = 'darkgoldenrod'; // Dark gold for clear win
                console.log('🏆 Game finished - You won! Setting background to darkgoldenrod');
            }
        } else {
            document.bgColor = 'crimson'; // Red for loss
            console.log('💥 Game finished - You lost. Setting background to crimson');
        }
        
        // Start 10-second countdown to return to lobby
        lobbyCountdown = 10;
        lobbyCountdownActive = true;
        lobbyCountdownCancelled = false; // Reset cancelled flag
        console.log(`⏰ Started ${lobbyCountdown}-second countdown to return to lobby`);
        
        // Auto-show leaderboard after a longer delay to let players see the final board
        setTimeout(() => {
            showLeaderboard();
        }, 1500);
        
        updateLeaderboard();
    });

    socket.on('leaderboard-updated', (data) => {
        console.log('Received leaderboard update:', data);
        if (data.games && gameState.roomId) {
            // Filter to only show games from current room
            const roomGames = data.games.filter(game => game.roomId === gameState.roomId);
            console.log(`Real-time update: ${roomGames.length} games for room ${gameState.roomId}`);
            displayLeaderboardHistory(roomGames);
        }
    });
}

// UI Functions
function showMainMenu() {
    // Clear the canvas and reset background
    if (typeof clear === 'function') {
        clear();
    }
    
    // Reset document background color to default
    document.bgColor = '';
    document.body.style.backgroundColor = '';
    
    // Hide all game-related UI elements
    document.getElementById('leaderboard').style.display = 'none';
    document.getElementById('leaderboard-toggle').style.display = 'none';
    document.getElementById('resign-button').style.display = 'none';
    
    // Reset leaderboard visibility flag
    leaderboardVisible = false;
    
    // Reset game state variables
    failed = false;
    started = false;
    gameState.phase = 'menu';
    
    document.getElementById('main-menu').classList.remove('hidden');
    document.getElementById('join-room-panel').classList.add('hidden');
    document.getElementById('room-panel').classList.add('hidden');
}

// Prevent infinite retry loops
let historyRetryCount = 0;
const MAX_HISTORY_RETRIES = 1;

// Track leaderboard history calls for debugging
let leaderboardHistoryCallCount = 0;
let lastHistoryLoadTime = 0;
let historyLoadInProgress = false;
const HISTORY_LOAD_DEBOUNCE_MS = 2000; // Don't reload more than once every 2 seconds

// Debug function to show leaderboard loading stats
function debugLeaderboardStats() {
    console.log('=== LEADERBOARD STATS ===');
    console.log('Total calls:', leaderboardHistoryCallCount);
    console.log('Last load time:', new Date(lastHistoryLoadTime).toLocaleTimeString());
    console.log('Time since last load:', Date.now() - lastHistoryLoadTime, 'ms');
    console.log('Load in progress:', historyLoadInProgress);
    console.log('========================');
}

// Reset counter (useful for testing)
function resetLeaderboardStats() {
    leaderboardHistoryCallCount = 0;
    lastHistoryLoadTime = 0;
    historyLoadInProgress = false;
    console.log('✅ Leaderboard stats reset');
}

// Load and display leaderboard history for current room
async function loadLeaderboardHistory(isRetry = false, forceLoad = false) {
    leaderboardHistoryCallCount++;
    console.log(`🔄 Loading leaderboard history (#${leaderboardHistoryCallCount}) for room:`, gameState.roomId);
    
    // Debounce frequent calls
    const now = Date.now();
    if (!forceLoad && !isRetry) {
        if (historyLoadInProgress) {
            console.log('⏭️ Skipping - history load already in progress');
            return;
        }
        if (now - lastHistoryLoadTime < HISTORY_LOAD_DEBOUNCE_MS) {
            console.log(`⏭️ Skipping - too soon (${now - lastHistoryLoadTime}ms < ${HISTORY_LOAD_DEBOUNCE_MS}ms)`);
            return;
        }
    }
    
    historyLoadInProgress = true;
    lastHistoryLoadTime = now;
    console.log('🔍 Current gameState.phase:', gameState.phase);
    console.log('🔍 UI overlay visible:', document.getElementById('ui-overlay').style.display !== 'none');
    
    try {
        const historyContent = document.getElementById('history-content');
        if (!historyContent) {
            console.warn('⚠️ History content element not found');
            return; // Element doesn't exist yet
        }
        
        // Only load if we're in a room
        if (!gameState.roomId) {
            console.warn('⚠️ No room ID available for leaderboard history');
            historyContent.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">Join a room to see history</div>';
            return;
        }
        
        historyContent.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">Loading...</div>';
        
        // Use mock data only when explicitly enabled
        if (useMockData) {
            console.log('🚀 Development mode: Using mock data');
            setTimeout(() => {
                const roomGames = MOCK_GAMES.filter(game => game.roomId === gameState.roomId);
                console.log(`Mock data: ${roomGames.length} games for room ${gameState.roomId}`);
                
                if (roomGames.length > 0) {
                    displayLeaderboardHistory(roomGames);
                } else {
                    historyContent.innerHTML = `<div style="color: #888; text-align: center; padding: 20px;">No completed games yet<br>for room <strong>${gameState.roomId}</strong><br><small style="color: #666;">(Dev mode)</small></div>`;
                }
            }, 500); // Simulate loading delay
            return;
        }
        
        // Add cache-busting timestamp to ensure fresh data
        const timestamp = Date.now();
        const url = `${SERVER_URL}/leaderboard?t=${timestamp}`;
        console.log('Loading leaderboard from:', url);
        const response = await fetch(url, {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📊 Leaderboard data received:', data);
        console.log('🎯 Current room ID:', gameState.roomId);
        
        if (data.success && data.games && data.games.length > 0) {
            // Log all available room IDs for debugging
            const availableRoomIds = [...new Set(data.games.map(game => game.roomId))];
            console.log('🏠 Available room IDs in leaderboard:', availableRoomIds);
            
            // Filter games to only show ones from the current room
            console.log('🔍 Filtering games by room ID comparison:');
            console.log('- gameState.roomId:', gameState.roomId, '(type:', typeof gameState.roomId, ')');
            console.log('- Available room IDs:', availableRoomIds.map(id => `${id} (${typeof id})`));
            
            const roomGames = data.games.filter(game => {
                const match = game.roomId === gameState.roomId;
                if (!match) {
                    console.log(`- Game roomId: "${game.roomId}" (${typeof game.roomId}) !== gameState.roomId: "${gameState.roomId}" (${typeof gameState.roomId})`);
                }
                return match;
            });
            console.log(`✅ Filtered to ${roomGames.length} games for room ${gameState.roomId}`);
            
            if (roomGames.length > 0) {
                displayLeaderboardHistory(roomGames);
            } else {
                // If no games found and we just joined, try again once
                // (server might not have updated data yet)
                const isRecentJoin = gameState.phase === 'lobby' && gameState.roomId;
                if (isRecentJoin && !isRetry && historyRetryCount < MAX_HISTORY_RETRIES) {
                    historyRetryCount++;
                    console.log('⏳ No games found on first try, retrying in 2 seconds... (attempt', historyRetryCount, '/', MAX_HISTORY_RETRIES, ')');
                    setTimeout(() => {
                        console.log('🔄 Retrying loadLeaderboardHistory after delay');
                        loadLeaderboardHistory(true);
                    }, 2000);
                } else {
                    // Reset retry counter for next time
                    historyRetryCount = 0;
                }
                
                // Show recent games from other rooms as examples, but with a clear message
                const recentGames = data.games.slice(0, 3); // Show last 3 games from any room
                if (recentGames.length > 0) {
                    historyContent.innerHTML = `
                        <div style="color: #888; text-align: center; padding: 20px;">
                            No completed games yet<br>for room <strong>${gameState.roomId}</strong>
                            <br><small style="color: #666;">Total games in system: ${data.games.length}</small>
                            <br><button onclick="loadLeaderboardHistory(false, true)" style="margin-top: 10px; padding: 5px 10px; background: #666; color: white; border: none; border-radius: 3px; cursor: pointer;">🔄 Refresh</button>
                        </div>
                        <div style="color: #aaa; font-size: 11px; text-align: center; margin: 10px 0; border-top: 1px solid #555; padding-top: 10px;">
                            Recent games from other rooms:
                        </div>
                    `;
                    // Temporarily store the original content element
                    const originalHistoryContent = historyContent.innerHTML;
                    displayLeaderboardHistory(recentGames);
                    // Extract just the games and append to our custom layout
                    const gamesHTML = historyContent.innerHTML;
                    historyContent.innerHTML = originalHistoryContent + gamesHTML;
                } else {
                    historyContent.innerHTML = `<div style="color: #888; text-align: center; padding: 20px;">No completed games yet<br>for room <strong>${gameState.roomId}</strong><br><small style="color: #666;">Total games in system: ${data.games.length}</small><br><button onclick="loadLeaderboardHistory(false, true)" style="margin-top: 10px; padding: 5px 10px; background: #666; color: white; border: none; border-radius: 3px; cursor: pointer;">🔄 Refresh</button></div>`;
                }
            }
        } else {
            historyContent.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">No completed games yet</div>';
        }
    } catch (error) {
        console.error('Error loading leaderboard history:', error);
        historyContent.innerHTML = `<div style="color: #f44; text-align: center; padding: 20px;">
            Failed to load: ${error.message}<br>
            <button onclick="loadLeaderboardHistory(false, true)" style="margin-top: 10px; padding: 5px 10px; background: #666; color: white; border: none; border-radius: 3px; cursor: pointer;">
                Retry
            </button>
        </div>`;
    } finally {
        historyLoadInProgress = false;
        console.log('✅ History load completed/failed - flag reset');
    }
}

function displayLeaderboardHistory(games) {
    const historyContent = document.getElementById('history-content');
    
    if (games.length === 0) {
        historyContent.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">No games yet</div>';
        return;
    }
    
    const html = games.map(game => {
        const date = new Date(game.completedAt);
        const timeAgo = getTimeAgo(date);
        const duration = formatDuration(game.duration);
        
        // Find the highest score
        const highestScore = game.players[0].score;
        
        // Find all players with the highest score (ties)
        const winners = game.players.filter(player => player.score === highestScore);
        
        let resultText;
        let resultColor;
        
        if (winners.length === 1) {
            // Single winner
            const pointText = highestScore === 1 ? 'point' : 'points';
            resultText = `${winners[0].name} won with ${highestScore} ${pointText}`;
            resultColor = '#4CAF50';
        } else {
            // Multiple players tied (always show names)
            const winnerNames = winners.map(w => w.name).join(', ');
            const pointText = highestScore === 1 ? 'pt' : 'pts';
            if (winners.length === game.players.length) {
                // Everyone tied
                resultText = `All tied: ${winnerNames} (${highestScore} ${pointText})`;
            } else {
                // Some players tied for first
                resultText = `${winners.length}-way tie: ${winnerNames} (${highestScore} ${pointText})`;
            }
            resultColor = '#FFA726';
        }
        
        return `
            <div style="margin-bottom: 10px; padding: 8px; background: #444; border-radius: 3px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: ${resultColor};">${resultText}</strong>
                    </div>
                    <div style="color: #888; font-size: 10px;">${timeAgo}</div>
                </div>
                <div style="color: #aaa; font-size: 10px; margin-top: 2px;">
                    ${game.players.length} players • ${duration}
                </div>
                <div style="color: #bbb; font-size: 10px; margin-top: 4px; line-height: 1.3;">
                    ${game.players.map(player => 
                        `${player.name}: ${player.score}${player.isCreator ? ' (Host)' : ''}`
                    ).join(' • ')}
                </div>
            </div>
        `;
    }).join('');
    
    historyContent.innerHTML = html;
}

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

function showJoinRoom() {
    let playerName = document.getElementById('player-name').value.trim();
    if (!playerName) {
        playerName = getRandomName();
        document.getElementById('player-name').value = playerName;
    }
    
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('join-room-panel').classList.remove('hidden');
}

// Initialize the UI
let uiInitialized = false;
let currentTimePerBoard = defaultTimePerBoard;
let currentTotalBoards = 20; // Default number of boards
let unlimitedTimeMode = false;

// LocalStorage keys
const STORAGE_KEYS = {
    ROOM_ID: 'countbattle_room_id',
    PLAYER_NAME: 'countbattle_player_name',
    PLAYER_UUID: 'countbattle_player_uuid', // Unique identifier for host persistence
    TIME_PER_BOARD: 'countbattle_time_per_board',
    TOTAL_BOARDS: 'countbattle_total_boards',
    UNLIMITED_TIME: 'countbattle_unlimited_time',
    HARD_MODE: 'countbattle_hard_mode'
};

// LocalStorage helper functions
function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn('Failed to save to localStorage:', error);
    }
}

// Test function to analyze territory scores for all boards
window.testAllTerritoryScores = function(maxBoards = 99) {
    console.log('🧪 Testing territory scores for all boards...');
    
    const results = [];
    const uniqueResults = new Map();
    
    const currentBoards = getCurrentBoards();
    const currentDeadStones = getCurrentDeadStones();
    for (let i = 0; i <= maxBoards && i < currentBoards.length; i++) {
        try {
            const score = calculateTerritoryScore(currentBoards[i], currentDeadStones[i]);
            const resultKey = `${score.winningColor}:${score.difference}`;
            
            results.push({
                boardIndex: i,
                winningColor: score.winningColor,
                difference: score.difference,
                blackScore: score.blackScore,
                whiteScore: score.whiteScore
            });
            
            if (!uniqueResults.has(resultKey)) {
                uniqueResults.set(resultKey, []);
            }
            uniqueResults.get(resultKey).push(i);
            
        } catch (error) {
            console.error(`❌ Error processing board ${i}:`, error);
        }
    }
    
    console.log(`📊 Analyzed ${results.length} boards. Found ${uniqueResults.size} unique results:`);
    console.log('\n=== UNIQUE TERRITORY SCORING RESULTS ===');
    
    // Sort by winning color and difference
    const sortedResults = Array.from(uniqueResults.entries()).sort((a, b) => {
        const [colorA, diffA] = a[0].split(':');
        const [colorB, diffB] = b[0].split(':');
        
        if (colorA !== colorB) {
            return colorA.localeCompare(colorB);
        }
        return parseInt(diffA) - parseInt(diffB);
    });
    
    sortedResults.forEach(([key, boardIndices]) => {
        const [color, diff] = key.split(':');
        console.log(`\n${color.toUpperCase()} wins by ${diff}:`);
        console.log(`  Boards: [${boardIndices.slice(0, 10).join(', ')}${boardIndices.length > 10 ? `, ... +${boardIndices.length - 10} more` : ''}]`);
        
        // Show detailed example for first board
        const exampleBoard = boardIndices[0];
        const exampleResult = results.find(r => r.boardIndex === exampleBoard);
        console.log(`  Example (board ${exampleBoard}): Black=${exampleResult.blackScore}, White=${exampleResult.whiteScore}`);
    });
    
    console.log('\n=== SUMMARY ===');
    const blackWins = Array.from(uniqueResults.keys()).filter(k => k.startsWith('black')).length;
    const whiteWins = Array.from(uniqueResults.keys()).filter(k => k.startsWith('white')).length;
    console.log(`Black winning positions: ${blackWins}`);
    console.log(`White winning positions: ${whiteWins}`);
    
    return results;
};

// Debug function to check hard mode state consistency
function debugHardModeState() {
    const checkbox = document.getElementById('hard-mode');
    const checkboxValue = checkbox ? checkbox.checked : 'NOT FOUND';
    const localStorageValue = loadFromStorage(STORAGE_KEYS.HARD_MODE, false);
    const gameStateValue = gameState.settings ? gameState.settings.hardMode : 'NOT SET';
    
    console.log('=== HARD MODE STATE DEBUG ===');
    console.log('Checkbox value:', checkboxValue);
    console.log('localStorage value:', localStorageValue);
    console.log('gameState.settings.hardMode:', gameStateValue);
    console.log('All in sync?', 
        checkboxValue === localStorageValue && 
        localStorageValue === gameStateValue);
    console.log('===============================');
    
    return {
        checkbox: checkboxValue,
        localStorage: localStorageValue,
        gameState: gameStateValue,
        inSync: checkboxValue === localStorageValue && localStorageValue === gameStateValue
    };
}

function loadFromStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.warn('Failed to load from localStorage:', error);
        return defaultValue;
    }
}

// Generate or get unique player UUID for host persistence
function getPlayerUUID() {
    let uuid = loadFromStorage(STORAGE_KEYS.PLAYER_UUID, null);
    if (!uuid) {
        // Generate a simple UUID (good enough for our purposes)
        uuid = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        saveToStorage(STORAGE_KEYS.PLAYER_UUID, uuid);
        console.log('Generated new player UUID:', uuid);
    }
    return uuid;
}

function clearRoomStorage() {
    try {
        localStorage.removeItem(STORAGE_KEYS.ROOM_ID);
        console.log('Cleared room storage');
    } catch (error) {
        console.warn('Failed to clear room storage:', error);
    }
}
let sliderUpdateInProgress = false;

function initializeUI() {
    if (uiInitialized) {
        console.log('UI already initialized, skipping');
        return;
    }
    
    console.log('=== initializeUI called ===');
    const timeSlider = document.getElementById('time-per-board');
    const totalBoardsInput = document.getElementById('total-boards');
    const timeDisplay = document.getElementById('time-display');
    const unlimitedCheckbox = document.getElementById('unlimited-time');
    const timeControls = document.getElementById('time-controls');
    const playerNameInput = document.getElementById('player-name');
    
    // Load saved settings from localStorage
    const savedTime = loadFromStorage(STORAGE_KEYS.TIME_PER_BOARD, defaultTimePerBoard);
    const savedTotalBoards = loadFromStorage(STORAGE_KEYS.TOTAL_BOARDS, defaultTotalBoards);
    const savedUnlimited = loadFromStorage(STORAGE_KEYS.UNLIMITED_TIME, false);
    const savedPlayerName = loadFromStorage(STORAGE_KEYS.PLAYER_NAME, '');
    const savedRoomId = loadFromStorage(STORAGE_KEYS.ROOM_ID, null);
    
    console.log('DOM Elements found:');
    console.log('- timeSlider:', !!timeSlider, timeSlider ? `value=${timeSlider.value}` : 'null');
    console.log('- totalBoardsInput:', !!totalBoardsInput, totalBoardsInput ? `value=${totalBoardsInput.value}` : 'null');
    console.log('- timeDisplay:', !!timeDisplay);
    console.log('- unlimitedCheckbox:', !!unlimitedCheckbox);
    console.log('- playerNameInput:', !!playerNameInput);
    console.log('localStorage values:');
    console.log('- savedTime:', savedTime);
    console.log('- savedTotalBoards:', savedTotalBoards);
    console.log('- savedUnlimited:', savedUnlimited);
    console.log('- savedPlayerName:', savedPlayerName);
    console.log('- savedRoomId:', savedRoomId);
    
    // Restore player name if saved
    if (playerNameInput && savedPlayerName) {
        playerNameInput.value = savedPlayerName;
        console.log('Restored player name:', savedPlayerName);
    }
    
    // Initialize unlimited mode checkbox
    if (unlimitedCheckbox) {
        unlimitedTimeMode = savedUnlimited;
        unlimitedCheckbox.checked = unlimitedTimeMode;
        
        unlimitedCheckbox.addEventListener('change', function(e) {
            unlimitedTimeMode = e.target.checked;
            saveToStorage(STORAGE_KEYS.UNLIMITED_TIME, unlimitedTimeMode);
            updateTimeControlsVisibility();
            console.log('Unlimited mode:', unlimitedTimeMode);
        });
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
    
    // Initialize hard mode toggle
    const hardModeCheckbox = document.getElementById('hard-mode');
    if (hardModeCheckbox) {
        console.log('=== Initializing hard mode toggle ===');
        
        // Set initial state (default to false)
        const savedHardMode = loadFromStorage(STORAGE_KEYS.HARD_MODE, false);
        hardModeCheckbox.checked = savedHardMode;
        console.log('✓ Set hard mode initial state to:', savedHardMode);
        
        // Initialize gameState.settings.hardMode with saved value
        if (!gameState.settings) {
            gameState.settings = {};
        }
        gameState.settings.hardMode = savedHardMode;
        console.log('✓ Initialized gameState.settings.hardMode to:', gameState.settings.hardMode);
        
        // Add event listener for hard mode toggle
        hardModeCheckbox.addEventListener('change', function(e) {
            const isHardMode = e.target.checked;
            console.log('🎯 Hard mode toggled to:', isHardMode);
            
            // Update gameState.settings.hardMode immediately
            if (!gameState.settings) {
                gameState.settings = {};
            }
            gameState.settings.hardMode = isHardMode;
            console.log('✓ Updated gameState.settings.hardMode to:', gameState.settings.hardMode);
            
            // Save to localStorage
            saveToStorage(STORAGE_KEYS.HARD_MODE, isHardMode);
            console.log('✓ Saved hard mode to localStorage:', isHardMode);
            
            // Debug state after toggle
            setTimeout(debugHardModeState, 10); // Small delay to ensure all updates are complete
        });
        
        console.log('✓ Hard mode toggle initialized');
        
        // Debug initial state
        setTimeout(debugHardModeState, 10);
    } else {
        console.error('❌ Hard mode checkbox not found in DOM');
    }
    
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
    
    // Update visibility based on unlimited mode
    updateTimeControlsVisibility();
    
    // Try to reconnect to saved room if exists
    if (savedRoomId) {
        console.log('Found saved room ID:', savedRoomId);
        tryReconnectToRoom(savedRoomId);
    }
    
    uiInitialized = true;
}

// Try to reconnect to a previously joined room
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

function updateTimeControlsVisibility() {
    const timeControls = document.getElementById('time-controls');
    if (timeControls) {
        timeControls.style.display = unlimitedTimeMode ? 'none' : 'block';
    }
}

function handleTimeChange(value) {
    console.log('=== handleTimeChange START ===');
    console.log('📥 Input value:', value);
    
    if (value && !isNaN(value)) {
        currentTimePerBoard = value;
        console.log('✓ Updated currentTimePerBoard to:', currentTimePerBoard);
        
        // Save to localStorage
        saveToStorage(STORAGE_KEYS.TIME_PER_BOARD, currentTimePerBoard);
        console.log('✓ Saved to localStorage:', currentTimePerBoard);
        
        // Verify localStorage was saved
        const verifyStorage = localStorage.getItem('timePerBoard');
        console.log('🔍 Verify localStorage read back:', verifyStorage);
    } else {
        console.log('❌ Invalid value, skipping update');
    }
    
    console.log('=== handleTimeChange END ===\n');
}


function createRoom() {
    let playerName = document.getElementById('player-name').value.trim();
    if (!playerName) {
        playerName = getRandomName();
        document.getElementById('player-name').value = playerName;
    }
    
    // Ensure socket is connected
    if (!socket || !socket.connected) {
        alert('Not connected to server. Please wait and try again.');
        console.log('Socket not ready:', socket);
        return;
    }
    
    const timePerBoard = unlimitedTimeMode ? -1 : currentTimePerBoard;
    
    gameState.playerName = playerName;
    
    // Save player name to localStorage
    saveToStorage(STORAGE_KEYS.PLAYER_NAME, playerName);
    
    // First check if this creator already has an existing room
    const creatorUUID = getPlayerUUID();
    console.log('Checking for existing room for creator:', creatorUUID);
    
    socket.emit('find-creator-room', {
        creatorUUID: creatorUUID
    }, (findResponse) => {
        if (findResponse.success) {
            console.log('Found existing room, reconnecting to:', findResponse.roomId);
            // Reconnect to existing room instead of creating new one
            gameState.roomId = findResponse.roomId;
            
            // Try to rejoin the existing room
            socket.emit('join-room', {
                roomId: findResponse.roomId,
                playerName: playerName,
                playerUUID: creatorUUID,
                isDevMode: IS_DEV_MODE
            }, (joinResponse) => {
                if (joinResponse.success) {
                    console.log('Successfully reconnected to existing room:', findResponse.roomId);
                    
                    // Update game state first
                    updateGameState(joinResponse.gameState);
                    
                    // Set isCreator flag from server response
                    gameState.isCreator = joinResponse.player.isCreator;
                    
                    // Save room ID to localStorage
                    saveToStorage(STORAGE_KEYS.ROOM_ID, findResponse.roomId);
                    
                    showRoomLobby();
                } else {
                    console.log('Failed to rejoin existing room, creating new one');
                    createNewRoom(playerName, timePerBoard, creatorUUID);
                }
            });
        } else {
            console.log('No existing room found, creating new one');
            createNewRoom(playerName, timePerBoard, creatorUUID);
        }
    });
}

function createNewRoom(playerName, timePerBoard, creatorUUID) {
    // Get hard mode setting from UI
    const hardModeCheckbox = document.getElementById('hard-mode');
    const hardMode = hardModeCheckbox ? hardModeCheckbox.checked : false;
    console.log('🎯 Creating room with hard mode checkbox:', hardModeCheckbox ? 'found' : 'not found');
    console.log('🎯 Creating room with hard mode value:', hardMode);
    
    // Use settings with configurable time and boards
    socket.emit('create-room', {
        playerUUID: creatorUUID, // Include UUID for host persistence
        settings: {
            timePerBoard: timePerBoard, // Configurable time per board or -1 for unlimited
            totalBoards: currentTotalBoards, // Configurable number of boards
            unlimited: false, // Use limited boards mode
            unlimitedTime: unlimitedTimeMode, // Unlimited time mode
            progressiveDifficulty: true,
            hardMode: hardMode // Exact score counting mode
        }
    }, (response) => {
        if (response.success) {
            gameState.roomId = response.roomId;
            gameState.isCreator = true;
            
            // Save room ID to localStorage
            saveToStorage(STORAGE_KEYS.ROOM_ID, response.roomId);
            console.log('Saved room ID to localStorage:', response.roomId);
            
            joinCreatedRoom();
        } else {
            alert('Failed to create room: ' + response.error);
        }
    });
}

function joinCreatedRoom() {
    socket.emit('join-room', {
        roomId: gameState.roomId,
        playerName: gameState.playerName,
        playerUUID: getPlayerUUID(), // Include UUID for host persistence
        isDevMode: IS_DEV_MODE
    }, (response) => {
        if (response.success) {
            gameState.isCreator = response.player.isCreator;
            updateGameState(response.gameState);
            showRoomLobby();
        } else {
            alert('Failed to join room: ' + response.error);
        }
    });
}

function handleJoinRoomSuccess(response) {
    gameState.isCreator = response.player.isCreator;
    gameState.roomId = response.gameState.roomId;
    updateGameState(response.gameState);
    
    // Save room ID to localStorage
    saveToStorage(STORAGE_KEYS.ROOM_ID, response.gameState.roomId);
    console.log('Saved room ID to localStorage:', response.gameState.roomId);
    
    showRoomLobby();
}

function joinRoom() {
    let playerName = document.getElementById('player-name').value.trim();
    const roomCode = document.getElementById('room-code').value.trim().toUpperCase();
    
    if (!playerName) {
        playerName = getRandomName();
        document.getElementById('player-name').value = playerName;
    }
    
    if (!roomCode) {
        alert('Please enter room code');
        return;
    }
    
    gameState.playerName = playerName;
    gameState.roomId = roomCode;
    
    // Save player name to localStorage
    saveToStorage(STORAGE_KEYS.PLAYER_NAME, playerName);
    
    socket.emit('join-room', {
        roomId: roomCode,
        playerName: playerName,
        playerUUID: getPlayerUUID(), // Include UUID for host persistence
        isDevMode: IS_DEV_MODE
    }, (response) => {
        if (response.success) {
            handleJoinRoomSuccess(response);
        } else {
            alert('Failed to join room: ' + response.error);
            // Clear room storage if join failed
            clearRoomStorage();
        }
    });
}

async function showRoomLobby() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('join-room-panel').classList.add('hidden');
    document.getElementById('room-panel').classList.remove('hidden');
    
    // Hide leaderboard elements when entering lobby
    document.getElementById('leaderboard').style.display = 'none';
    document.getElementById('leaderboard-toggle').style.display = 'none';
    
    
    // Show dev mode indicator if in development
    const devIndicator = document.getElementById('dev-mode-indicator');
    if (devIndicator) {
        devIndicator.style.display = IS_DEV_MODE ? 'inline' : 'none';
    }
    
    gameState.phase = 'lobby';
    await updateUI();
    
    // Ensure leaderboard history loads after DOM updates
    setTimeout(() => {
        console.log('🔄 Loading history in showRoomLobby - roomId:', gameState.roomId);
        loadLeaderboardHistory();
    }, 300); // Increased delay
}

function startGame() {
    if (!gameState.isCreator) return;
    
    // Use current settings from UI
    const timePerBoard = unlimitedTimeMode ? -1 : currentTimePerBoard;
    const hardModeCheckbox = document.getElementById('hard-mode');
    const hardMode = hardModeCheckbox ? hardModeCheckbox.checked : false;
    const settings = {
        timePerBoard: timePerBoard,
        totalBoards: currentTotalBoards,
        unlimited: false,
        hardMode: hardMode // Include hard mode setting
    };
    
    console.log('🎯 Starting game with hard mode checkbox:', hardModeCheckbox ? 'found' : 'not found');
    console.log('🎯 Starting game with hard mode value:', hardMode);
    console.log('🎯 Full settings object:', settings);
    
    socket.emit('start-game', { settings: settings }, (response) => {
        if (!response.success) {
            alert('Failed to start game: ' + response.error);
        }
    });
}

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
    // Show feedback to user
    const copyButton = document.querySelector('button[onclick="copyRoomLink()"]');
    if (copyButton) {
        const originalText = copyButton.innerHTML;
        const originalBackground = copyButton.style.background;
        
        copyButton.innerHTML = isError ? '❌ Failed' : '✅ Copied!';
        copyButton.style.background = isError ? '#f44336' : '#4CAF50';
        copyButton.disabled = true;
        
        setTimeout(() => {
            copyButton.innerHTML = originalText;
            copyButton.style.background = originalBackground;
            copyButton.disabled = false;
        }, 2000);
    }
    
    console.log(message);
}

function updateResignButtonVisibility() {
    const resignButton = document.getElementById('resign-button');
    if (resignButton) {
        // Show resign button only during active gameplay (not finished)
        if (gameState.phase === 'playing' && !failed) {
            resignButton.style.display = 'block';
        } else {
            resignButton.style.display = 'none';
        }
    }
}

function resignGame() {
    // Show confirmation dialog
    if (!confirm('Are you sure you want to resign? This will end your game immediately.')) {
        return;
    }
    
    console.log('Player resigned from the game');
    
    // Mark ourselves as finished locally (resignation only affects current player)
    const ourPlayer = gameState.players.find(p => p.id === gameState.playerId);
    if (ourPlayer) {
        ourPlayer.finished = true;
    }
    
    // Set resign state for current player only
    gameState.phase = 'finished';
    timer = -1;
    failed = true;
    penaltyMode = false; // Clear any penalty mode
    
    // Set resign background color (different from other end states)
    document.bgColor = 'dimgray'; // Gray for resignation
    console.log('Player resigned - set background to dimgray');
    
    // Note: Lobby countdown will start when server sends game-finished event
    
    // Submit resignation to server (only affects current player)
    socket.emit('submit-answer', { 
        answer: 'resign', 
        isCorrect: false,
        currentBoardIndex: gameState.currentBoard // Current board, not end
    }, (response) => {
        console.log('Resignation submitted to server');
        if (response.success) {
            // Auto-show leaderboard after resignation
            setTimeout(() => {
                showLeaderboard();
            }, 1000);
        }
    });
    
}

function leaveRoom() {
    // Clear room storage when leaving
    clearRoomStorage();
    console.log('Left room, cleared storage');
    
    socket.disconnect();
    location.reload(); // Simple way to reset everything
}

function restartGame() {
    if (!gameState.isCreator) return;
    
    socket.emit('restart-game', (response) => {
        if (!response.success) {
            alert('Failed to restart game: ' + response.error);
        }
    });
}

function returnToLobbyHost() {
    if (!gameState.isCreator) return;
    
    socket.emit('return-to-lobby', (response) => {
        if (!response.success) {
            alert('Failed to return to lobby: ' + response.error);
        }
    });
}

async function returnToLobbyUI() {
    // Clear the canvas and reset background
    if (typeof clear === 'function') {
        clear();
    }
    
    // Reset document background color to default
    document.bgColor = '';
    document.body.style.backgroundColor = '';
    
    // Reset game state variables that might affect drawing
    failed = false;
    started = false;
    
    // Hide all game-related UI elements
    document.getElementById('leaderboard').style.display = 'none';
    document.getElementById('leaderboard-toggle').style.display = 'none';
    document.getElementById('resign-button').style.display = 'none';
    
    // Reset leaderboard visibility flag
    leaderboardVisible = false;
    
    // Show UI overlay and room panel
    document.getElementById('ui-overlay').style.display = 'flex';
    
    gameState.phase = 'lobby';
    await updateUI();
}

function toggleLeaderboard() {
    const leaderboard = document.getElementById('leaderboard');
    const toggle = document.getElementById('leaderboard-toggle');
    
    if (leaderboardVisible) {
        leaderboard.style.display = 'none';
        toggle.style.display = 'block';
        leaderboardVisible = false;
    } else {
        leaderboard.style.display = 'block';
        toggle.style.display = 'none';
        leaderboardVisible = true;
        leaderboardAutoHidden = false; // Reset auto-hide flag
    }
}

function hideLeaderboard() {
    const leaderboard = document.getElementById('leaderboard');
    const toggle = document.getElementById('leaderboard-toggle');
    
    leaderboard.style.display = 'none';
    toggle.style.display = 'block';
    leaderboardVisible = false;
}

function showLeaderboard() {
    // Don't show leaderboard if we're in menu or lobby phase
    if (gameState.phase === 'menu' || gameState.phase === 'lobby') {
        return;
    }
    
    const leaderboard = document.getElementById('leaderboard');
    const toggle = document.getElementById('leaderboard-toggle');
    
    leaderboard.style.display = 'block';
    toggle.style.display = 'none';
    leaderboardVisible = true;
}

function checkLeaderboardOverlap() {
    if (!leaderboardVisible || gameState.phase !== 'playing') return;
    
    // Simple overlap detection based on screen size
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Auto-hide on small screens or when game board takes up most space
    if (screenWidth < 800 || screenHeight < 600) {
        if (!leaderboardAutoHidden) {
            hideLeaderboard();
            leaderboardAutoHidden = true;
        }
    } else if (leaderboardAutoHidden && screenWidth >= 900 && screenHeight >= 700) {
        // Auto-show on larger screens
        showLeaderboard();
        leaderboardAutoHidden = false;
    }
}

function updateGameState(serverGameState) {
    if (serverGameState.roomId) {
        gameState.roomId = serverGameState.roomId;
    }
    
    if (serverGameState.gameState) {
        gameState.phase = serverGameState.gameState === 'waiting' ? 'lobby' : 
                          serverGameState.gameState === 'playing' ? 'playing' : 'finished';
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
        // Preserve local hard mode setting if user has set it
        const localHardMode = gameState.settings ? gameState.settings.hardMode : undefined;
        const hardModeCheckbox = document.getElementById('hard-mode');
        const currentUIHardMode = hardModeCheckbox ? hardModeCheckbox.checked : false;
        
        console.log('🔄 Updating settings from server...');
        console.log('- Current local hardMode:', localHardMode);
        console.log('- Current UI hardMode:', currentUIHardMode);
        console.log('- Server hardMode:', serverGameState.settings.hardMode);
        
        // Update settings from server
        gameState.settings = serverGameState.settings;
        
        // Preserve user's local hard mode preference if they've set it
        // Only use server's hardMode if we don't have a local preference or if it's a new room creation
        if (localHardMode !== undefined && gameState.phase !== 'menu') {
            // We're in a room and user had a local preference, keep it
            gameState.settings.hardMode = currentUIHardMode;
            console.log('✓ Preserved local hard mode setting:', currentUIHardMode);
        } else if (serverGameState.settings.hardMode !== undefined) {
            // New room or no local preference, use server setting
            gameState.settings.hardMode = serverGameState.settings.hardMode;
            if (hardModeCheckbox) {
                hardModeCheckbox.checked = serverGameState.settings.hardMode;
                console.log('✓ Updated UI from server hard mode:', serverGameState.settings.hardMode);
            }
            // Also update localStorage to keep it in sync
            saveToStorage(STORAGE_KEYS.HARD_MODE, serverGameState.settings.hardMode);
            console.log('✓ Synced hard mode to localStorage:', serverGameState.settings.hardMode);
        }
        
        // Update maxTime based on server settings
        if (serverGameState.settings.unlimitedTime) {
            maxTime = Infinity; // No timer
            console.log('Unlimited time mode enabled');
        } else if (serverGameState.settings.timePerBoard && serverGameState.settings.timePerBoard > 0) {
            maxTime = serverGameState.settings.timePerBoard * 1000; // Convert to milliseconds
            console.log('Updated maxTime from server settings:', maxTime);
        }
        
        console.log('✓ Final hardMode setting:', gameState.settings.hardMode);
        
        // Debug state after server update
        setTimeout(debugHardModeState, 50);
    }
}

// Prevent concurrent updateUI calls that could cause duplication
let updateUIInProgress = false;

async function updateUI() {
    if (updateUIInProgress) {
        console.log('UpdateUI already in progress, skipping...');
        return;
    }
    
    updateUIInProgress = true;
    
    try {
        // Update room ID
        if (gameState.roomId) {
            document.getElementById('room-id').textContent = gameState.roomId;
        }
        
        // Update player list
        const playerListEl = document.getElementById('player-list');
        playerListEl.innerHTML = '';
        
        // Get total scores for lobby display
        const totalScores = await getTotalScoresForRoom();
        const showingTotalScores = !gameState.phase || gameState.phase === 'lobby';
        
        // Sort players by appropriate score (current game score or total score)
        const sortedPlayers = [...gameState.players].sort((a, b) => {
            const aScore = showingTotalScores ? (totalScores[a.name] || 0) : a.score;
            const bScore = showingTotalScores ? (totalScores[b.name] || 0) : b.score;
            
            // Primary sort: by score (highest first)
            if (aScore !== bScore) {
                return bScore - aScore;
            }
            // Secondary sort: host first for same scores
            if (a.isCreator && !b.isCreator) return -1;
            if (!a.isCreator && b.isCreator) return 1;
            return 0; // Keep original order for same type and score
        });
        
        sortedPlayers.forEach((player, index) => {
            const playerEl = document.createElement('div');
            playerEl.className = 'player' + (player.isCreator ? ' creator' : '');
            
            // Add ranking indicator for top players
            let rankIcon = '';
            const displayScore = showingTotalScores ? (totalScores[player.name] || 0) : player.score;
            
            if (gameState.phase === 'playing' || gameState.phase === 'finished' || gameState.allPlayersFinished || showingTotalScores) {
                if (index === 0 && displayScore > 0) {
                    rankIcon = '<span title="1st place">👑</span> '; // Crown for leader
                } else if (index === 1 && displayScore > 0) {
                    rankIcon = '<span title="2nd place">🥈</span> '; // Silver medal for 2nd
                } else if (index === 2 && displayScore > 0) {
                    rankIcon = '<span title="3rd place">🥉</span> '; // Bronze medal for 3rd
                }
            }
            
            // Build player text with markers
            let playerName = player.name;
            // Make current player's name bold instead of adding "(You)"
            if (player.id === gameState.playerId) {
                playerName = `<strong>${player.name}</strong>`;
            }
            
            let playerText = rankIcon + playerName;
            
            // Build HTML for host indicator with tooltip
            let hostHtml = '';
            if (player.isCreator) {
                hostHtml = ' <span title="Room host">🏠</span>';
            }
            
            // Build HTML for dev mode with tooltip
            let devModeHtml = '';
            if (player.isDevMode) {
                devModeHtml = ' <span title="Playing in development mode">🔧</span>';
            }
            
            // Make score more prominent
            let scoreText = '';
            if (gameState.phase === 'playing' || gameState.phase === 'finished' || gameState.allPlayersFinished) {
                const pointText = player.score === 1 ? 'point' : 'points';
                scoreText = ` • ${player.score} ${pointText}`;
                if (player.finished) {
                    scoreText += ' ⏹️'; // Stop symbol for finished players
                }
            } else if (showingTotalScores) {
                const pointText = displayScore === 1 ? 'point' : 'points';
                scoreText = ` • ${displayScore} ${pointText}`;
            } else {
                scoreText = ' • Ready';
            }
            
            // Use innerHTML instead of textContent to support the tooltip
            playerEl.innerHTML = playerText + hostHtml + devModeHtml + scoreText;
            playerListEl.appendChild(playerEl);
        });
        
        // Show/hide start button
        const startBtn = document.getElementById('start-button');
        console.log('updateUI: Checking start button visibility - isCreator:', gameState.isCreator, 'phase:', gameState.phase);
        if (gameState.isCreator && gameState.phase === 'lobby') {
            console.log('✅ Showing start button');
            startBtn.classList.remove('hidden');
        } else {
            console.log('❌ Hiding start button');
            startBtn.classList.add('hidden');
        }
        
        // Update room status
        const statusEl = document.getElementById('room-status');
        if (gameState.phase === 'lobby') {
            statusEl.textContent = `Waiting for players... (${gameState.players.length} joined)`;
        } else if (gameState.phase === 'playing') {
            statusEl.textContent = `Playing - Board ${gameState.currentBoard + 1}/${gameState.boardSequence.length}`;
        }
    } catch (error) {
        console.error('Error in updateUI:', error);
    } finally {
        updateUIInProgress = false;
    }
}

function startMultiplayerGame() {
    gameState.phase = 'playing';
    
    // Hide UI overlay
    document.getElementById('ui-overlay').style.display = 'none';
    
    // Show leaderboard and toggle button
    leaderboardVisible = true;
    document.getElementById('leaderboard').style.display = 'block';
    document.getElementById('leaderboard-toggle').style.display = 'none';
    
    
    // Hide host controls initially (they'll show when all players finish)
    const hostControls = document.getElementById('host-controls');
    hostControls.classList.add('hidden');
    
    // Reset game variables
    score = 0;
    started = true;
    failed = false;
    penaltyMode = false;
    lobbyCountdown = 0;
    lobbyCountdownActive = false;
    
    // Load first board
    loadMultiplayerBoard(0);
    
    // Start timer with the base value from game settings
    if (gameState.settings && gameState.settings.unlimitedTime) {
        timer = Infinity;
        console.log('Starting game with unlimited time');
    } else if (gameState.settings && gameState.settings.timePerBoard && gameState.settings.timePerBoard > 0) {
        timer = gameState.settings.timePerBoard * 1000;
        console.log('Starting game with timer from settings:', timer);
    } else {
        timer = maxTime;
        console.log('Starting game with fallback maxTime:', timer);
    }
    
    updateLeaderboard();
    
    // Check for overlap after starting
    checkLeaderboardOverlap();
}

// Convert board string representation to goscorer format
function convertBoardStringToStones(boardString) {
    const rows = boardString.split("\n").map(row => row.trim()).filter(row => row !== "");
    const ysize = rows.length;
    const xsize = rows[0].length;

    const stones = Array.from({length: ysize}, () => Array.from({length: xsize}, () => window.EMPTY));

    for(let y = 0; y < ysize; y++) {
        for(let x = 0; x < xsize; x++) {
            let c = rows[y][x];
            if(c === "x" || c === "X") {
                stones[y][x] = window.BLACK;
            } else if(c === "o" || c === "O") {
                stones[y][x] = window.WHITE;
            }
            // '.' remains EMPTY (0)
        }
    }
    return stones;
}


// Convert deadstones string representation to an object
function convertDeadStoneStringToObject(boardString, flipX=false, flipY=false, transpose=false) {

    const deadStonesLines = boardString.split('\n').map(row => row.trim()).filter(row => row !== '');
    const textDeadStones = deadStonesLines.map(row => row.split(''));
    const deadStonesParser = {'y':1,'x':0,'o':0,'.':0}
    deadstones = {width: textDeadStones[0].length, height: textDeadStones.length};
    for (let x = 0; x < deadstones.width; x++) {
        deadstones[x] = {};
        for (let y = 0; y < deadstones.height; y++) {
            let a = flipX ? deadstones.width - 1 - x : x;
            let b = flipY ? deadstones.height - 1 - y : y;
            if (transpose) [a, b] = [b, a];
            deadstones[x][y] = deadStonesParser[textDeadStones[b][a]];
        }
    }

    return deadstones;
}

// Territory scoring using lightvector/goscorer
function calculateTerritoryScore(board, deadstones_raw) {
    // Convert our internal board representation to goscorer format
    let stones;
    
    if (typeof board === 'string') {
        // Board is a string representation (from boards.js)
        stones = convertBoardStringToStones(board);
    } else {
        // Board is our internal 2D array format - convert it
        stones = [];
        for (let y = 0; y < board.height; y++) {
            stones[y] = [];
            for (let x = 0; x < board.width; x++) {
                if (board[x][y] === 1) {
                    stones[y][x] = window.BLACK;
                } else if (board[x][y] === -1) {
                    stones[y][x] = window.WHITE;
                } else {
                    stones[y][x] = window.EMPTY;
                }
            }
        }
    }

    if (typeof board === 'string') {
        deadstones = convertDeadStoneStringToObject(deadstones_raw);
    } else {
        // Board is our internal 2D array format - do nothing
    }
    
    const ysize = stones.length;
    const xsize = stones[0].length;
    
    // Create markedDead array using deadstones.js data
    const markedDead = Array.from({length: ysize}, () => Array.from({length: xsize}, () => false));
    
    // If we have a board number and dead stones data, use it
    if (typeof deadstones !== 'undefined' && deadstones) {
        
        for (let y = 0; y < ysize; y++) {
            const col = deadstones[y];
            for (let x = 0; x < xsize; x++) {
                // A 1 in deadstones.js represents dead stones (both black and white)
                if (col[x] === 1) {
                    markedDead[x][y] = true;
                }
            }
        }
    }
    
    // Use goscorer's territory scoring
    const finalScore = window.finalTerritoryScore(stones, markedDead, 0, 0, 0);
    
    let blackTerritory = finalScore.black;
    let whiteTerritory = finalScore.white;
    const difference = blackTerritory - whiteTerritory;
    
    return {
        blackTerritory,
        whiteTerritory,
        difference, // Positive if black has more territory, negative if white
        winningColor: difference > 0 ? 'black' : difference < 0 ? 'white' : 'tie',
        scoreDifference: Math.abs(difference)
    };
}

// Draw functions for different game modes
function drawNormalModeUI() {
    fill('black');
    if (keyIsDown(LEFT_ARROW)) {
        textSize(D + 12);
    } else if (dist(mouseX, mouseY, bx, by) < D) {
        if (mouseIsPressed) textSize(D + 12);
        else textSize(D + 6);
    } else {
        textSize(D);
    }
    
    // Show different text based on game state and dev mode
    let blackText = 'black';
    if (penaltyMode) {
        blackText = 'black';
    } else if (IS_DEV_MODE && correct === 'black') {
        blackText = '✓ BLACK';
        textStyle(BOLD);
    } else if (IS_DEV_MODE && correct === 'white') {
        blackText = 'black';
        textStyle(NORMAL);
    }
    
    text(blackText, bx, by);
    textStyle(NORMAL);

    fill('white');
    if (keyIsDown(RIGHT_ARROW)) {
        textSize(D + 12);
    } else if (dist(mouseX, mouseY, wx, wy) < D) {
        if (mouseIsPressed) textSize(D + 12);
        else textSize(D + 6);
    } else {
        textSize(D);
    }
    
    let whiteText = 'white';
    if (penaltyMode) {
        whiteText = 'white';
    } else if (IS_DEV_MODE && correct === 'white') {
        whiteText = '✓ WHITE';
        textStyle(BOLD);
    } else if (IS_DEV_MODE && correct === 'black') {
        whiteText = 'white';
        textStyle(NORMAL);
    }
    
    text(whiteText, wx, wy);
    textStyle(NORMAL);
}

function drawHardModeUI() {
    // Update bounce animations
    stoneButtonBounce *= bounceDecay;
    for (let i = 0; i < scoreButtonBounces.length; i++) {
        scoreButtonBounces[i] *= bounceDecay;
    }
    
    // Single stone toggle button (left side, higher position to avoid clipping)
    // Use board stone proportions: R is the board stone radius
    const stoneRadius = R * 1.25; // Slightly larger than board stones for better visibility
    const stoneX = width * 0.2;
    const stoneY = height - stoneRadius;
    
    // Calculate bounce scale for stone button
    const stoneScale = 1 + stoneButtonBounce * bounceStrength;
    
    // Draw toggle stone button (changes between black and white)
    push();
    translate(stoneX, stoneY);
    scale(stoneScale);
    
    // Match board stone styling - use board's stroke weight and proportions
    const buttonStrokeWeight = halfStrokeWeight * 2;
    
    // In dev mode, show correct color with special stroke
    let hasCorrectColorHighlight = false;
    if (IS_DEV_MODE && window.currentTerritoryScore) {
        const isCorrectColor = (selectedColorValue === 1 && window.currentTerritoryScore.winningColor === 'black') ||
                              (selectedColorValue === -1 && window.currentTerritoryScore.winningColor === 'white');
        if (isCorrectColor) {
            hasCorrectColorHighlight = true;
        }
    }
    
    if (selectedColorValue === 1) {
        // Black stone - match board stone appearance
        fill(0); // Pure black like board stones
        if (hasCorrectColorHighlight) {
            stroke('#00FF00'); // Green highlight for correct answer
            strokeWeight(buttonStrokeWeight * 2);
        } else {
            stroke(0);
            strokeWeight(buttonStrokeWeight);
        }
        circle(0, 0, stoneRadius - buttonStrokeWeight/2);
    } else {
        // White stone - match board stone appearance  
        fill(255); // Pure white like board stones
        if (hasCorrectColorHighlight) {
            stroke('#00FF00'); // Green highlight for correct answer
            strokeWeight(buttonStrokeWeight * 2);
        } else {
            stroke(0);
            strokeWeight(buttonStrokeWeight);
        }
        circle(0, 0, stoneRadius - buttonStrokeWeight/2);
    }
    pop();
    
    // Score difference buttons (arranged in a horizontal row)
    if (scoreChoices.length === 4) {
        // Use similar proportions to board stones for consistency
        const buttonRadius = R * 1.2; // Slightly smaller than the stone button
        const totalWidth = width * 0.5; // Total width for all 4 buttons
        const buttonY = stoneY; // Same height as stone button
        const spacing = totalWidth / 3; // Space between centers of 4 buttons
        const startX = width * 0.65 - totalWidth / 2; // Center the group of buttons
        
        for (let i = 0; i < 4; i++) {
            const buttonX = startX + (i * spacing);
            const score = scoreChoices[i];
            
            // Calculate bounce scale for this button
            const buttonScale = 1 + scoreButtonBounces[i] * bounceStrength;
            
            // Check if this is the correct score in dev mode
            const isCorrectScore = IS_DEV_MODE && window.currentTerritoryScore && 
                                 score === window.currentTerritoryScore.scoreDifference;
            
            // Check if this button is currently selected
            const isSelected = selectedDifference === score;
            
            // Use board stone styling approach
            push();
            translate(buttonX, buttonY);
            scale(buttonScale);
            
            // Determine colors based on stone color and selection/correctness
            let fillColor, strokeColor, strokeWeight_val, textColor;
            
            if (isCorrectScore) {
                // Golden highlight for correct answer in dev mode
                fillColor = '#FFD700';
                strokeColor = '#FF8C00'; // Darker gold for border
                strokeWeight_val = buttonStrokeWeight * 1.5;
                textColor = '#000000';
            } else if (isSelected) {
                // Selected state - golden highlight
                fillColor = '#FFD700';
                strokeColor = '#FF8C00';
                strokeWeight_val = buttonStrokeWeight * 1.5;
                textColor = '#000000';
            } else {
                // Match the current stone color theme
                if (selectedColorValue === 1) {
                    // Black stone theme - use consistent black
                    fillColor = 0; // Pure black like board stones
                    strokeColor = 0;
                    textColor = 255; // White text
                } else {
                    // White stone theme - light buttons
                    fillColor = '#F0F0F0'; // Light gray, not pure white for subtle depth
                    strokeColor = '#000000';
                    textColor = '#000000';
                }
                strokeWeight_val = buttonStrokeWeight;
            }
            
            // Draw button circle with board stone styling
            fill(fillColor);
            stroke(strokeColor);
            strokeWeight(strokeWeight_val);
            circle(0, 0, buttonRadius - strokeWeight_val/2);
            
            // Draw number with proper styling
            fill(textColor);
            noStroke();
            textAlign(CENTER, CENTER);
            textSize(buttonRadius * 0.6); // Proportional to button size
            
            // Make all numbers bold
            textStyle(BOLD);
            
            text(score.toString(), 0, 0);
            textStyle(NORMAL); // Reset style
            pop();
            
            // Store button positions for click detection
            if (!window.hardModeButtons) window.hardModeButtons = [];
            window.hardModeButtons[i] = { x: buttonX, y: buttonY, radius: buttonRadius, score: score };
        }
    }
    
    // Store stone button position for click detection
    window.hardModeStone = { x: stoneX, y: stoneY, radius: stoneRadius };
}

function loadMultiplayerBoard(boardIndex) {
    if (boardIndex >= gameState.boardSequence.length) {
        // Game finished
        return;
    }
    
    const boardNumber = gameState.boardSequence[boardIndex];
    // Parse board string representation (x=black, o=white, .=empty)
    const currentBoards = getCurrentBoards();
    const boardLines = currentBoards[boardNumber].split('\n').map(row => row.trim()).filter(row => row !== '');
    const textBoard = boardLines.map(row => row.split(''));
    
    board = {width: textBoard[0].length, height: textBoard.length};

    let flipX = Math.random() < 0.5;
    let flipY = Math.random() < 0.5;
    let transpose = (board.width == board.height) && (Math.random() < 0.5);
    let invert = Math.random() < 0.5;
    correct = invert ? "white" : "black";
    
    // Show correct answer in dev mode console
    if (IS_DEV_MODE) {
        console.log(`🚀 DEV MODE: Board ${boardIndex + 1} - Correct answer is ${correct.toUpperCase()}`);
    }

    for (let x = 0; x < board.width; x++) {
        board[x] = {};
        for (let y = 0; y < board.height; y++) {
            let a = flipX ? board.width - 1 - x : x;
            let b = flipY ? board.height - 1 - y : y;
            if (transpose) [a, b] = [b, a];
            board[x][y] = {'o':1,'x':-1,'.':0}[textBoard[b][a]] * (-1)**invert;
        }
    }
    
    // Do the same procedure for the deadstones
    const currentDeadStones = getCurrentDeadStones();
    deadstones = convertDeadStoneStringToObject(currentDeadStones[boardNumber], flipX, flipY, transpose);
    
    // Calculate territory score for hard mode
    let territoryScore = null;
    if (gameState.settings && gameState.settings.hardMode) {
        // Use the processed board that matches what the player sees, and pass the board number for dead stones
        territoryScore = calculateTerritoryScore(board, deadstones);
        
        // Apply color inversion to the scoring result to match the displayed board
        if (invert) {
            const originalWinner = territoryScore.winningColor;
            territoryScore.winningColor = originalWinner === 'black' ? 'white' : 
                                        originalWinner === 'white' ? 'black' : 'tie';
            territoryScore.difference = -territoryScore.difference;
        }
        
        // Show detailed scoring in dev mode
        if (IS_DEV_MODE) {
            console.log(`🎯 DEV MODE: Territory scoring - Black: ${territoryScore.blackTerritory}, White: ${territoryScore.whiteTerritory}, Difference: ${territoryScore.difference}, Winner: ${territoryScore.winningColor}`);
        }
        
        // Store the territory info for answer validation
        window.currentTerritoryScore = territoryScore;
        
        // Generate score choice buttons with varied wrong choices (no duplicates)
        const correctDifference = territoryScore.scoreDifference;
        const uniqueChoices = new Set();
        
        // Add the correct answer first
        uniqueChoices.add(correctDifference);
        
        // Generate wrong choices within max difference of 3
        const maxDifference = 3;
        let attempts = 0;
        const maxAttempts = 50;
        
        // Random distribution strategy
        const distributionType = Math.random();
        let forcedDirection = null;
        
        if (distributionType < 0.33) {
            forcedDirection = 'smaller'; // Only generate smaller numbers
        } else if (distributionType < 0.66) {
            forcedDirection = 'bigger'; // Only generate bigger numbers  
        }
        // Otherwise forcedDirection stays null for even distribution
        
        while (uniqueChoices.size < 4 && attempts < maxAttempts) {
            attempts++;
            
            // Generate random offset within allowed range
            const offset = Math.floor(Math.random() * maxDifference) + 1; // 1, 2, or 3
            
            let choice;
            let useNegativeOffset;
            
            if (forcedDirection === 'smaller') {
                useNegativeOffset = true;
            } else if (forcedDirection === 'bigger') {
                useNegativeOffset = false;
            } else {
                useNegativeOffset = Math.random() < 0.5; // Even distribution
            }
            
            if (useNegativeOffset) {
                choice = Math.max(1, correctDifference - offset); // Prevent zero as wrong answer
            } else {
                choice = correctDifference + offset;
            }
            
            // Don't add zero as a wrong answer (only allow if it's the correct answer)
            if (choice === 0 && correctDifference !== 0) {
                continue;
            }
            
            uniqueChoices.add(choice);
        }
        
        // Convert Set to array and sort in increasing order
        scoreChoices = Array.from(uniqueChoices).sort((a, b) => a - b);
        
        // Ensure we have exactly 4 choices (fallback protection)
        if (scoreChoices.length < 4) {
            console.warn(`Only generated ${scoreChoices.length} unique score choices, adding fallbacks`);
            while (scoreChoices.length < 4) {
                // Add fallback choices that are still close to the correct answer
                const currentChoices = [...scoreChoices];
                let fallbackChoice = null;
                
                // Try to add choices within max difference range
                for (let offset = 1; offset <= maxDifference; offset++) {
                    // Try positive offset first
                    const posChoice = correctDifference + offset;
                    if (!currentChoices.includes(posChoice)) {
                        fallbackChoice = posChoice;
                        break;
                    }
                    
                    // Try negative offset (ensuring minimum of 1)
                    const negChoice = Math.max(1, correctDifference - offset);
                    if (!currentChoices.includes(negChoice) && !(negChoice === 0 && correctDifference !== 0)) {
                        fallbackChoice = negChoice;
                        break;
                    }
                }
                
                // If still no fallback found, extend beyond max difference but keep reasonable
                if (fallbackChoice === null) {
                    const maxChoice = Math.max(...currentChoices);
                    fallbackChoice = maxChoice + 1;
                }
                
                scoreChoices.push(fallbackChoice);
            }
            scoreChoices.sort((a, b) => a - b);
        }
        
        // Reset hard mode selections and animations
        selectedColorValue = 1; // Start with black
        selectedDifference = null;
        stoneButtonBounce = 0;
        scoreButtonBounces = [0, 0, 0, 0];
    }
    
    failed = false;
    
    // Don't override completion colors - only set green for active gameplay
    if (gameState.phase !== 'finished') {
        document.bgColor = 'seagreen';
    }
    
    // Always use the base time from settings (don't accumulate progressive difficulty)
    if (gameState.settings && gameState.settings.unlimitedTime) {
        timer = Infinity; // No timer
        console.log('Setting timer to unlimited (infinity)');
    } else if (gameState.settings && gameState.settings.timePerBoard && gameState.settings.timePerBoard > 0) {
        timer = gameState.settings.timePerBoard * 1000;
        console.log('Setting timer to base time from settings:', timer);
    } else {
        timer = maxTime; // Fallback to maxTime
        console.log('Using fallback maxTime:', timer);
    }
}

function updateLeaderboard() {
    const leaderboardContent = document.getElementById('leaderboard-content');
    
    // Sort players by score
    const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
    
    // Find the highest score to identify winners
    const highestScore = sortedPlayers.length > 0 ? sortedPlayers[0].score : 0;
    
    // Count how many players have the highest score
    const winnersCount = sortedPlayers.filter(p => p.score === highestScore).length;
    
    leaderboardContent.innerHTML = sortedPlayers.map((player, index) => {
        const statusEmoji = player.finished ? '<span class="emoji">✅</span>' : '<span class="emoji" title="Playing">🎮</span>';
        
        // Add trophy for single winner, medal for tied winners
        let winnerEmoji = '';
        if (player.score === highestScore) {
            if (winnersCount === 1) {
                winnerEmoji = '<span class="emoji">🏆</span> '; // Trophy for single winner
            } else {
                winnerEmoji = '<span class="emoji">🥇</span> '; // Gold medal for tied winners
            }
        }
        
        // Add dev mode indicator with tooltip
        let devModeEmoji = '';
        if (player.isDevMode) {
            devModeEmoji = ' <span title="Playing in development mode">🔧</span>';
        }
        
        return `${index + 1}. ${winnerEmoji}${player.name}: ${player.score} ${statusEmoji}${devModeEmoji}`;
    }).join('<br>');
    
    // Update host controls visibility
    const hostControls = document.getElementById('host-controls');
    console.log('Host controls check:', {
        isCreator: gameState.isCreator,
        allPlayersFinished: gameState.allPlayersFinished,
        players: gameState.players.map(p => ({name: p.name, finished: p.finished}))
    });
    
    if (gameState.isCreator && gameState.allPlayersFinished) {
        console.log('Showing host controls');
        hostControls.classList.remove('hidden');
    } else {
        hostControls.classList.add('hidden');
    }
}

function submitMultiplayer(guess) {
    if (gameState.phase !== 'playing' || penaltyMode) return;
    
    const isCorrect = guess === correct;
    
    socket.emit('submit-answer', { 
        answer: guess, 
        isCorrect: isCorrect,
        currentBoardIndex: gameState.currentBoard
    }, (response) => {
        if (response.success) {
            // Handle answer like in single player
            if (isCorrect) {
                score++;
                //maxTime -= 1000; // Progressive difficulty
                gameState.currentBoard++;
                
                // In unlimited mode, never finish by reaching end of boards
                if (gameState.boardSequence && gameState.currentBoard < gameState.boardSequence.length) {
                    loadMultiplayerBoard(gameState.currentBoard);
                } else if (!gameState.settings?.unlimited) {
                    // Game finished - player completed all boards (only in limited mode)
                    console.log('🎯 Player completed all boards! Current failed state:', failed, 'Current bgColor:', document.bgColor);
                    gameState.phase = 'finished';
                    timer = -1;
                    
                    // Set blue color when completing all boards individually (same as timeout)
                    failed = true;
                    document.bgColor = 'royalblue'; // Blue for individual completion
                    console.log('🏁 Player completed all boards individually - set background to royalblue');
                    
                    // Mark ourselves as finished locally
                    const ourPlayer = gameState.players.find(p => p.id === gameState.playerId);
                    if (ourPlayer) {
                        ourPlayer.finished = true;
                        
                        // Note: Lobby countdown will start when server sends game-finished event
                        
                        // Auto-show leaderboard when player finishes
                        console.log('Player completed all boards - auto-showing leaderboard');
                        setTimeout(() => {
                            showLeaderboard();
                        }, 500);
                    }
                    
                } else {
                    // In unlimited mode, continue with more boards (this shouldn't happen with 1000 board pool)
                    console.log('Unlimited mode: ran out of boards unexpectedly');
                }
            } else {
                // Wrong answer - only apply penalty if game is still active and there's more than 1 second left
                if (gameState.phase !== 'finished' && timer > 1000) {
                    console.log('Wrong answer - applying 1 second penalty');
                    
                    // Enter penalty mode to prevent input
                    penaltyMode = true;
                
                // Flash red background for 1 second
                document.bgColor = 'crimson';
                
                // Add 1 second penalty delay before next board
                setTimeout(() => {
                    // Exit penalty mode
                    penaltyMode = false;
                    
                    // Continue to next board without incrementing score
                    gameState.currentBoard++;
                    
                    // Check if we've reached the end of boards
                    if (gameState.boardSequence && gameState.currentBoard < gameState.boardSequence.length) {
                        // Continue with next board - return to green background
                        document.bgColor = 'seagreen';
                        loadMultiplayerBoard(gameState.currentBoard);
                    } else if (!gameState.settings?.unlimited) {
                        // Game finished - player completed all boards (with some mistakes)
                        console.log('🎯 Player completed all boards with mistakes! Final score:', score);
                        gameState.phase = 'finished';
                        timer = -1;
                        
                        // Set blue color when completing all boards individually (same as timeout)
                        failed = true;
                        document.bgColor = 'royalblue';
                        console.log('🏁 Player completed all boards individually - set background to royalblue');
                        
                        // Mark ourselves as finished locally
                        const ourPlayer = gameState.players.find(p => p.id === gameState.playerId);
                        if (ourPlayer) {
                            ourPlayer.finished = true;
                            
                            // Note: Lobby countdown will start when server sends game-finished event
                            
                            // Auto-show leaderboard when player finishes
                            console.log('Player completed all boards - auto-showing leaderboard');
                            setTimeout(() => {
                                showLeaderboard();
                            }, 500);
                        }
                        
                    } else {
                        // In unlimited mode, continue with more boards
                        console.log('Unlimited mode: ran out of boards unexpectedly');
                    }
                }, 1000); // 1 second penalty delay
                } else {
                    console.log('Game already finished or less than 1 second remaining - skipping penalty');
                }
            }
            // Don't update leaderboard here - wait for server score-updated event
        }
    });
}

// p5.js functions (modified for multiplayer)
function preload() {
    // Don't show timer prompt in multiplayer
    maxTime = defaultTimePerBoard;
}

function setup() {
    createCanvas().mouseClicked(handleClick);
    windowResized();
    
    ellipseMode(RADIUS);
    strokeCap(PROJECT);
    noStroke();
    
    // Don't start game automatically - wait for multiplayer lobby
}

// Initialize UI when DOM is ready (single initialization)
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing UI and socket');
    initSocket();
    initializeUI();
    
    // Check if there's a room ID in the URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const roomIdFromUrl = urlParams.get('room');
    
    if (roomIdFromUrl) {
        console.log('Found room ID in URL:', roomIdFromUrl);
        // Wait for socket connection and UI initialization
        setTimeout(() => {
            if (socket && socket.connected) {
                // Auto-join the room directly
                const playerName = document.getElementById('player-name').value.trim() || getRandomName();
                document.getElementById('player-name').value = playerName;
                
                // Save player name
                gameState.playerName = playerName;
                saveToStorage(STORAGE_KEYS.PLAYER_NAME, playerName);
                
                // Join the room directly
                socket.emit('join-room', {
                    roomId: roomIdFromUrl.toUpperCase(),
                    playerName: playerName,
                    playerUUID: getPlayerUUID(), // Include UUID for host persistence
                    isDevMode: IS_DEV_MODE
                }, (response) => {
                    if (response.success) {
                        handleJoinRoomSuccess(response);
                        // Clear the URL parameter after successful join
                        const newUrl = window.location.origin + window.location.pathname;
                        window.history.replaceState({}, document.title, newUrl);
                        console.log('Successfully auto-joined room from URL');
                    } else {
                        console.error('Failed to auto-join room:', response.error);
                        // Show join panel as fallback
                        document.getElementById('room-code').value = roomIdFromUrl.toUpperCase();
                        showJoinRoom();
                        alert(`Failed to join room: ${response.error}`);
                    }
                });
            } else {
                console.log('Socket not ready, will try room reconnection through normal flow');
            }
        }, 1000);
    }
});

function windowResized() {
    R = floor(min(window.innerWidth/10, window.innerHeight/12)/2)-1;
    D = 2 * R;
    width = 10 * D;
    height = 12 * D;
    halfStrokeWeight = ceil(D/70);
    strokeWeight(2 * halfStrokeWeight);

    sx = width/2;
    sy = 1.5*R;
    bx = width/2 - 2*D;
    by = height - 1.5*R;
    wx = width/2 + 2*D;
    wy = height - 1.5*R;
    
    resizeCanvas(width, height);
    
    // Check leaderboard overlap when window is resized
    checkLeaderboardOverlap();
}

function draw() {
    // Don't draw game if not playing (but show completed board if finished)
    if (gameState.phase !== 'playing' && gameState.phase !== 'finished') {
        clear();
        return;
    }
    
    // Update resign button visibility based on current game state
    updateResignButtonVisibility();
    
    // Update lobby countdown when active
    if (lobbyCountdownActive && lobbyCountdown > 0) {
        lobbyCountdown -= deltaTime / 1000; // Convert from milliseconds to seconds
        
        // When countdown reaches 0, return to lobby
        if (lobbyCountdown <= 0) {
            lobbyCountdownActive = false;
            lobbyCountdown = 0;
            console.log('⏰ Countdown finished - automatically returning to lobby');
            
            // Only host can trigger return to lobby, but all players get returned by server
            if (gameState.isCreator) {
                socket.emit('return-to-lobby', (response) => {
                    if (response.success) {
                        console.log('✅ Successfully triggered return to lobby for all players');
                    } else {
                        console.error('❌ Failed to return to lobby:', response.error);
                    }
                });
            }
        }
    }
    
    clear();
    
    // Draw board (same as original)
    push();
    stroke(0);
    translate(D, 2*D);

    for (let x = 0; x < board.width; x++) {
        line(x * D, 0, x * D, (board.height - 1) * D);
    }

    for (let y = 0; y < board.height; y++) {
        line(0, y * D, (board.width - 1) * D, y * D);
    }

    for (let x = 0; x < board.width; x++) {
        for (let y = 0; y < board.height; y++) {
            if (board[x][y]) {
                fill((board[x][y] === -1) * 255);
                circle(x * D, y * D, R - halfStrokeWeight);
            }
        }
    }
    pop();

    // Draw UI elements
    push();
    textSize(R);
    fill('white');
    textFont('Arial'); // Changed from courier to Arial
    
    // Show board number and remaining time
    let boardText;
    
    // For finished state, show the actual boards completed
    let displayBoardNumber = gameState.currentBoard + 1;
    if (gameState.phase === 'finished') {
        // For finished games, show the player's actual score (boards completed correctly)
        displayBoardNumber = score;
    }
    
    if (gameState.settings?.unlimited) {
        boardText = `${displayBoardNumber}`;
    } else {
        boardText = `${displayBoardNumber}/${gameState.settings?.totalBoards || gameState.boardSequence.length}`;
    }
    
    // Add remaining time in seconds (or show ∞ for unlimited)
    let displayText;
    if (timer === Infinity) {
        displayText = `${boardText} - ∞`;
    } else {
        const remainingSeconds = Math.max(0, Math.ceil(timer / 1000));
        displayText = `${boardText} - ${remainingSeconds}s`;
    }
    
    text(displayText, width/2, R);
    pop();

    // Timer bar (only show when game is active)
    if (gameState.phase !== 'finished') {
        push();
        let dx = map(timer, 0, maxTime, 0, width/2 - D);
        fill(255);
        stroke('white');
        strokeCap(ROUND);
        if (timer > 0) line(width/2 - dx, D, width/2 + dx, D);
        pop();
    }

    // Buttons and game interface (only show if player hasn't finished)
    if (!failed && timer > 0) {
        textAlign(CENTER, CENTER);
        
        // Check if we're in hard mode
        if (gameState.phase !== 'finished') {
            if (gameState.settings && gameState.settings.hardMode) {
                // Hard mode: Show stone selection buttons and score buttons
                drawHardModeUI();
            } else {
                // Normal mode: Show traditional Black/White text buttons
                drawNormalModeUI();
            }
        }
        
        // Handle timer countdown and game logic
        
        if (started && gameState.phase === 'playing' && timer > 0) {
            timer -= deltaTime;
            
            // Handle timeout - mark player as finished
            if (timer <= 0 && !failed) {
                failed = true;
                document.bgColor = "royalblue";
                
                // Submit timeout as wrong answer to notify server
                socket.emit('submit-answer', { 
                    answer: 'timeout', 
                    isCorrect: false,
                    currentBoardIndex: gameState.currentBoard
                }, (response) => {
                    console.log('Timeout submitted to server');
                    if (response.success) {
                        // Mark ourselves as finished locally
                        const ourPlayer = gameState.players.find(p => p.id === gameState.playerId);
                        if (ourPlayer) {
                            ourPlayer.finished = true;
                            
                            // Note: Lobby countdown will start when server sends game-finished event
                            
                            // Auto-show leaderboard when player times out
                            console.log('Player timed out - auto-showing leaderboard');
                            setTimeout(() => {
                                showLeaderboard();
                            }, 1000); // Longer delay to see the blue background effect
                        }
                        
                        
                        // Update leaderboard to potentially show host controls
                        updateLeaderboard();
                    }
                });
            }
        }
    }
    
    // Show countdown to lobby return when game is finished
    if (gameState.phase === 'finished' && lobbyCountdownActive && lobbyCountdown > 0) {
        textAlign(CENTER, CENTER);
        textSize(R-7);
        fill(255, 255, 255, 200);
        noStroke();
        // Position above the timer graphic countdown
        text(`Returning to lobby in ${Math.ceil(lobbyCountdown)}`, width/2, D + 12);
    }
}

function handleHardModeClick() {
    // Check stone toggle button click
    if (window.hardModeStone) {
        const stone = window.hardModeStone;
        
        if (dist(mouseX, mouseY, stone.x, stone.y) < stone.radius) {
            // Toggle between black (1) and white (-1)
            selectedColorValue = selectedColorValue === 1 ? -1 : 1;
            console.log(`Toggled to ${selectedColorValue === 1 ? 'black' : 'white'} (${selectedColorValue})`);
            
            // Trigger bounce animation for stone button
            stoneButtonBounce = 1;
            return;
        }
    }
    
    // Check score button clicks
    if (window.hardModeButtons) {
        for (let i = 0; i < window.hardModeButtons.length; i++) {
            const button = window.hardModeButtons[i];
            if (dist(mouseX, mouseY, button.x, button.y) < button.radius) {
                selectedDifference = button.score;
                console.log(`Selected score difference: ${button.score}`);
                
                // Trigger bounce animation for clicked score button
                scoreButtonBounces[i] = 1;
                
                // Submit answer with color value and score
                submitHardModeAnswer(selectedColorValue, selectedDifference);
                return;
            }
        }
    }
}

function submitHardModeAnswer(colorValue, scoreDiff) {
    // Calculate the signed score (positive for black, negative for white)
    const signedScore = colorValue * scoreDiff;
    console.log(`🎯 Hard mode calculation:`);
    console.log(`   Color value: ${colorValue} (${colorValue === 1 ? 'black' : 'white'})`);
    console.log(`   Score difference: ${scoreDiff}`);
    console.log(`   Final signed score: ${colorValue} × ${scoreDiff} = ${signedScore}`);
    
    // Validate hard mode answer using territory score
    if (window.currentTerritoryScore) {
        const territoryScore = window.currentTerritoryScore;
        const correctColorValue = territoryScore.winningColor === 'black' ? 1 : -1;
        const correctSignedScore = correctColorValue * territoryScore.scoreDifference;
        
        console.log(`🎯 Correct answer: ${territoryScore.winningColor} by ${territoryScore.scoreDifference} = ${correctSignedScore}`);
        
        const isCorrect = signedScore === correctSignedScore;
        console.log(`✅ Answer is ${isCorrect ? 'CORRECT' : 'WRONG'}`);
        
        // Submit with proper validation
        const colorString = colorValue === 1 ? 'black' : 'white';
        submitMultiplayerHardMode(colorString, isCorrect);
    } else {
        console.log('❌ No territory score available for validation');
        // Fallback to simple color validation
        const colorString = colorValue === 1 ? 'black' : 'white';
        submitMultiplayer(colorString);
    }
}

function submitMultiplayerHardMode(guess, isCorrect) {
    console.log(`📤 Submitting hard mode answer: ${guess}, isCorrect: ${isCorrect}`);
    
    socket.emit('submit-answer', { 
        answer: guess, 
        isCorrect: isCorrect,
        currentBoardIndex: gameState.currentBoard
    }, (response) => {
        console.log('📥 Server response:', response);
        if (response.success) {
            if (isCorrect) {
                console.log('✅ Correct answer - advancing to next board');
                
                // Increment score and board index (matching normal mode behavior)
                score++;
                gameState.currentBoard++;
                
                // Load next board
                if (gameState.boardSequence && gameState.currentBoard < gameState.boardSequence.length) {
                    loadMultiplayerBoard(gameState.currentBoard);
                } else if (!gameState.settings?.unlimited) {
                    // Game finished - player completed all boards
                    console.log('🎯 Player completed all boards! Final score:', score);
                    gameState.phase = 'finished';
                    timer = -1;
                    
                    // Set blue color for individual completion
                    failed = true;
                    document.bgColor = 'royalblue';
                    console.log('🏁 Player completed all boards individually - set background to royalblue');
                    
                    // Mark ourselves as finished locally
                    const ourPlayer = gameState.players.find(p => p.id === gameState.playerId);
                    if (ourPlayer) {
                        ourPlayer.finished = true;
                        
                        // Auto-show leaderboard when player finishes
                        setTimeout(() => {
                            showLeaderboard();
                        }, 1000);
                    }
                } else {
                    console.log('Unlimited mode: ran out of boards unexpectedly');
                }
            } else {
                // Wrong answer - apply penalty if game is still active and there's more than 1 second left
                if (gameState.phase !== 'finished' && timer > 1000) {
                    console.log('❌ Wrong answer - applying 1 second penalty');
                    
                    // Enter penalty mode to prevent input
                    penaltyMode = true;
                    
                    // Flash red background for 1 second
                    document.bgColor = 'crimson';
                    
                    // Add 1 second penalty delay
                    setTimeout(() => {
                        penaltyMode = false;
                        
                        // Advance to next board (without incrementing score)
                        gameState.currentBoard++;
                        
                        // Load next board and return to green background
                        if (gameState.boardSequence && gameState.currentBoard < gameState.boardSequence.length) {
                            document.bgColor = 'seagreen';
                            loadMultiplayerBoard(gameState.currentBoard);
                        } else if (!gameState.settings?.unlimited) {
                            // Game finished - player completed all boards (with some mistakes)
                            console.log('🎯 Player completed all boards with mistakes! Final score:', score);
                            gameState.phase = 'finished';
                            timer = -1;
                            
                            // Set blue color for individual completion
                            failed = true;
                            document.bgColor = 'royalblue';
                            console.log('🏁 Player completed all boards individually - set background to royalblue');
                            
                            // Mark ourselves as finished locally
                            const ourPlayer = gameState.players.find(p => p.id === gameState.playerId);
                            if (ourPlayer) {
                                ourPlayer.finished = true;
                                
                                // Auto-show leaderboard when player finishes
                                setTimeout(() => {
                                    showLeaderboard();
                                }, 1000);
                            }
                        } else {
                            console.log('Unlimited mode: ran out of boards unexpectedly');
                        }
                    }, 1000);
                } else {
                    console.log('Game finished or less than 1 second remaining - skipping penalty');
                }
            }
        }
    });
}

function handleClick() {
    // Only allow clicks during active gameplay, not during penalty, and player hasn't finished
    if (gameState.phase !== 'playing' || timer <= 0 || penaltyMode || failed) return;
    
    if (gameState.settings && gameState.settings.hardMode) {
        // Hard mode click handling
        handleHardModeClick();
    } else {
        // Normal mode click handling
        if (dist(mouseX, mouseY, bx, by) < D) {
            submitMultiplayer('black');
        } else if (dist(mouseX, mouseY, wx, wy) < D) {
            submitMultiplayer('white');
        }
    }
    
    mouseX = -1;
    mouseY = -1;
}

function keyPressed() {
    // Cancel lobby return countdown if user presses any key
    if (lobbyCountdownActive) {
        console.log('⏰ User pressed key - canceling lobby return countdown');
        lobbyCountdownActive = false;
        lobbyCountdown = 0;
        lobbyCountdownCancelled = true;
        return;
    }
    
    if (gameState.phase !== 'playing' || timer <= 0 || penaltyMode || failed) return;
    
    if (keyCode === LEFT_ARROW) submitMultiplayer('black');
    if (keyCode === RIGHT_ARROW) submitMultiplayer('white');
}

function mousePressed() {
    // Cancel lobby return countdown if user clicks anywhere
    if (lobbyCountdownActive) {
        console.log('⏰ User clicked - canceling lobby return countdown');
        lobbyCountdownActive = false;
        lobbyCountdown = 0;
        lobbyCountdownCancelled = true;
        return false; // Only prevent default when canceling countdown
    }
    
    // Don't prevent default behavior for normal interactions
    // Return undefined to allow normal behavior
}

function mouseReleased() {
    // Allow normal mouse release behavior
    // Return undefined to allow default behavior
}

function touchEnded() {
    // Cancel lobby return countdown if user touches anywhere
    if (lobbyCountdownActive) {
        console.log('⏰ User touched screen - canceling lobby return countdown');
        lobbyCountdownActive = false;
        lobbyCountdown = 0;
        lobbyCountdownCancelled = true;
    }
    
    mouseX = -1;
    mouseY = -1;
}

// Functions are now automatically global in regular script mode
