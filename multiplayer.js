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
let started = false;
let correct;
let failed = false;
let defaultTimePerBoard = 55;
let defaultTimePerBoardStep = 5;

// UI variables
let R, D, halfStrokeWeight;
let sx, sy, bx, by, wx, wy;

// Auto-detect server URL based on environment
const SERVER_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://counting-production.up.railway.app';

// Development mode detection
const IS_DEV_MODE = window.location.hostname === 'localhost' || window.location.search.includes('dev=1');

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
        if (boardId < 0 || boardId >= MOCK_BOARDS.length) {
            console.error(`❌ Invalid board ID: ${boardId}. Available: 0-${MOCK_BOARDS.length - 1}`);
            return;
        }
        
        // Replace the boards array temporarily with our mock board at index 0
        window.originalBoards = window.originalBoards || boards.slice(); // Backup original boards
        boards[0] = MOCK_BOARDS[boardId];
        
        // Set up a simple game state for testing
        gameState.boardSequence = [0]; // Use our mock board
        gameState.currentBoard = 0;
        gameState.phase = 'playing';
        
        console.log(`🚀 Test board ${boardId} loaded!`);
        console.log('Board preview:');
        console.log(MOCK_BOARDS[boardId]);
        console.log('\nThis board will be used in the next game. Start a game to test!');
        
        // If we're already in a game, load the board immediately
        if (typeof loadMultiplayerBoard === 'function') {
            loadMultiplayerBoard(0);
        }
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
    console.log('Board testing: showMockBoards(), setTestBoardId(0)');
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
        
        // Reload leaderboard history when someone joins (including when you rejoin)
        if (gameState.phase === 'lobby' && gameState.roomId) {
            setTimeout(() => {
                console.log('🔄 Loading history after player join - roomId:', gameState.roomId);
                loadLeaderboardHistory();
            }, 500); // Increased delay to ensure game state is fully set
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
    document.getElementById('main-menu').classList.remove('hidden');
    document.getElementById('join-room-panel').classList.add('hidden');
    document.getElementById('room-panel').classList.add('hidden');
}

// Prevent infinite retry loops
let historyRetryCount = 0;
const MAX_HISTORY_RETRIES = 1;

