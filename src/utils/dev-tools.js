// Development Tools
// Debug functions and development utilities

// Override console methods to suppress output in production (NOT localhost)
if (!IS_LOCALHOST) {
    const noop = () => {};
    console.log = noop;
    console.info = noop;
    console.debug = noop;
    // Keep console.warn and console.error for important messages
}

// Mock data control - separate from dev mode
let useMockData = false;

// History loading constants
let historyRetryCount = 0;
const MAX_HISTORY_RETRIES = 1;
const HISTORY_LOAD_DEBOUNCE_MS = 2000; // Don't reload more than once every 2 seconds

// Mock data for development/testing
const MOCK_GAME_HISTORY = [
    {
        gameId: `mock-${Date.now()}-1`,
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
        completedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        duration: 180, // 3 minutes
        players: [
            { name: "swift_shannon", score: 15, finished: true, isCreator: true },
            { name: "quick_qutub", score: 12, finished: true, isCreator: false },
            { name: "fast_fibonacci", score: 8, finished: false, isCreator: false }
        ]
    },
    {
        gameId: `mock-${Date.now()}-2`,
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
        completedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        duration: 240, // 4 minutes
        players: [
            { name: "clever_curie", score: 18, finished: true, isCreator: false },
            { name: "bright_babbage", score: 16, finished: true, isCreator: true },
            { name: "wise_wiles", score: 14, finished: true, isCreator: false }
        ]
    },
    {
        gameId: `mock-${Date.now()}-3`,
        timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(), // 1.5 hours ago
        completedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
        duration: 120, // 2 minutes for 20 boards (6 seconds per board avg) - very fast!
        players: [
            { name: "lightning_lovelace", score: 20, finished: true, isCreator: true }, // Perfect speed run
            { name: "rapid_ramanujan", score: 19, finished: true, isCreator: false }, // Almost perfect speed
            { name: "quick_qutub", score: 14, finished: true, isCreator: false } // Good but not perfect
        ]
    }
];

// Additional mock data for backward compatibility
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
    }
];

// Development helper functions
function debugHardModeState() {
    const gameStateValue = gameState.settings ? gameState.settings.hardMode : 'NOT SET';
    
    console.log('=== HARD MODE STATE DEBUG ===');
    console.log('gameState.settings.hardMode:', gameStateValue);
    console.log('===============================');
    
    return {
        gameState: gameStateValue
    };
}

// Always available console functions (even in production)
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
                'Games for Current Room': gameState.roomId ? data.games.filter(g => String(g.roomId).trim() === String(gameState.roomId).trim()).length : 0
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

// Test functions for development
window.testSummaryScrolling = function(numBoards = 20) {
    console.log(`🧪 Creating mock summary with ${numBoards} boards for scrolling test`);
    
    // Reset to summary phase
    gameState.phase = 'summary';
    viewingSummary = true;
    reviewingBoardIndex = -1;
    
    // Generate mock board results
    currentGameBoardResults = [];
    currentGameInstanceId = `test-${Date.now()}`;
    
    for (let i = 0; i < numBoards; i++) {
        const isCorrect = Math.random() > 0.3; // 70% correct rate
        const mode = Math.random() > 0.5 ? 'hard' : 'normal';
        
        if (mode === 'hard') {
            const colors = ['black', 'white'];
            const winningColor = colors[Math.floor(Math.random() * colors.length)];
            const difference = Math.floor(Math.random() * 20) + 1;
            
            currentGameBoardResults.push({
                boardId: i,
                gameInstanceId: currentGameInstanceId,
                isCorrect: isCorrect,
                mode: 'hard',
                winningColor: winningColor,
                difference: difference,
                blackScore: Math.floor(Math.random() * 50) + 20,
                whiteScore: Math.floor(Math.random() * 50) + 20,
                playerAnswer: `${winningColor === 'black' ? 'B' : 'W'}+${difference + (isCorrect ? 0 : Math.floor(Math.random() * 5) - 2)}`,
                correctAnswer: `${winningColor === 'black' ? 'B' : 'W'}+${difference}`
            });
        } else {
            const colors = ['black', 'white'];
            const correctAnswer = colors[Math.floor(Math.random() * colors.length)];
            const playerAnswer = isCorrect ? correctAnswer : colors[1 - colors.indexOf(correctAnswer)];
            
            currentGameBoardResults.push({
                boardId: i,
                gameInstanceId: currentGameInstanceId,
                isCorrect: isCorrect,
                mode: 'normal',
                correctAnswer: correctAnswer,
                playerAnswer: playerAnswer,
                blackScore: Math.floor(Math.random() * 50) + 20,
                whiteScore: Math.floor(Math.random() * 50) + 20
            });
        }
    }
    
    // Set golden background and adjust layout for scrolling
    document.body.style.backgroundColor = 'goldenrod';
    document.body.style.alignItems = 'flex-start';
    document.body.style.paddingTop = '80px';
    document.body.style.height = 'auto';
    document.body.style.minHeight = '100vh';
    document.body.style.overflowY = 'auto';
    document.body.style.webkitOverflowScrolling = 'touch';
    
    // Hide UI elements
    document.getElementById('ui-overlay').style.display = 'none';
    document.getElementById('leaderboard').style.display = 'none';
    document.getElementById('leaderboard-toggle').style.display = 'none';
    document.getElementById('resign-button').style.display = 'none';
    
    console.log(`✅ Created ${numBoards} mock board results for testing`);
    console.log('Board results:', currentGameBoardResults);
};

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
    console.log(`✅ Completed territory score analysis for ${results.length} boards`);
};

