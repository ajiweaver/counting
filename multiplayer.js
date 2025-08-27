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
    socket.on('player-joined', (data) => {
        updateGameState(data.gameState);
        updateUI();
    });
    
    socket.on('player-left', (data) => {
        updateGameState(data.gameState);
        updateUI();
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
        gameState.allPlayersFinished = gameState.players.every(player => player.finished);
        
        updateLeaderboard();
    });

    socket.on('game-restarted', (data) => {
        updateGameState(data);
        startMultiplayerGame();
    });

    socket.on('returned-to-lobby', (data) => {
        updateGameState(data);
        returnToLobbyUI();
    });
}

// UI Functions
function showMainMenu() {
    document.getElementById('main-menu').classList.remove('hidden');
    document.getElementById('join-room-panel').classList.add('hidden');
    document.getElementById('room-panel').classList.add('hidden');
}

// Load and display leaderboard history
async function loadLeaderboardHistory() {
    try {
        const response = await fetch(`${SERVER_URL}/leaderboard`);
        const data = await response.json();
        
        if (data.success && data.games) {
            displayLeaderboardHistory(data.games);
        } else {
            document.getElementById('history-content').innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">No games yet</div>';
        }
    } catch (error) {
        console.error('Error loading leaderboard history:', error);
        document.getElementById('history-content').innerHTML = '<div style="color: #f44; text-align: center; padding: 20px;">Failed to load</div>';
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
        const winner = game.players[0]; // Already sorted by score
        const duration = formatDuration(game.duration);
        
        return `
            <div style="margin-bottom: 10px; padding: 8px; background: #444; border-radius: 3px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: #4CAF50;">${winner.name}</strong>
                        <span style="color: #ccc;">won with ${winner.score} points</span>
                    </div>
                    <div style="color: #888; font-size: 10px;">${timeAgo}</div>
                </div>
                <div style="color: #aaa; font-size: 10px; margin-top: 2px;">
                    ${game.players.length} players • ${duration} • Room ${game.roomId}
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
let unlimitedTimeMode = false;
let sliderUpdateInProgress = false;

function initializeUI() {
    if (uiInitialized) {
        console.log('UI already initialized, skipping');
        return;
    }
    
    console.log('=== initializeUI called ===');
    const timeSlider = document.getElementById('time-per-board');
    const timeDisplay = document.getElementById('time-display');
    const unlimitedCheckbox = document.getElementById('unlimited-time');
    const timeControls = document.getElementById('time-controls');
    
    const savedTime = localStorage.getItem('timePerBoard');
    const savedUnlimited = localStorage.getItem('unlimitedTime') === 'true';
    
    console.log('DOM Elements found:');
    console.log('- timeSlider:', !!timeSlider, timeSlider ? `value=${timeSlider.value}` : 'null');
    console.log('- timeDisplay:', !!timeDisplay);
    console.log('- unlimitedCheckbox:', !!unlimitedCheckbox);
    console.log('localStorage values:');
    console.log('- savedTime:', savedTime);
    console.log('- savedUnlimited:', savedUnlimited);
    console.log('Global state:');
    console.log('- currentTimePerBoard:', currentTimePerBoard);
    console.log('- defaultTimePerBoard:', defaultTimePerBoard);
    
    // Initialize unlimited mode checkbox
    if (unlimitedCheckbox) {
        unlimitedTimeMode = savedUnlimited;
        unlimitedCheckbox.checked = unlimitedTimeMode;
        
        unlimitedCheckbox.addEventListener('change', function(e) {
            unlimitedTimeMode = e.target.checked;
            localStorage.setItem('unlimitedTime', unlimitedTimeMode);
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
        
        localStorage.setItem('timePerBoard', currentTimePerBoard);
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
    
    // Update visibility based on unlimited mode
    updateTimeControlsVisibility();
    uiInitialized = true;
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
        localStorage.setItem('timePerBoard', currentTimePerBoard);
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
    
    // Use unlimited settings with configurable time
    socket.emit('create-room', {
        settings: {
            timePerBoard: timePerBoard, // Configurable time per board or -1 for unlimited
            totalBoards: -1, // Unlimited boards
            unlimited: true, // Unlimited boards mode
            unlimitedTime: unlimitedTimeMode, // Unlimited time mode
            progressiveDifficulty: true
        }
    }, (response) => {
        if (response.success) {
            gameState.roomId = response.roomId;
            joinCreatedRoom();
        } else {
            alert('Failed to create room: ' + response.error);
        }
    });
}

function joinCreatedRoom() {
    socket.emit('join-room', {
        roomId: gameState.roomId,
        playerName: gameState.playerName
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
    
    socket.emit('join-room', {
        roomId: roomCode,
        playerName: playerName
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

function showRoomLobby() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('join-room-panel').classList.add('hidden');
    document.getElementById('room-panel').classList.remove('hidden');
    
    gameState.phase = 'lobby';
    updateUI();
    loadLeaderboardHistory();
}

function startGame() {
    if (!gameState.isCreator) return;
    
    socket.emit('start-game', (response) => {
        if (!response.success) {
            alert('Failed to start game: ' + response.error);
        }
    });
}

function leaveRoom() {
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

function returnToLobbyUI() {
    // Show UI overlay and room panel
    document.getElementById('ui-overlay').style.display = 'flex';
    document.getElementById('leaderboard').style.display = 'none';
    document.getElementById('leaderboard-toggle').style.display = 'none';
    
    gameState.phase = 'lobby';
    updateUI();
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

function updateUI() {
    // Update room ID
    if (gameState.roomId) {
        document.getElementById('room-id').textContent = gameState.roomId;
    }
    
    // Update player list
    const playerListEl = document.getElementById('player-list');
    playerListEl.innerHTML = '';
    
    gameState.players.forEach(player => {
        const playerEl = document.createElement('div');
        playerEl.className = 'player' + (player.isCreator ? ' creator' : '');
        playerEl.textContent = `${player.name} ${player.isCreator ? '(Host)' : ''} - Score: ${player.score}`;
        playerListEl.appendChild(playerEl);
    });
    
    // Show/hide start button
    const startBtn = document.getElementById('start-button');
    if (gameState.isCreator && gameState.phase === 'lobby') {
        startBtn.classList.remove('hidden');
    } else {
        startBtn.classList.add('hidden');
    }
    
    // Update room status
    const statusEl = document.getElementById('room-status');
    if (gameState.phase === 'lobby') {
        statusEl.textContent = `Waiting for players... (${gameState.players.length} joined)`;
    } else if (gameState.phase === 'playing') {
        statusEl.textContent = `Playing - Board ${gameState.currentBoard + 1}/${gameState.boardSequence.length}`;
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
    document.bgColor = 'seagreen';
    
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
    
    leaderboardContent.innerHTML = sortedPlayers.map((player, index) => {
        const statusEmoji = player.finished ? '<span class="emoji">✅</span>' : '<span class="emoji">🎮</span>';
        return `${index + 1}. ${player.name}: ${player.score} ${statusEmoji}`;
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
                    gameState.phase = 'finished';
                    timer = -1;
                    // Mark ourselves as finished locally
                    const ourPlayer = gameState.players.find(p => p.id === gameState.playerId);
                    if (ourPlayer) ourPlayer.finished = true;
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
                    if (ourPlayer) ourPlayer.finished = true;
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
    // Don't draw game if not playing
    if (gameState.phase !== 'playing') {
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
    if (gameState.settings?.unlimited) {
        boardText = `${gameState.currentBoard + 1}`;
    } else {
        boardText = `${gameState.currentBoard + 1}/${gameState.settings?.totalBoards || gameState.boardSequence.length}`;
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
    if (timer > 0) {
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
        text('black', bx, by);

        fill('white');
        if (keyIsDown(RIGHT_ARROW)) {
            textSize(D + 12);
        } else if (dist(mouseX, mouseY, wx, wy) < D) {
            if (mouseIsPressed) textSize(D + 12);
            else textSize(D + 6);
        } else {
            textSize(D);
        }
        text('white', wx, wy);
        
        if (started) {
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
                        if (ourPlayer) ourPlayer.finished = true;
                        
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