// Load and display leaderboard history for current room
async function loadLeaderboardHistory(isRetry = false) {
    console.log('🔄 Loading leaderboard history for room:', gameState.roomId);
    console.log('🔍 Current gameState.phase:', gameState.phase);
    console.log('🔍 UI overlay visible:', document.getElementById('ui-overlay').style.display !== 'none');
    
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
    
    try {
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
                            <br><button onclick="loadLeaderboardHistory()" style="margin-top: 10px; padding: 5px 10px; background: #666; color: white; border: none; border-radius: 3px; cursor: pointer;">🔄 Refresh</button>
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
                    historyContent.innerHTML = `<div style="color: #888; text-align: center; padding: 20px;">No completed games yet<br>for room <strong>${gameState.roomId}</strong><br><small style="color: #666;">Total games in system: ${data.games.length}</small><br><button onclick="loadLeaderboardHistory()" style="margin-top: 10px; padding: 5px 10px; background: #666; color: white; border: none; border-radius: 3px; cursor: pointer;">🔄 Refresh</button></div>`;
                }
            }
        } else {
            historyContent.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">No completed games yet</div>';
        }
    } catch (error) {
        console.error('Error loading leaderboard history:', error);
        historyContent.innerHTML = `<div style="color: #f44; text-align: center; padding: 20px;">
            Failed to load: ${error.message}<br>
            <button onclick="loadLeaderboardHistory()" style="margin-top: 10px; padding: 5px 10px; background: #666; color: white; border: none; border-radius: 3px; cursor: pointer;">
                Retry
            </button>
        </div>`;
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
            resultText = `${winners[0].name} won with ${highestScore} points`;
            resultColor = '#4CAF50';
        } else {
            // Multiple players tied (always show names)
            const winnerNames = winners.map(w => w.name).join(', ');
            if (winners.length === game.players.length) {
                // Everyone tied
                resultText = `All tied: ${winnerNames} (${highestScore} pts)`;
            } else {
                // Some players tied for first
                resultText = `${winners.length}-way tie: ${winnerNames} (${highestScore} pts)`;
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
    UNLIMITED_TIME: 'countbattle_unlimited_time'
};

// LocalStorage helper functions
function saveToStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn('Failed to save to localStorage:', error);
    }
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
    const savedTotalBoards = loadFromStorage(STORAGE_KEYS.TOTAL_BOARDS, 20);
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
        
        // Simple event handling for number input
        const changeHandler = function(e) {
            let newValue = parseInt(e.target.value);
            
            // Validate the value
            if (isNaN(newValue) || newValue < 10 || newValue > 120) {
                console.log('❌ Invalid value:', newValue, 'resetting to previous');
                e.target.value = currentTimePerBoard;
                return;
            }
            
            e.target.value = newValue;
            console.log('🎯 Number input changed to:', newValue);
            handleTimeChange(newValue);
        };
        
        // Add event listeners
        timeSlider.addEventListener('change', changeHandler);
        timeSlider.addEventListener('blur', changeHandler); // Also validate on blur
        
        console.log('✓ Added event listeners');
        console.log('=== Time input initialization complete ===');
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
        
        // Event handler for total boards input
        const boardsChangeHandler = function(e) {
            let newValue = parseInt(e.target.value);
            
            // Validate the value
            if (isNaN(newValue) || newValue < 5 || newValue > 50) {
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
        
        // Add event listeners
        totalBoardsInput.addEventListener('change', boardsChangeHandler);
        totalBoardsInput.addEventListener('blur', boardsChangeHandler);
        
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
                        
                        // Also reload leaderboard history after reconnection
                        if (gameState.roomId) {
                            console.log('Force reloading leaderboard history after reconnection');
                            loadLeaderboardHistory();
                        }
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
    // Use settings with configurable time and boards
    socket.emit('create-room', {
        playerUUID: creatorUUID, // Include UUID for host persistence
        settings: {
            timePerBoard: timePerBoard, // Configurable time per board or -1 for unlimited
            totalBoards: currentTotalBoards, // Configurable number of boards
            unlimited: false, // Use limited boards mode
            unlimitedTime: unlimitedTimeMode, // Unlimited time mode
            progressiveDifficulty: true
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
    const settings = {
        timePerBoard: timePerBoard,
        totalBoards: currentTotalBoards,
        unlimited: false
    };
    
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
    // Show UI overlay and room panel
    document.getElementById('ui-overlay').style.display = 'flex';
    document.getElementById('leaderboard').style.display = 'none';
    document.getElementById('leaderboard-toggle').style.display = 'none';
    
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
        gameState.settings = serverGameState.settings;
        // Update maxTime based on server settings
        if (serverGameState.settings.unlimitedTime) {
            maxTime = Infinity; // No timer
            console.log('Unlimited time mode enabled');
        } else if (serverGameState.settings.timePerBoard && serverGameState.settings.timePerBoard > 0) {
            maxTime = serverGameState.settings.timePerBoard * 1000; // Convert to milliseconds
            console.log('Updated maxTime from server settings:', maxTime);
        }
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
                    rankIcon = '👑 '; // Crown for leader
                } else if (index === 1 && displayScore > 0) {
                    rankIcon = '🥈 '; // Silver medal for 2nd
                } else if (index === 2 && displayScore > 0) {
                    rankIcon = '🥉 '; // Bronze medal for 3rd
                }
            }
            
            // Build player text with markers
            let playerText = rankIcon + player.name;
            if (player.isCreator) {
                playerText += ' (Host)';
            }
            if (player.id === gameState.playerId) {
                playerText += ' (You)';
            }
            if (player.isDevMode) {
                playerText += ' 🔧'; // Wrench emoji for dev mode
            }
            
            // Make score more prominent
            if (gameState.phase === 'playing' || gameState.phase === 'finished' || gameState.allPlayersFinished) {
                playerText += ` • Score: ${player.score}`;
                if (player.finished) {
                    playerText += ' ⏹️'; // Stop symbol for finished players
                }
            } else if (showingTotalScores) {
                playerText += ` • Score: ${displayScore}`;
            } else {
                playerText += ' • Ready';
            }
            
            playerEl.textContent = playerText;
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

function loadMultiplayerBoard(boardIndex) {
    if (boardIndex >= gameState.boardSequence.length) {
        // Game finished
        return;
    }
    
    const boardNumber = gameState.boardSequence[boardIndex];
    const textBoard = boards[boardNumber].split('\n').map(row => row.split(' '));
    
    board = {width: textBoard[0].length, height: textBoard.length};

    let flipX = random() < 0.5;
    let flipY = random() < 0.5;
    let transpose = (board.width == board.height) && (random() < 0.5);
    let invert = random() < 0.5;
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
            board[x][y] = {'O':1,'X':-1,'.':0}[textBoard[b][a]] * (-1)**invert;
        }
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
        const statusEmoji = player.finished ? '<span class="emoji">✅</span>' : '<span class="emoji">🎮</span>';
        
        // Add trophy for single winner, medal for tied winners
        let winnerEmoji = '';
        if (player.score === highestScore) {
            if (winnersCount === 1) {
                winnerEmoji = '<span class="emoji">🏆</span> '; // Trophy for single winner
            } else {
                winnerEmoji = '<span class="emoji">🥇</span> '; // Gold medal for tied winners
            }
        }
        
        return `${index + 1}. ${winnerEmoji}${player.name}: ${player.score} ${statusEmoji}`;
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
    if (gameState.phase !== 'playing') return;
    
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
                    
                    // Always set dark gold color when completing all boards correctly (override any existing color)
                    failed = true;
                    document.bgColor = 'darkgoldenrod'; // Dark gold for completing all boards correctly
                    console.log('🏁 Player completed all boards correctly - set background to darkgoldenrod, waiting for final results');
                    
                    // Mark ourselves as finished locally
                    const ourPlayer = gameState.players.find(p => p.id === gameState.playerId);
                    if (ourPlayer) {
                        ourPlayer.finished = true;
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
                if (!failed) {
                    timer = -1;
                    failed = true;
                    document.bgColor = 'crimson';
                    // Mark ourselves as finished locally when we get wrong answer
                    const ourPlayer = gameState.players.find(p => p.id === gameState.playerId);
                    if (ourPlayer) {
                        ourPlayer.finished = true;
                        // Auto-show leaderboard when player finishes with wrong answer
                        console.log('Player got wrong answer - auto-showing leaderboard');
                        setTimeout(() => {
                            showLeaderboard();
                        }, 1000); // Longer delay to see the red background effect
                    }
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

    // Timer bar
    push();
    let dx = map(timer, 0, maxTime, 0, width/2 - D);
    fill(255);
    stroke('white');
    strokeCap(ROUND);
    if (timer > 0) line(width/2 - dx, D, width/2 + dx, D);
    pop();

    // Buttons and game over screen (same as original)
    if (timer > 0 || gameState.phase === 'finished') {
        textAlign(CENTER, CENTER);

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
        if (gameState.phase === 'finished') {
            const winResult = didCurrentPlayerWin();
            if (winResult.isWinner) {
                blackText = winResult.isTie ? 'You tied!' : 'You won!';
            } else {
                blackText = 'You lost!';
            }
            textSize(D * 0.7); // Smaller text for completion message
            textStyle(BOLD);
        } else if (IS_DEV_MODE && correct === 'black') {
            blackText = '✓ BLACK'; // Show checkmark for correct answer
            textStyle(BOLD);
        } else if (IS_DEV_MODE && correct === 'white') {
            blackText = 'black'; // Keep normal text for wrong answer
            textStyle(NORMAL);
        }
        
        text(blackText, bx, by);
        textStyle(NORMAL); // Reset style
        
        // Reset text size if it was changed
        if (gameState.phase === 'finished') {
            textSize(D);
        }

        fill('white');
        if (keyIsDown(RIGHT_ARROW)) {
            textSize(D + 12);
        } else if (dist(mouseX, mouseY, wx, wy) < D) {
            if (mouseIsPressed) textSize(D + 12);
            else textSize(D + 6);
        } else {
            textSize(D);
        }
        
        // Show different text based on game state and dev mode
        let whiteText = 'white';
        if (gameState.phase === 'finished') {
            const winResult = didCurrentPlayerWin();
            if (winResult.isWinner) {
                whiteText = winResult.isTie ? 'You tied!' : 'You won!';
            } else {
                whiteText = 'You lost!';
            }
            textSize(D * 0.7); // Smaller text for completion message
            textStyle(BOLD);
        } else if (IS_DEV_MODE && correct === 'white') {
            whiteText = '✓ WHITE'; // Show checkmark for correct answer
            textStyle(BOLD);
        } else if (IS_DEV_MODE && correct === 'black') {
            whiteText = 'white'; // Keep normal text for wrong answer
            textStyle(NORMAL);
        }
        
        text(whiteText, wx, wy);
        textStyle(NORMAL); // Reset style
        
        // Reset text size if it was changed
        if (gameState.phase === 'finished') {
            textSize(D);
        }
        
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
    } else {
        textSize(R);
        noStroke();
        fill(0, 200);
        text(`Game over!\nYour score: ${score}`, width/2, by);
    }
}

function handleClick() {
    // Only allow clicks during active gameplay
    if (gameState.phase !== 'playing' || timer <= 0) return;
    
    if (dist(mouseX, mouseY, bx, by) < D) {
        submitMultiplayer('black');
    } else if (dist(mouseX, mouseY, wx, wy) < D) {
        submitMultiplayer('white');
    }
    
    mouseX = -1;
    mouseY = -1;
}

function keyPressed() {
    if (gameState.phase !== 'playing' || timer <= 0) return;
    
    if (keyCode === LEFT_ARROW) submitMultiplayer('black');
    if (keyCode === RIGHT_ARROW) submitMultiplayer('white');
}

function mouseReleased() {
    return false;
}

function touchEnded() {
    mouseX = -1;
    mouseY = -1;
}