/**
 * Test function to debug territory counting
 * Usage: testBoard(0, false, false, false, false) - tests board 0 with no transformations
 * Usage: testBoard(42, true, false, true, true) - tests board 42 with flipX, transpose, and invert
 */
window.testBoard = function(boardNumber, flipX = false, flipY = false, transpose = false, invert = false) {
    console.log(`\n🧪 === TESTING BOARD ${boardNumber} ===`);
    console.log(`🔄 Transforms: flipX=${flipX}, flipY=${flipY}, transpose=${transpose}, invert=${invert}`);
    
    try {
        // Get the original board and dead stones
        const currentBoards = getCurrentBoards();
        const currentDeadStones = getCurrentDeadStones();
        
        if (boardNumber >= currentBoards.length) {
            console.error(`❌ Board ${boardNumber} doesn't exist! Max board: ${currentBoards.length - 1}`);
            return;
        }
        
        const originalBoard = currentBoards[boardNumber];
        const originalDeadStones = currentDeadStones[boardNumber];
        
        console.log(`📋 Original board (${boardNumber}):`);
        console.log(originalBoard);
        console.log(`💀 Original dead stones:`);
        console.log(originalDeadStones);
        
        // Apply transformations
        const transforms = { flipX, flipY, transpose, invert };
        const transformedBoard = applyBoardTransformations(originalBoard, transforms);
        const transformedDeadStones = applyBoardTransformations(originalDeadStones, transforms);
        
        console.log(`\n🔄 Transformed board:`);
        console.log(transformedBoard);
        console.log(`🔄 Transformed dead stones:`);
        console.log(transformedDeadStones);
        
        // Calculate territory score on original (untransformed) board
        console.log(`\n📊 === TERRITORY CALCULATION (Original) ===`);
        const originalScore = calculateTerritoryScore(originalBoard, originalDeadStones);
        console.log(`🖤 Black Territory: ${originalScore.blackTerritory}`);
        console.log(`⚪ White Territory: ${originalScore.whiteTerritory}`);
        console.log(`📊 Difference: ${originalScore.difference} (${originalScore.winningColor} wins by ${originalScore.scoreMagnitude})`);
        
        // Calculate territory score on transformed board
        console.log(`\n📊 === TERRITORY CALCULATION (Transformed) ===`);
        const transformedScore = calculateTerritoryScore(transformedBoard, transformedDeadStones);
        console.log(`🖤 Black Territory: ${transformedScore.blackTerritory}`);
        console.log(`⚪ White Territory: ${transformedScore.whiteTerritory}`);
        console.log(`📊 Difference: ${transformedScore.difference} (${transformedScore.winningColor} wins by ${transformedScore.scoreMagnitude})`);
        
        // Show what the correct answer would be for both normal and hard mode
        console.log(`\n🎯 === CORRECT ANSWERS ===`);
        console.log(`🎮 Normal Mode Answer: ${transformedScore.winningColor}`);
        console.log(`🔥 Hard Mode Answer: ${transformedScore.winningColor === 'black' ? 'B' : 'W'}+${transformedScore.scoreMagnitude}`);
        
        return {
            original: originalScore,
            transformed: transformedScore,
            winningColor: transformedScore.winningColor,
            boardNumber: boardNumber,
            transforms: transforms
        };
        
    } catch (error) {
        console.error(`❌ Error testing board ${boardNumber}:`, error);
        console.error(error.stack);
    }
};

/**
 * Test multiple boards at once
 * Usage: testBoards([0, 1, 2]) - tests boards 0, 1, 2 with random transforms
 * Usage: testBoards([0, 1], false, true, false, true) - tests boards with specific transforms
 */
window.testBoards = function(boardNumbers, flipX = null, flipY = null, transpose = null, invert = null) {
    console.log(`\n🧪 === TESTING MULTIPLE BOARDS ===`);
    
    const results = [];
    for (const boardNum of boardNumbers) {
        // Use specified transforms or randomize them
        const useFlipX = flipX !== null ? flipX : Math.random() < 0.5;
        const useFlipY = flipY !== null ? flipY : Math.random() < 0.5;
        const useTranspose = transpose !== null ? transpose : Math.random() < 0.5;
        const useInvert = invert !== null ? invert : Math.random() < 0.5;
        
        const result = testBoard(boardNum, useFlipX, useFlipY, useTranspose, useInvert);
        if (result) {
            results.push(result);
        }
    }
    
    console.log(`\n📊 === SUMMARY OF ${results.length} BOARDS ===`);
    results.forEach(result => {
        console.log(`Board ${result.boardNumber}: ${result.winningColor} wins by ${result.original.scoreMagnitude} (transforms: ${JSON.stringify(result.transforms)})`);
    });
    
    return results;
};

/**
 * Quick test of current board being displayed
 * Usage: testCurrentBoard()
 */
window.testCurrentBoard = function() {
    if (!gameState.boardSequence || gameState.currentBoard >= gameState.boardSequence.length) {
        console.log('❌ No current board to test');
        return;
    }
    
    const currentBoardNumber = gameState.boardSequence[gameState.currentBoard];
    const transforms = currentBoardTransforms || { flipX: false, flipY: false, transpose: false, invert: false };
    
    console.log(`🎮 Testing current game board (board #${currentBoardNumber}, game board ${gameState.currentBoard + 1})`);
    return testBoard(currentBoardNumber, transforms.flipX, transforms.flipY, transforms.transpose, transforms.invert);
};

/**
 * Test function to simulate playing a board as if in game mode
 * Usage: testPlayBoard(42) - shows board 42 in playing mode
 * Usage: testPlayBoard(42, true) - shows board 42 in hard mode
 * Usage: testPlayBoard(42, false, 30) - shows board 42 in normal mode with 30 second timer
 */
window.testPlayBoard = function(boardNumber = 0, hardMode = false, timePerBoard = 60) {
    console.log(`🎮 === TESTING PLAY MODE ===`);
    console.log(`🎲 Board: ${boardNumber}`);
    console.log(`🔥 Hard Mode: ${hardMode}`);
    console.log(`⏰ Timer: ${timePerBoard} seconds`);
    
    try {
        // Get the boards
        const currentBoards = hardMode ? (window.boardsHard || boards) : boards;
        const currentDeadStones = hardMode ? (window.deadStonesHard || window.deadStones) : window.deadStones;
        
        if (boardNumber >= currentBoards.length) {
            console.error(`❌ Board ${boardNumber} doesn't exist! Max board: ${currentBoards.length - 1}`);
            return;
        }
        
        // Set up game state for playing
        gameState.phase = 'playing';
        gameState.currentBoard = 0;
        gameState.boardSequence = [boardNumber];
        gameState.settings = {
            hardMode: hardMode,
            timePerBoard: timePerBoard,
            totalBoards: 1
        };
        
        // Initialize game variables (same as startMultiplayerGame)
        window.score = 0;
        window.started = true;
        window.failed = false;
        window.penaltyMode = false;
        window.currentBoardNumber = boardNumber;
        
        // Reset background and layout
        document.body.style.backgroundColor = '';
        document.body.style.alignItems = 'center';
        document.body.style.paddingTop = '';
        document.body.style.height = '100%';
        document.body.style.minHeight = '';
        document.body.style.overflowY = '';
        document.body.style.webkitOverflowScrolling = '';
        
        // Hide UI overlay and show game elements
        document.getElementById('ui-overlay').style.display = 'none';
        document.getElementById('leaderboard-toggle').style.display = 'block';
        document.getElementById('resign-button').style.display = 'block';
        
        // Show board number indicator
        if (typeof showBoardNumberIndicator === 'function') {
            showBoardNumberIndicator();
        }
        
        // Ensure canvas is properly sized for gameplay
        windowResized();
        
        // Initialize timer correctly
        if (gameState.settings && gameState.settings.timePerBoard && gameState.settings.timePerBoard > 0) {
            window.timer = gameState.settings.timePerBoard * 1000;
        } else {
            window.timer = timePerBoard * 1000;
            window.maxTime = timePerBoard * 1000; // maxTime should also be in milliseconds
        }
        
        // Set up hard mode variables if needed
        if (hardMode) {
            window.selectedColor = 1; // Start with black
            window.selectedScoreIndex = 0;
            window.selectedDifference = null;
            
            // Calculate correct answer for reference
            const score = calculateTerritoryScore(currentBoards[boardNumber], currentDeadStones[boardNumber]);
            console.log(`🎯 Correct answer: ${score.winningColor === 'black' ? 'B' : 'W'}+${score.scoreMagnitude}`);
            window.currentTerritoryScore = score;
        } else {
            // Calculate correct answer for normal mode
            const score = calculateTerritoryScore(currentBoards[boardNumber], currentDeadStones[boardNumber]);
            console.log(`🎯 Correct answer: ${score.winningColor}`);
            window.correctColor = score.winningColor;
            window.currentTerritoryScore = score;
        }
        
        // Load and display the board (use index 0 since we have 1 board in sequence)
        loadMultiplayerBoard(0);
        
        console.log(`✅ Playing mode test set up for board ${boardNumber}`);
        console.log(`📋 Use normal controls to play:`);
        if (hardMode) {
            console.log(`   - C key: Toggle color selection`);
            console.log(`   - 1-4 keys: Select score difference`);
            console.log(`   - Click stone button or score buttons`);
        } else {
            console.log(`   - Left/Right arrow keys: Select black/white`);
            console.log(`   - Click black/white stone buttons`);
        }
        console.log(`   - ESC key: Resign/quit`);
        console.log(`⏰ Timer: ${timePerBoard} seconds`);
        
        return {
            boardNumber: boardNumber,
            hardMode: hardMode,
            timePerBoard: timePerBoard,
            correctAnswer: window.currentTerritoryScore
        };
        
    } catch (error) {
        console.error(`❌ Error setting up play test for board ${boardNumber}:`, error);
        console.error(error.stack);
        return null;
    }
};

/**
 * Stop test play mode and return to menu
 * Usage: stopTestPlay()
 */
window.stopTestPlay = function() {
    console.log('🛑 Stopping test play mode');
    
    // Reset game state
    gameState.phase = 'menu';
    gameState.currentBoard = 0;
    gameState.boardSequence = [];
    gameState.settings = null;
    
    // Reset game variables
    window.timer = 0;
    window.maxTime = defaultTimePerBoard * 1000;
    window.started = false;
    window.failed = false;
    window.penaltyMode = false;
    window.score = 0;
    window.currentBoardNumber = null;
    window.correctColor = null;
    window.currentTerritoryScore = null;
    
    // Reset hard mode variables
    window.selectedColor = 1;
    window.selectedScoreIndex = 0;
    window.selectedDifference = null;
    
    // Hide game elements and show main menu
    document.getElementById('ui-overlay').style.display = 'flex';
    document.getElementById('leaderboard-toggle').style.display = 'none';
    document.getElementById('resign-button').style.display = 'none';
    
    // Hide board number indicator
    if (typeof hideBoardNumberIndicator === 'function') {
        hideBoardNumberIndicator();
    }
    
    // Clear canvas
    clear();
    
    console.log('✅ Returned to main menu');
};

// Query leaderboard function for development
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

// Export for global access
window.debugHardModeState = debugHardModeState;
window.MOCK_GAME_HISTORY = MOCK_GAME_HISTORY;
window.MOCK_GAMES = MOCK_GAMES;
window.useMockData = useMockData;
window.historyRetryCount = historyRetryCount;
window.MAX_HISTORY_RETRIES = MAX_HISTORY_RETRIES;
window.HISTORY_LOAD_DEBOUNCE_MS = HISTORY_LOAD_DEBOUNCE_MS;

function debugLeaderboardStats() {
    console.log('=== LEADERBOARD STATS ===');
    console.log('Total calls:', leaderboardHistoryCallCount);
    console.log('Last load time:', new Date(lastHistoryLoadTime).toLocaleTimeString());
    console.log('Time since last load:', Date.now() - lastHistoryLoadTime, 'ms');
    console.log('Load in progress:', historyLoadInProgress);
    console.log('========================');
}


function resetLeaderboardStats() {
    leaderboardHistoryCallCount = 0;
    lastHistoryLoadTime = 0;
    historyLoadInProgress = false;
    console.log('✅ Leaderboard stats reset');
}
