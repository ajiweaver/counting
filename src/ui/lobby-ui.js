// Lobby UI
// User interface for lobby, room creation, and main menu

// UI state variables
let lastLoggedDetailedBoard = null;
let updateUIInProgress = false;
let roomSettingsTimeDebounceTimer = null;
let roomSettingsBoardsDebounceTimer = null;
let sliderUpdateInProgress = false;
const correctAnswerDelay = 200; // milliseconds

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
    document.getElementById('room-panel').classList.add('hidden');
}

// Basic placeholders for essential functions that will be implemented in other modules
async function showRoomLobby() {
    document.getElementById('main-menu').classList.add('hidden');
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

async function updatePlayerListAndStatus() {
    try {
        // Update room status
        const statusEl = document.getElementById('room-status');
        if (gameState.phase === 'lobby') {
            statusEl.textContent = `Waiting for players... (${gameState.players.length} joined)`;
        } else if (gameState.phase === 'playing') {
            statusEl.textContent = `Playing - Board ${gameState.currentBoard + 1}/${gameState.boardSequence.length}`;
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
            let playerText = player.name;
            const isCurrentPlayer = player.id === gameState.playerId;
            
            if (isCurrentPlayer) {
                playerText = `<strong>${playerText}</strong>`;
            }
            
            if (player.isCreator) {
                playerText += ' <span title="Room Creator">👑</span>';
            }
            
            if (player.isDevMode) {
                playerText += ' <span title="Development Mode">🔧</span>';
            }
            
            // Show score in appropriate context
            const scoreText = showingTotalScores ? `(${displayScore} total)` : `(${displayScore})`;
            
            playerEl.innerHTML = `${rankIcon}${playerText} ${scoreText}`;
            playerListEl.appendChild(playerEl);
        });

        // Show/hide start button
        const startBtn = document.getElementById('start-button');
        if (gameState.isCreator && gameState.phase === 'lobby') {
            startBtn.classList.remove('hidden');
        } else {
            startBtn.classList.add('hidden');
        }
        
    } catch (error) {
        console.error('Error in updatePlayerListAndStatus:', error);
    }
}

function updateRoomSettingsDisplay() {
    const roomSettingsEl = document.getElementById('room-settings-content');
    if (!roomSettingsEl) {
        console.log('❌ Room settings element not found');
        return;
    }
    
    if (gameState.settings) {
        const settings = gameState.settings;
        const timeDisplay = settings.timePerBoard === -1 ? '∞' : `${settings.timePerBoard}s`;
        const boardsDisplay = settings.totalBoards === -1 ? '∞' : settings.totalBoards;
        const modeDisplay = settings.hardMode ? 'Hard' : 'Normal';
        const modeColor = settings.hardMode ? '#FF6B6B' : '#4CAF50';
        const scoringDisplay = settings.scoringMode === 'area' ? 'Area' : 'Territory';
        const scoringColor = settings.scoringMode === 'area' ? '#FF9500' : '#2196F3';
        const isCreator = gameState.isCreator && gameState.phase === 'lobby';
        
        if (isCreator) {
            // Check if inputs already exist and preserve focused input values
            const existingTimeInput = document.getElementById('room-time-input');
            const existingBoardsInput = document.getElementById('room-boards-input');
            const isTimeInputFocused = existingTimeInput && document.activeElement === existingTimeInput;
            const isBoardsInputFocused = existingBoardsInput && document.activeElement === existingBoardsInput;
            
            // Preserve current input values if user is typing
            const timeValue = isTimeInputFocused ? existingTimeInput.value : settings.timePerBoard;
            const boardsValue = isBoardsInputFocused ? existingBoardsInput.value : settings.totalBoards;
            
            // Interactive controls for room creator
            roomSettingsEl.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; text-align: center;">
                    <div style="padding: 6px; background: #555; border-radius: 4px;">
                        <div style="color: #ccc; font-size: 11px; margin-bottom: 3px;">TIMER [s]</div>
                        <input type="number" id="room-time-input" min="5" max="600" step="5" value="${timeValue}" onchange="updateRoomTimeFromInput()" style="width: 60px; padding: 4px; border: none; border-radius: 3px; text-align: center; font-size: 13px; font-weight: bold; background: #666; color: white;">
                    </div>
                    <div style="padding: 6px; background: #555; border-radius: 4px;">
                        <div style="color: #ccc; font-size: 11px; margin-bottom: 3px;">BOARDS</div>
                        <input type="number" id="room-boards-input" min="5" max="50" step="5" value="${boardsValue}" onchange="updateRoomBoardsFromInput()" style="width: 60px; padding: 4px; border: none; border-radius: 3px; text-align: center; font-size: 13px; font-weight: bold; background: #666; color: white;">
                    </div>
                    <div style="padding: 6px; background: #555; border-radius: 4px;">
                        <div style="color: #ccc; font-size: 11px; margin-bottom: 3px;">DIFFICULTY</div>
                        <div onclick="toggleRoomHardMode()" style="color: ${modeColor}; font-weight: bold; font-size: 13px; cursor: pointer; padding: 4px; border-radius: 3px; background: #666; width: 60px; text-align: center; display: inline-block; margin-top: 6px;" title="Click to toggle">${modeDisplay}</div>
                    </div>
                    <div style="padding: 6px; background: #555; border-radius: 4px;">
                        <div style="color: #ccc; font-size: 11px; margin-bottom: 3px;">SCORING</div>
                        <div onclick="toggleRoomScoringMode()" style="color: ${scoringColor}; font-weight: bold; font-size: 13px; cursor: pointer; padding: 4px; border-radius: 3px; background: #666; width: 60px; text-align: center; display: inline-block; margin-top: 6px;" title="Click to toggle">${scoringDisplay}</div>
                    </div>
                </div>
            `;
            
            // Restore focus if an input was previously focused
            if (isTimeInputFocused) {
                const newTimeInput = document.getElementById('room-time-input');
                if (newTimeInput) {
                    try {
                        newTimeInput.focus();
                        // Use setTimeout to ensure DOM is ready before setting selection
                        setTimeout(() => {
                            try {
                                if (newTimeInput && newTimeInput.value !== undefined) {
                                    newTimeInput.setSelectionRange(newTimeInput.value.length, newTimeInput.value.length);
                                }
                            } catch (e) {
                                console.log('⚠️ Could not set selection range on time input:', e.message);
                            }
                        }, 0);
                    } catch (e) {
                        console.log('⚠️ Could not focus time input:', e.message);
                    }
                }
            }
            if (isBoardsInputFocused) {
                const newBoardsInput = document.getElementById('room-boards-input');
                if (newBoardsInput) {
                    try {
                        newBoardsInput.focus();
                        // Use setTimeout to ensure DOM is ready before setting selection
                        setTimeout(() => {
                            try {
                                if (newBoardsInput && newBoardsInput.value !== undefined) {
                                    newBoardsInput.setSelectionRange(newBoardsInput.value.length, newBoardsInput.value.length);
                                }
                            } catch (e) {
                                console.log('⚠️ Could not set selection range on boards input:', e.message);
                            }
                        }, 0);
                    } catch (e) {
                        console.log('⚠️ Could not focus boards input:', e.message);
                    }
                }
            }
        } else {
            // Read-only display for non-creators
            roomSettingsEl.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; text-align: center;">
                    <div style="padding: 6px; background: #555; border-radius: 4px;">
                        <div style="color: #ccc; font-size: 11px; margin-bottom: 3px;">TIMER [s]</div>
                        <div style="color: #fff; font-weight: bold; font-size: 13px; padding: 4px; border-radius: 3px; background: #666; width: 60px; text-align: center; display: inline-block; margin-top: 6px;">${timeDisplay}</div>
                    </div>
                    <div style="padding: 6px; background: #555; border-radius: 4px;">
                        <div style="color: #ccc; font-size: 11px; margin-bottom: 3px;">BOARDS</div>
                        <div style="color: #fff; font-weight: bold; font-size: 13px; padding: 4px; border-radius: 3px; background: #666; width: 60px; text-align: center; display: inline-block; margin-top: 6px;">${boardsDisplay}</div>
                    </div>
                    <div style="padding: 6px; background: #555; border-radius: 4px;">
                        <div style="color: #ccc; font-size: 11px; margin-bottom: 3px;">DIFFICULTY</div>
                        <div style="color: ${modeColor}; font-weight: bold; font-size: 13px; padding: 4px; border-radius: 3px; background: #666; width: 60px; text-align: center; display: inline-block; margin-top: 6px;">${modeDisplay}</div>
                    </div>
                    <div style="padding: 6px; background: #555; border-radius: 4px;">
                        <div style="color: #ccc; font-size: 11px; margin-bottom: 3px;">SCORING</div>
                        <div style="color: ${scoringColor}; font-weight: bold; font-size: 13px; padding: 4px; border-radius: 3px; background: #666; width: 60px; text-align: center; display: inline-block; margin-top: 6px;">${scoringDisplay}</div>
                    </div>
                </div>
            `;
        }
        console.log('✓ Room settings display updated:', { timeDisplay, boardsDisplay, modeDisplay, isCreator });
    } else {
        roomSettingsEl.innerHTML = `
            <div style="text-align: center; color: #888; font-style: italic;">
                Loading room settings...
            </div>
        `;
        console.log('⏳ Waiting for room settings...');
    }
}

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
        
        // Update room settings display
        updateRoomSettingsDisplay();
        
        
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

function hideLeaderboard() {
    const leaderboard = document.getElementById('leaderboard');
    const toggle = document.getElementById('leaderboard-toggle');
    
    leaderboard.style.display = 'none';
    toggle.style.display = 'block';
    leaderboardVisible = false;
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
    
    // Host control buttons have been removed from leaderboard
}

// Room management functions - placeholders
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
    
    const timePerBoard = 60; // Default 60 seconds per board
    
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
                    
                    // Sync local game variables with room settings on creator auto-rejoin
                    if (joinResponse.gameState.settings) {
                        currentTimePerBoard = joinResponse.gameState.settings.timePerBoard;
                        currentTotalBoards = joinResponse.gameState.settings.totalBoards;
                        console.log('🔄 Synced local variables with room settings on creator auto-rejoin:', {
                            currentTimePerBoard,
                            currentTotalBoards
                        });
                    }
                    
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

function startGame() {
    if (!gameState.isCreator) return;
    
    // Use current room settings (hard mode is already set when room was created)
    const timePerBoard = currentTimePerBoard;
    const hardMode = gameState.settings ? gameState.settings.hardMode : false;
    const settings = {
        timePerBoard: timePerBoard,
        totalBoards: currentTotalBoards,
        hardMode: hardMode // Use room's hard mode setting
    };
    
    console.log('🎯 Starting game with room hard mode setting:', hardMode);
    console.log('🎯 Full settings object:', settings);
    
    socket.emit('start-game', { settings: settings }, (response) => {
        if (!response.success) {
            alert('Failed to start game: ' + response.error);
        }
    });
}

function leaveRoom() {
    // Clear room storage when leaving
    clearRoomStorage();
    console.log('Left room, cleared storage');
    
    // Reset URL before reloading to ensure clean state
    resetBrowserURL();
    
    socket.disconnect();
    location.reload(); // Simple way to reset everything
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
    timer = -1;
    failed = true;
    penaltyMode = false; // Clear any penalty mode
    
    // Set resign background color (different from other end states)
    document.bgColor = 'dimgray'; // Gray for resignation
    console.log('Player resigned - set background to dimgray');
    
    // Enter summary mode immediately like other completion scenarios
    enterSummaryMode();
    
    // Note: Final colors will be set when server sends game-finished event
    
    // Submit resignation to server (only affects current player)
    socket.emit('submit-answer', { 
        answer: 'resign', 
        isCorrect: false,
        currentBoardIndex: gameState.currentBoard, // Current board, not end
        transforms: currentBoardTransforms
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

function returnToLobby() {
    // If we're viewing historical data, just clear it and return to lobby UI
    if (viewingHistoricalGame) {
        viewingHistoricalGame = null;
        currentGameBoardResults = [];
        currentGameInstanceId = null;
        reviewingBoardIndex = -1;
        cachedSummaryData = null; // Clear cached data
        returnToLobbyUI();
        return;
    }
    
    // Individual player returns to room lobby (stays in room, just changes view)
    console.log('🔙 Individual player returning to room lobby (no server action)');
    returnToRoomLobby();
}

function returnToRoomLobby() {
    // Set user override to lobby to prevent server from changing phase
    userOverridePhase = 'lobby';
    gameState.phase = 'lobby';
    viewingSummary = false;
    reviewingBoardIndex = -1;
    console.log('🔒 Set user override phase to lobby to prevent server state changes');
    
    // Clear the canvas and reset background
    if (typeof clear === 'function') {
        clear();
    }
    
    // Reset document background color and layout to default
    document.bgColor = '';
    document.body.style.backgroundColor = '';
    document.body.style.alignItems = 'center';
    document.body.style.paddingTop = '';
    document.body.style.height = '100%';
    document.body.style.minHeight = '';
    document.body.style.overflowY = '';
    document.body.style.webkitOverflowScrolling = '';
    
    // Reset game state variables that might affect drawing
    failed = false;
    started = false;
    
    // Reset canvas size to normal game proportions
    windowResized();
    
    // Hide game-related UI elements
    document.getElementById('leaderboard').style.display = 'none';
    document.getElementById('leaderboard-toggle').style.display = 'none';
    document.getElementById('resign-button').style.display = 'none';
    
    // Hide summary back buttons
    const backToSummaryBtn = document.getElementById('back-to-summary-button');
    const backToLobbyBtn = document.getElementById('back-to-lobby-button');
    const prevBoardBtn = document.getElementById('prev-board-button');
    const nextBoardBtn = document.getElementById('next-board-button');
    
    if (backToSummaryBtn) backToSummaryBtn.style.display = 'none';
    if (backToLobbyBtn) backToLobbyBtn.style.display = 'none';
    if (prevBoardBtn) prevBoardBtn.style.display = 'none';
    if (nextBoardBtn) nextBoardBtn.style.display = 'none';
    
    // Show the room UI overlay (lobby)
    document.getElementById('ui-overlay').style.display = 'flex';
    showRoomLobby();
    
    console.log('✅ Individual player returned to room lobby');
}

// P5.js functions - basic placeholders
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


function draw() {
    // Handle different game phases
    if (gameState.phase === 'summary') {
        // Don't draw summary if lobby UI overlay is visible
        const uiOverlay = document.getElementById('ui-overlay');
        if (uiOverlay && uiOverlay.style.display !== 'none') {
            clear(); // Clear canvas when lobby is visible
            return;
        }
        
        // Always ensure back buttons are visible in summary mode
        updateSummaryButtons();
        
        if (reviewingBoardIndex >= 0) {
            // Draw individual board review
            drawBoardReview();
        } else {
            drawSummaryScreen();
        }
        return;
    }
    
    // Don't draw game if not playing (but show completed board if finished)
    if (gameState.phase !== 'playing' && gameState.phase !== 'finished') {
        clear();
        return;
    }
    
    // Update resign button visibility based on current game state
    updateResignButtonVisibility();
    
    // Removed automatic lobby countdown - players stay in summary screen
    
    clear();
    
    // Draw board using the reusable function
    displayTextY = 0.1*width;
    timerY = displayTextY + R;
    boardY = timerY + 1.5*R;
    boardX = D;
    if (gameState.phase !== 'finished') {
        drawGoBoard(board, boardX, boardY, D, R - halfStrokeWeight, 2*halfStrokeWeight, false);
    }

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

    boardText = `${displayBoardNumber}/${gameState.settings?.totalBoards || gameState.boardSequence.length}`;

    // Add remaining time in seconds
    const remainingSeconds = Math.max(0, Math.ceil(timer / 1000));
    const displayText = `${boardText} - ${remainingSeconds}s`;

    text(displayText, width/2, displayTextY);
    pop();

    // Timer bar (only show when game is active)
    if (gameState.phase !== 'finished') {
        push();
        let dx = map(timer, 0, maxTime, 0, width/2 - D);
        fill(255);
        stroke('white');
        strokeCap(ROUND);
        if (timer > 0) line(width/2 - dx, timerY, width/2 + dx, timerY);
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
                // Normal mode: Show stone buttons (like hard mode but simpler)
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
                console.log('⏰ Player timed out - set background to royalblue');
                
                // Enter summary mode immediately like other completion scenarios
                enterSummaryMode();
                
                // Submit timeout as wrong answer to notify server
                socket.emit('submit-answer', { 
                    answer: 'timeout', 
                    isCorrect: false,
                    currentBoardIndex: gameState.currentBoard,
                    transforms: currentBoardTransforms
                }, (response) => {
                    console.log('Timeout submitted to server');
                    if (response.success) {
                        // Mark ourselves as finished locally
                        const ourPlayer = gameState.players.find(p => p.id === gameState.playerId);
                        if (ourPlayer) {
                            ourPlayer.finished = true;
                            
                            // Note: Final colors will be set when server sends game-finished event
                            
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
    
    // Removed countdown display - players stay in summary screen
}


function windowResized() {
    R = floor(min(window.innerWidth/10, window.innerHeight/12)/2)-1;
    D = 2 * R;
    
    // Calculate dimensions based on game state
    if (gameState.phase === 'summary' && viewingSummary && reviewingBoardIndex === -1) {
        // In summary grid mode - calculate required height for all boards to enable scrolling
        width = Math.min(window.innerWidth * 0.95, 1000); // Max 95% of viewport width, cap at 1000px
        
        // Calculate actual height needed for all boards
        const boardResults = currentGameBoardResults.filter(result => result.gameInstanceId === currentGameInstanceId);
        if (boardResults.length > 0) {
            const boardsPerRow = Math.min(4, Math.ceil(Math.sqrt(boardResults.length)));
            const rows = Math.ceil(boardResults.length / boardsPerRow);
            const miniSize = 120;
            const gap = 20;
            
            // Calculate required height: title area + grid + margins
            const titleHeight = 120; // Space for title and text
            const gridHeight = rows * (miniSize + 90) + (rows - 1) * gap; // Each row + gaps + time text
            const bottomMargin = 100; // Space for back button and bottom margin
            
            const calculatedHeight = titleHeight + gridHeight + bottomMargin;
            const minHeight = Math.max(window.innerHeight * 0.6, 400); // Minimum height
            
            height = Math.max(calculatedHeight, minHeight);
        } else {
            height = Math.max(window.innerHeight * 0.6, 400); // Default minimum height
        }
    } else {
        // Default dimensions for gameplay and individual board review - increased for button animations
        width = 10 * D;
        height = 13 * D;
        
        //// Add extra height for territory information in detailed summary view
        //if (gameState.phase === 'summary' && viewingSummary && reviewingBoardIndex !== -1) {
            //height += 3 * R; // Add proportional space for territory information (scales with window size)
        //}
    }
    
    halfStrokeWeight = ceil(D/70);
    strokeWeight(2 * halfStrokeWeight);

    sx = width/2;
    sy = 1.5*R;
    
    bx = width/2 - 1.1*D;
    by = height - 2.8*R;
    wx = width/2 + 1.1*D;
    wy = height - 2.8*R;
    
    resizeCanvas(width, height);
    
    // Reset summary drawn flag so it redraws after resize
    if (gameState.phase === 'summary' && viewingSummary && reviewingBoardIndex === -1) {
        cachedSummaryData = null; // Clear cached data so it recalculates positions
    }
    
    // Update button visibility after resize (important for summary mode)
    if (gameState.phase === 'summary') {
        updateSummaryButtons();
    }
    
    // Check leaderboard overlap when window is resized
    checkLeaderboardOverlap();
}

function keyPressed() {
    console.log('⌨️ keyPressed called - keyCode:', keyCode, 'key:', key, 'ENTER constant:', ENTER, 'gameState.phase:', gameState.phase);
    
    // Handle Escape key for resignation during gameplay
    if (keyCode === ESCAPE && gameState.phase === 'playing' && !failed) {
        resignGame();
        return;
    }
    
    // Handle Escape key for back navigation in summary mode
    if (keyCode === ESCAPE && gameState.phase === 'summary') {
        if (reviewingBoardIndex !== -1) {
            // Reviewing individual board - go back to summary grid
            backToSummary();
        } else {
            // In summary grid view - go back to lobby
            backToLobbyFromSummary();
        }
        return;
    }
    
    // Handle Enter key to view first board in summary grid mode
    if ((keyCode === ENTER || keyCode === 13 || key === 'Enter') && gameState.phase === 'summary' && reviewingBoardIndex === -1) {
        // Always use the same filtering logic as the miniboards grid (don't reuse stale data)
        const boardResultsToShow = currentGameBoardResults.filter(result => result.gameInstanceId === currentGameInstanceId);
        if (boardResultsToShow.length > 0) {
            // Store the filtered results for board review and navigate to first board
            window.currentDisplayBoardResults = boardResultsToShow;
            viewBoardFromSummary(0);
            console.log('⌨️ Enter pressed - viewing first board in detailed summary');
        }
        return;
    }
    
    // Handle arrow key navigation in detailed summary view
    if (gameState.phase === 'summary' && reviewingBoardIndex !== -1) {
        if (keyCode === LEFT_ARROW) {
            navigateToPreviousBoard();
            return;
        }
        if (keyCode === RIGHT_ARROW) {
            navigateToNextBoard();
            return;
        }
    }
    
    // Handle Escape key to leave room when in lobby
    if (keyCode === ESCAPE && gameState.phase === 'lobby') {
        leaveRoom();
        return;
    }
    
    // Handle Enter key to create room when in main menu
    if (keyCode === ENTER || keyCode === 13 || key === 'Enter') {
        console.log('⌨️ Enter key detected, current phase:', gameState.phase);
        if (gameState.phase === 'menu') {
            console.log('⌨️ In menu phase - creating room');
            createRoom();
            return;
        } else {
            console.log('⌨️ Not in menu phase, ignoring Enter key');
        }
    }
    
    // Handle Enter key to start game when in lobby (if user is creator and can start)
    if ((keyCode === ENTER || keyCode === 13 || key === 'Enter') && gameState.phase === 'lobby') {
        const startButton = document.getElementById('start-button');
        if (startButton && !startButton.classList.contains('hidden') && gameState.isCreator) {
            startGame();
            console.log('⌨️ Enter pressed - starting game from lobby');
        }
        return;
    }
    
    // Handle G key to toggle game mode (hard mode on/off) - only in lobby and if creator
    if ((key === 'g' || key === 'G') && gameState.phase === 'lobby') {
        toggleRoomHardMode();
        console.log('⌨️ G key pressed - toggling game mode');
        return;
    }
    
    // Handle S key to toggle scoring mode (territory/area) - only in lobby and if creator
    if ((key === 's' || key === 'S') && gameState.phase === 'lobby') {
        toggleRoomScoringMode();
        console.log('⌨️ S key pressed - toggling scoring mode');
        return;
    }
    
    // No longer needed - removed automatic lobby countdown
    
    if (gameState.phase !== 'playing' || timer <= 0 || penaltyMode || failed) return;
    
    // Hard mode keyboard controls
    if (gameState.settings && gameState.settings.hardMode) {
        // 'C' key to toggle color selection
        if (key === 'c' || key === 'C') {
            selectedColorValue = selectedColorValue === 1 ? -1 : 1;
            console.log(`Toggled to ${selectedColorValue === 1 ? 'black' : 'white'} (${selectedColorValue})`);
            
            // Trigger bounce animation for stone button
            stoneButtonBounce = 1;
            return;
        }
        
        // Number keys 1-4 to select score buttons
        if (key >= '1' && key <= '4') {
            const buttonIndex = parseInt(key) - 1; // Convert to 0-based index
            
            if (scoreChoices && scoreChoices[buttonIndex] !== undefined) {
                selectedDifference = scoreChoices[buttonIndex];
                console.log(`Selected score difference: ${selectedDifference} (button ${key})`);
                
                // Trigger bounce animation for selected score button
                scoreButtonBounces[buttonIndex] = 1;
                
                // Submit answer with color value and score
                submitHardModeAnswer(selectedColorValue, selectedDifference);
            }
            return;
        }
        
        // HJKL keys (vim-style) to select score buttons: H=1st, J=2nd, K=3rd, L=4th
        const hjklKeys = {'h': 0, 'j': 1, 'k': 2, 'l': 3, 'H': 0, 'J': 1, 'K': 2, 'L': 3};
        if (hjklKeys.hasOwnProperty(key)) {
            const buttonIndex = hjklKeys[key];
            
            if (scoreChoices && scoreChoices[buttonIndex] !== undefined) {
                selectedDifference = scoreChoices[buttonIndex];
                console.log(`Selected score difference: ${selectedDifference} (${key.toUpperCase()} key)`);
                
                // Trigger bounce animation for selected score button
                scoreButtonBounces[buttonIndex] = 1;
                
                // Submit answer with color value and score
                submitHardModeAnswer(selectedColorValue, selectedDifference);
            }
            return;
        }
    } else {
        // Normal mode keyboard controls
        if (keyCode === LEFT_ARROW) submitNormalModeAnswer('black');
        if (keyCode === RIGHT_ARROW) submitNormalModeAnswer('white');
    }
}

// Handle socket responses - placeholders
function handleJoinRoomResponse(response) {
    console.log('🔗 Join room response:', response);
}

function handleCreateRoomResponse(response) {
    console.log('🏠 Create room response:', response);
}

// Additional essential functions to prevent errors
function enterSummaryMode() {
    console.log('🎯 Entering summary mode with', currentGameBoardResults.length, 'board results for game instance:', currentGameInstanceId);
    console.log('📋 Current game board results:', currentGameBoardResults.map(r => ({boardId: r.boardId, gameInstanceId: r.gameInstanceId, isCorrect: r.isCorrect})));
    
    // Early exit if already in summary mode to preserve all state
    if (getEffectivePhase() === 'summary') {
        console.log('🔒 Already in summary mode - skipping all state changes to preserve current view');
        console.log('🔍 Current view state: reviewingBoardIndex =', reviewingBoardIndex, ', viewingSummary =', viewingSummary);
        console.log('🔍 Phase state: gameState.phase =', gameState.phase, ', userOverridePhase =', userOverridePhase);
        return;
    }
    
    // Check if we're already in summary mode and reviewing a board (legacy check, shouldn't reach here)
    const wasAlreadyReviewingBoard = false; // Always false since we exit early if in summary mode
    
    gameState.phase = 'summary';
    userOverridePhase = 'summary'; // Lock user into summary phase
    viewingSummary = true;
    console.log('✅ Set viewingSummary to true and locked user override to summary phase');
    
    // Only reset to grid view if we weren't already reviewing a specific board
    if (!wasAlreadyReviewingBoard) {
        reviewingBoardIndex = -1; // Show grid view
        console.log('📋 Set to grid view (reviewingBoardIndex = -1)');
    } else {
        console.log('🔍 Preserving board review state (reviewingBoardIndex =', reviewingBoardIndex, ')');
    }
    timer = -1;
    summaryLogged = false; // Reset logging flag when entering summary mode
    cachedSummaryData = null; // Clear cached summary data
    
    // Set golden background for summary phase
    document.bgColor = 'goldenrod';
    document.body.style.backgroundColor = 'goldenrod';
    
    // Adjust body alignment for scrollable summary content
    document.body.style.alignItems = 'flex-start';
    document.body.style.paddingTop = '80px';
    document.body.style.height = 'auto';
    document.body.style.minHeight = '100vh';
    document.body.style.overflowY = 'auto';
    document.body.style.webkitOverflowScrolling = 'touch';
    
    // Show appropriate back button
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
        updateSummaryButtons();
    }, 10);
    
    // Hide leaderboard when entering summary mode
    hideLeaderboard();
    
    // Calculate final score
    const correctCount = currentGameBoardResults.filter(result => result.isCorrect).length;
    console.log(`📊 Final score: ${correctCount}/${currentGameBoardResults.length} correct`);
    
    // Hide game elements
    hideBoardNumberIndicator();
    hideScoringModeIndicator();
    document.getElementById('resign-button').style.display = 'none';
    
    // Hide leaderboard in summary mode
    document.getElementById('leaderboard').style.display = 'none';
    document.getElementById('leaderboard-toggle').style.display = 'none';
    leaderboardVisible = false;
    
    // Recalculate canvas size for summary content
    windowResized();
}

async function returnToLobbyUI() {
    // Clear user override phase when returning to lobby
    userOverridePhase = null;
    console.log('🔓 Cleared user override phase for lobby return');
    
    // Only reset browser URL if completely leaving the room (not in room lobby)
    if (!gameState.roomId || gameState.phase !== 'lobby') {
        resetBrowserURL();
    }
    
    // Clear the canvas and reset background
    if (typeof clear === 'function') {
        clear();
    }
    
    // Reset document background color and layout to default
    document.bgColor = '';
    document.body.style.backgroundColor = '';
    document.body.style.alignItems = 'center';
    document.body.style.paddingTop = '';
    document.body.style.height = '100%';
    document.body.style.minHeight = '';
    document.body.style.overflowY = '';
    document.body.style.webkitOverflowScrolling = '';
    
    // Reset game state variables that might affect drawing
    failed = false;
    started = false;
    
    // Reset canvas size to normal game proportions
    windowResized();
    
    // Hide all game-related UI elements
    document.getElementById('leaderboard').style.display = 'none';
    document.getElementById('leaderboard-toggle').style.display = 'none';
    document.getElementById('resign-button').style.display = 'none';
    const backToSummaryBtn = document.getElementById('back-to-summary-button');
    const backToLobbyBtn = document.getElementById('back-to-lobby-button');
    const prevBoardBtn = document.getElementById('prev-board-button');
    const nextBoardBtn = document.getElementById('next-board-button');
    
    if (backToSummaryBtn) backToSummaryBtn.style.display = 'none';
    if (backToLobbyBtn) backToLobbyBtn.style.display = 'none';
    if (prevBoardBtn) prevBoardBtn.style.display = 'none';
    if (nextBoardBtn) nextBoardBtn.style.display = 'none';
    hideBoardNumberIndicator();
    hideScoringModeIndicator();
    
    // Reset leaderboard visibility flag
    leaderboardVisible = false;
    
    // Show UI overlay and room panel
    document.getElementById('ui-overlay').style.display = 'flex';
    
    gameState.phase = 'lobby';
    await updateUI();
}

function startMultiplayerGame() {
    // Clear user override when starting new game
    userOverridePhase = null;
    gameState.phase = 'playing';
    console.log('🔓 Cleared user override phase for new game start');
    
    // Hide UI overlay
    document.getElementById('ui-overlay').style.display = 'none';
    
    // Show board number indicator for bug reporting
    showBoardNumberIndicator();
    
    // Show scoring mode indicator during gameplay
    showScoringModeIndicator();
    updateScoringModeIndicator();
    
    // Hide summary back buttons during gameplay
    const backToSummaryBtn = document.getElementById('back-to-summary-button');
    const backToLobbyBtn = document.getElementById('back-to-lobby-button');
    const prevBoardBtn = document.getElementById('prev-board-button');
    const nextBoardBtn = document.getElementById('next-board-button');
    
    if (backToSummaryBtn) backToSummaryBtn.style.display = 'none';
    if (backToLobbyBtn) backToLobbyBtn.style.display = 'none';
    if (prevBoardBtn) prevBoardBtn.style.display = 'none';
    if (nextBoardBtn) nextBoardBtn.style.display = 'none';
    
    // Show leaderboard and toggle button
    leaderboardVisible = true;
    document.getElementById('leaderboard').style.display = 'block';
    document.getElementById('leaderboard-toggle').style.display = 'none';
    
    
    // Host controls have been removed from leaderboard
    
    // Reset game variables
    score = 0;
    started = true;
    failed = false;
    penaltyMode = false;
    lobbyCountdown = 0;
    lobbyCountdownActive = false;
    
    // Reset background color and layout from summary mode
    document.body.style.backgroundColor = '';
    document.body.style.alignItems = 'center';
    document.body.style.paddingTop = '';
    document.body.style.height = '100%';
    document.body.style.minHeight = '';
    document.body.style.overflowY = '';
    document.body.style.webkitOverflowScrolling = '';
    
    // Ensure canvas is properly sized for gameplay
    windowResized();
    
    // Load first board
    loadMultiplayerBoard(0);
    
    // Update board number indicator
    updateBoardNumberIndicator();
    
    // Start timer with the base value from game settings
    if (gameState.settings && gameState.settings.timePerBoard && gameState.settings.timePerBoard > 0) {
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
    
    // Start timing for this board
    boardStartTime = Date.now();
    
    // Update board number indicator
    updateBoardNumberIndicator();

    // Extract board strings
    const currentBoards = getCurrentBoards();
    let boardString = currentBoards[boardNumber]
    const currentDeadStones = getCurrentDeadStones();
    let deadStonesString = currentDeadStones[boardNumber];

    // Compute board transformations
    let flipX = Math.random() < 0.5;
    let flipY = Math.random() < 0.5;
    let transpose = Math.random() < 0.5;
    let invert = Math.random() < 0.5;
    
    // Save transformations globally for server submission
    currentBoardTransforms = { flipX, flipY, transpose, invert };
    
    // Log board transformations during gameplay
    console.log(`🔄 BOARD TRANSFORMATIONS (Board #${boardNumber}, Game Board ${boardIndex + 1}):`);
    console.log(`   flipX: ${flipX} (${flipX ? 'horizontally flipped' : 'not flipped horizontally'})`);
    console.log(`   flipY: ${flipY} (${flipY ? 'vertically flipped' : 'not flipped vertically'})`);
    console.log(`   transpose: ${transpose} (${transpose ? 'rotated 90°' : 'not rotated'})`);
    console.log(`   invert: ${invert} (${invert ? 'colors inverted' : 'colors normal'})`);
    

    // Use the processed board that matches what the player sees, and pass the board number for dead stones
    boardString = applyBoardTransformations(boardString, currentBoardTransforms);
    deadStonesString = applyBoardTransformations(deadStonesString, currentBoardTransforms);
    
    // Calculate both territory and area scores for comparison
    const territoryScore = calculateTerritoryScore(boardString, deadStonesString);
    const areaScore = calculateAreaScore(boardString, deadStonesString);
    
    // Update board variable
    board = getBoard(boardString);

    // Comprehensive scoring logging
    console.log('📊 === SCORING CALCULATION ===');
    console.log('📊 Current Mode:', gameState.settings?.scoringMode || 'territory (default)');
    console.log('📊 Territory Scoring:');
    console.log('   - Black Territory:', territoryScore.blackTerritory);
    console.log('   - White Territory:', territoryScore.whiteTerritory);
    console.log('   - Difference:', territoryScore.difference);
    console.log('   - Winner:', territoryScore.winningColor, 'by', Math.abs(territoryScore.difference));
    console.log('📊 Area Scoring:');
    console.log('   - Black Stones Alive:', areaScore.blackStonesAlive);
    console.log('   - White Stones Alive:', areaScore.whiteStonesAlive);
    console.log('   - Black Area:', areaScore.blackArea, '(', areaScore.blackStonesAlive, 'stones +', areaScore.blackTerritory, 'territory)');
    console.log('   - White Area:', areaScore.whiteArea, '(', areaScore.whiteStonesAlive, 'stones +', areaScore.whiteTerritory, 'territory)');
    console.log('   - Area Difference:', areaScore.difference);
    console.log('   - Winner:', areaScore.winningColor, 'by', Math.abs(areaScore.difference));
    
    // Determine which scoring method to use
    const usingAreaScoring = gameState.settings?.scoringMode === 'area';
    const activeScore = usingAreaScoring ? areaScore : territoryScore;
    
    console.log('📊 CORRECT ANSWER:', usingAreaScoring ? 
        `Area mode: ${areaScore.winningColor} by ${Math.abs(areaScore.difference)}` : 
        `Territory mode: ${territoryScore.winningColor} by ${Math.abs(territoryScore.difference)}`);
    console.log('📊 === END SCORING ===');

    // Set correct answer based on active scoring mode
    correctColor = activeScore.winningColor;
    const scoreMagnitude = activeScore.scoreMagnitude;
    
    // Store both scores for answer validation
    window.currentTerritoryScore = territoryScore;
    window.currentAreaScore = areaScore;
    
    // Calculate territory score for hard mode
    if (gameState.settings && gameState.settings.hardMode) {
        
        // Show detailed scoring in dev mode
        console.log(`🎯 DEV MODE: Territory scoring - Black: ${territoryScore.blackTerritory}, White: ${territoryScore.whiteTerritory}, Difference: ${territoryScore.difference}, Winner: ${territoryScore.winningColor}`);
        console.log(`🎯 DEV MODE: Loading board ${boardIndex + 1}/${gameState.boardSequence.length} (board #${boardNumber}) - boardNumber: ${boardNumber}`);
        
        
        // Generate score choice buttons with varied wrong choices (no duplicates)
        const uniqueChoices = new Set();
        
        // Add the correct answer first
        uniqueChoices.add(scoreMagnitude);
        
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
                choice = Math.max(0, scoreMagnitude - offset); // Allow zero - ties are possible
            } else {
                choice = scoreMagnitude + offset;
            }
            
            // Zero is now a valid choice since ties can happen
            
            uniqueChoices.add(choice);
        }
        
        // Convert Set to array and sort in increasing order
        scoreChoices = Array.from(uniqueChoices).sort((a, b) => a - b);
        
        console.log('🎲 Generated score choices:', scoreChoices);
        console.log('🎲 Correct score:', scoreMagnitude, 'using', usingAreaScoring ? 'area' : 'territory', 'scoring');
        
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
                    const posChoice = scoreMagnitude + offset;
                    if (!currentChoices.includes(posChoice)) {
                        fallbackChoice = posChoice;
                        break;
                    }
                    
                    // Try negative offset (allowing zero since ties are possible)
                    const negChoice = Math.max(0, scoreMagnitude - offset);
                    if (!currentChoices.includes(negChoice)) {
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
    
    // Reset normal mode stone animations
    blackStoneBounce = 0;
    whiteStoneBounce = 0;
    
    // Only reset error shake animation if we're not in penalty mode
    if (!penaltyMode) {
        errorShakeIntensity = 0;
        errorShakeTime = 0;
    }
    
    failed = false;
    
    // Don't override completion colors - only set green for active gameplay
    //if (gameState.phase !== 'finished') {
    document.bgColor = 'seagreen';
    //}
    
    // Always use the base time from settings (don't accumulate progressive difficulty)
    if (gameState.settings && gameState.settings.timePerBoard && gameState.settings.timePerBoard > 0) {
        timer = gameState.settings.timePerBoard * 1000;
        console.log('Setting timer to base time from settings:', timer);
    } else {
        timer = maxTime; // Fallback to maxTime
        console.log('Using fallback maxTime:', timer);
    }
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

function displayLeaderboardHistory(games) {
    const historyContent = document.getElementById('history-content');
    
    if (games.length === 0) {
        historyContent.innerHTML = '';
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
            <div style="margin-bottom: 10px; padding: 8px; background: #444; border-radius: 3px; cursor: pointer; transition: background 0.2s ease;" 
                 onclick="viewHistoricalGameSummary('${game.id}')"
                 onmouseover="this.style.background='#555'"
                 onmouseout="this.style.background='#444'">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: ${resultColor};">${resultText}</strong>
                    </div>
                    <div style="color: #888; font-size: 10px;">${timeAgo}</div>
                </div>
                <div style="color: #aaa; font-size: 10px; margin-top: 2px;">
                    ${game.players.length} ${game.players.length === 1 ? 'player' : 'players'} • ${duration} • <em>Click to view summary</em>
                </div>
                <div style="color: #bbb; font-size: 10px; margin-top: 4px; line-height: 1.3;">
                    ${game.players.map(player => 
                        `${player.name}: ${player.score}`
                    ).join(' • ')}
                </div>
            </div>
        `;
    }).join('');
    
    historyContent.innerHTML = html;
}

// Leaderboard responsive behavior
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

// Export functions for global access
window.showMainMenu = showMainMenu;
window.showRoomLobby = showRoomLobby;
window.updatePlayerListAndStatus = updatePlayerListAndStatus;
window.updateRoomSettingsDisplay = updateRoomSettingsDisplay;
window.updateUI = updateUI;
window.showLeaderboard = showLeaderboard;
window.hideLeaderboard = hideLeaderboard;
window.updateLeaderboard = updateLeaderboard;
window.createRoom = createRoom;
window.startGame = startGame;
window.leaveRoom = leaveRoom;
window.resignGame = resignGame;
window.returnToLobby = returnToLobby;
window.preload = preload;
window.setup = setup;
window.draw = draw;
window.windowResized = windowResized;
window.keyPressed = keyPressed;
window.handleJoinRoomResponse = handleJoinRoomResponse;
window.handleCreateRoomResponse = handleCreateRoomResponse;
window.enterSummaryMode = enterSummaryMode;
window.returnToLobbyUI = returnToLobbyUI;
window.startMultiplayerGame = startMultiplayerGame;
window.loadMultiplayerBoard = loadMultiplayerBoard;
window.toggleLeaderboard = toggleLeaderboard;
window.displayLeaderboardHistory = displayLeaderboardHistory;
window.checkLeaderboardOverlap = checkLeaderboardOverlap;
window.toggleRoomHardMode = toggleRoomHardMode;
window.toggleRoomScoringMode = toggleRoomScoringMode;

function drawSummaryScreen() {
    // Since we no longer have history-summary mode, determine if it's historical from other indicators
    const isHistoricalData = (viewingHistoricalGame !== null);
    
    let boardResultsToShow = [];
    let titleText = '';
    let subtitleText = '';
    
    // Use cached data if available, otherwise compute it once
    if (!cachedSummaryData) {
        // Data is already prepared in currentGameBoardResults by the calling function
        if (!summaryLogged) {
            console.log('🎨 Drawing game summary for instance:', currentGameInstanceId);
            console.log('🔍 Boards in currentGameBoardResults:', currentGameBoardResults.map(r => ({boardId: r.boardId, gameInstanceId: r.gameInstanceId})));
        }
        
        // Filter to ensure we only show boards from the current game instance
        const filteredBoardResults = currentGameBoardResults.filter(result => result.gameInstanceId === currentGameInstanceId);
        if (!summaryLogged) {
            console.log('✅ Filtered to current game instance only:', filteredBoardResults.length, 'boards');
            summaryLogged = true; // Set flag to prevent repeated logging
        }
        
        const correctCount = filteredBoardResults.filter(result => result.isCorrect).length;
        const totalCount = filteredBoardResults.length;
        
        // Calculate average time from boards with timing data
        const timesArray = filteredBoardResults
            .filter(r => r.timeTaken !== undefined && r.timeTaken !== null)
            .map(r => r.timeTaken);
        const avgTime = timesArray.length > 0 
            ? timesArray.reduce((a, b) => a + b, 0) / timesArray.length 
            : null;
        
        // Always use the same title format regardless of historical vs current
        const computedTitleText = `Game Summary - ${correctCount}/${totalCount} Correct`;
        
        // Add average time to subtitle if available
        const avgTimeText = avgTime !== null ? `Average time per board: ${avgTime.toFixed(1)}s` : '';
        const computedSubtitleText = `Click any board to review in detail`;
        
        // Cache the computed data
        cachedSummaryData = {
            boardResultsToShow: filteredBoardResults,
            correctCount,
            totalCount,
            titleText: computedTitleText,
            subtitleText: computedSubtitleText,
            avgTimeText: avgTimeText, 
        };
    }
    
    // Use cached data
    boardResultsToShow = cachedSummaryData.boardResultsToShow;
    titleText = cachedSummaryData.titleText;
    subtitleText = cachedSummaryData.subtitleText;
    avgTimeText = cachedSummaryData.avgTimeText;
    const { correctCount, totalCount } = cachedSummaryData;
    
    clear();
    
    // Always use current game summary styling (dark overlay background with rounded corners)
    push();
    fill(0, 0, 0, 200); // Dark overlay with transparency
    const cornerRadius = 20; // Rounded corner radius
    rect(0, 0, width, height, cornerRadius);
    pop();
    
    // Handle case where no board data is available
    if (boardResultsToShow.length === 0) {
        push();
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(24);
        text(titleText, width/2, height/2 - 60);
        
        textSize(16);
        fill(200);
        text('No board data available', width/2, height/2 - 20);
        pop();
        
        return;
    }
    
    // Title and subtitle (always use current game format) with responsive sizing
    push();
    fill(255);
    textAlign(CENTER, CENTER);
    
    // Scale title size based on canvas width (24px base, scales between 18-32px)
    const titleSize = Math.max(18, Math.min(32, width * 0.024));
    textSize(titleSize);
    textFont('Arial');
    
    const spacing = 30;
    titleTextY = 20 + spacing;
    text(titleText, width/2, titleTextY);
    
    // Scale subtitle size based on canvas width (16px base, scales between 12-20px)
    const subtitleSize = Math.max(12, Math.min(20, width * 0.016));
    textSize(subtitleSize);
    fill(200);
    subtitleTextY = titleTextY + spacing;
    text(subtitleText, width/2, subtitleTextY);
    avgTimeY = subtitleTextY + spacing;
    text(avgTimeText, width/2, avgTimeY);
    pop();
    
    // Calculate responsive grid layout
    const availableWidth = width * 0.9; // Use 90% of canvas width with margins
    const maxMiniSize = 120;
    const minMiniSize = 80;
    const gap = Math.max(10, width * 0.015); // Responsive gap (1.5% of width, min 10px)
    
    // Calculate optimal boards per row based on available width
    let boardsPerRow = Math.min(4, Math.ceil(Math.sqrt(totalCount)));
    let miniSize = maxMiniSize;
    
    // Adjust layout for smaller screens
    while (boardsPerRow > 1) {
        const testWidth = boardsPerRow * miniSize + (boardsPerRow - 1) * gap;
        if (testWidth <= availableWidth) {
            break; // Current layout fits
        }
        
        // Try smaller miniSize first
        if (miniSize > minMiniSize) {
            miniSize = Math.max(minMiniSize, miniSize - 10);
        } else {
            // If miniSize is at minimum, reduce boards per row
            boardsPerRow--;
            miniSize = maxMiniSize; // Reset size for fewer columns
        }
    }
    
    // Ensure at least 1 board per row with minimum size
    if (boardsPerRow < 1) {
        boardsPerRow = 1;
        miniSize = Math.min(maxMiniSize, availableWidth);
    }
    
    const rows = Math.ceil(totalCount / boardsPerRow);
    const gridWidth = boardsPerRow * miniSize + (boardsPerRow - 1) * gap;
    const gridStartX = (width - gridWidth) / 2;
    const gridStartY = avgTimeY + spacing + 10;
    
    // Draw mini boards (always use current game format)
    for (let i = 0; i < boardResultsToShow.length; i++) {
        const row = Math.floor(i / boardsPerRow);
        const col = i % boardsPerRow;
        const x = gridStartX + col * (miniSize + gap);
        const y = gridStartY + row * (miniSize + 60) + row * gap;
        
        // Always use the current format mini board drawing
        drawMiniBoard(x, y, miniSize, i, boardResultsToShow[i]);
    }
}


function drawMiniBoard(x, y, size, boardIndex, result) {
    push();
    
    // Border color based on correctness
    const borderColor = result.isCorrect ? color(76, 175, 80) : color(244, 67, 54); // Green or red
    
    // Draw border
    stroke(borderColor);
    strokeWeight(3);
    fill(218, 165, 32); // Goldenrod background
    rect(x, y, size, size, 5);
    
    // Get board data and convert to same format as normal gameplay
    const boardId = result.boardId;
    const currentBoards = getCurrentBoards();
    
    if (currentBoards[boardId]) {
        // Apply transformations if available to show the same board the player saw
        let boardString = currentBoards[boardId];
        if (result.transforms) {
            boardString = applyBoardTransformations(boardString, result.transforms);
        }
        
        const displayBoard = getBoard(boardString);
        
        // Calculate mini cell size to fit board in available space
        const padding = 10;
        const availableSize = size - 2 * padding;
        const miniD = Math.min(availableSize / displayBoard.width, availableSize / displayBoard.height);
        
        // Use same ratio as normal gameplay: D = 2*R, stone = R - halfStrokeWeight
        // So miniD = 2*miniR, stone = miniR - miniHalfStroke
        const miniR = miniD / 2;
        const miniHalfStroke = Math.max(1, miniR / 35); // Scale down halfStrokeWeight proportionally
        const miniStoneSize = miniR - miniHalfStroke;
        
        // Center the board in the mini container
        const boardPixelWidth = (displayBoard.width - 1) * miniD;
        const boardPixelHeight = (displayBoard.height - 1) * miniD;
        const boardStartX = x + (size - boardPixelWidth) / 2;
        const boardStartY = y + (size - boardPixelHeight) / 2;
        
        // Use the reusable board drawing function
        drawGoBoard(displayBoard, boardStartX, boardStartY, miniD, miniStoneSize, 0.5, true);
    }
    
    pop();
    
    // Board info text below
    push();
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(12);
    textFont('Arial');
    
    // Board number
    text(`Board #${boardId}`, x + size/2, y + size + 15);
    
    // Correctness indicator
    const statusText = result.isCorrect ? '✓ Correct' : '✗ Wrong';
    fill(result.isCorrect ? color(76, 175, 80) : color(244, 67, 54));
    text(statusText, x + size/2, y + size + 30);
    
    // Time taken (if available)
    if (result.timeTaken !== undefined && result.timeTaken !== null) {
        fill(200);
        textSize(11);
        text(`${result.timeTaken.toFixed(1)}s`, x + size/2, y + size + 45);
    }
    
    pop();
}


function drawBoardReview() {
    // Use the filtered results stored during click handling, or fall back to current game filtering
    const boardResultsToUse = window.currentDisplayBoardResults || currentGameBoardResults.filter(result => result.gameInstanceId === currentGameInstanceId);
    const result = boardResultsToUse[reviewingBoardIndex];
    if (!result) return;
    
    // Temporarily set the global board variable to display this board
    const boardId = result.boardId;
    const currentBoards = getCurrentBoards();
    
    if (currentBoards[boardId]) {
        // Apply transformations if available to show the same board the player saw
        let boardString = currentBoards[boardId];
        if (result.transforms) {
            boardString = applyBoardTransformations(boardString, result.transforms);
            
            // Log board transformations in detailed summary view (only once per board)
            const boardKey = `${boardId}-${reviewingBoardIndex}`;
            if (lastLoggedDetailedBoard !== boardKey) {
                lastLoggedDetailedBoard = boardKey;
                const t = result.transforms;
                console.log(`🔄 DETAILED SUMMARY TRANSFORMATIONS (Board #${boardId}, Review ${reviewingBoardIndex + 1}):`);
                console.log(`   flipX: ${t.flipX} (${t.flipX ? 'horizontally flipped' : 'not flipped horizontally'})`);
                console.log(`   flipY: ${t.flipY} (${t.flipY ? 'vertically flipped' : 'not flipped vertically'})`);
                console.log(`   transpose: ${t.transpose} (${t.transpose ? 'rotated 90°' : 'not rotated'})`);
                console.log(`   invert: ${t.invert} (${t.invert ? 'colors inverted' : 'colors normal'})`);
                testBoard(boardId, t.flipX, t.flipY, t.transpose, t.invert)
            }
        }

        // Parse board using exact same logic as loadMultiplayerBoard
        board = getBoard(boardString)
        
        clear();
        
        // Title and correct answer (positioned above the normal board area)
        push();
        
        const statusColor = result.isCorrect ? color(76, 175, 80) : color(244, 67, 54);
        
        // Main title in black
        textAlign(CENTER, CENTER);
        textSize(R * 0.9); // Same proportional sizing as hard mode buttons (R * 1.2 * 0.6)
        textFont('Arial');
        textStyle(BOLD);
        fill(255);
        titleY = D;
        text(`Board #${boardId}`, width/2, titleY);
        
        // Show answer details - larger, bold, and positioned between title and board
        textSize(R * 0.72); // Same proportional sizing as hard mode buttons (R * 1.2 * 0.6)
        textAlign(CENTER, CENTER);
        textStyle(BOLD);
        fill(255);

        
        let formattedCorrect = "";
        let formattedPlayer = "";
        if (result.mode === 'hard') {
            // Format correct answer in B+X or W+X format
            const correctFormatted = result.winningColor === 'black' ? `B+${Math.abs(result.difference)}` : `W+${Math.abs(result.difference)}`;
            formattedCorrect = formatAnswerWithEmojis(correctFormatted);
            formattedPlayer = formatAnswerWithEmojis(result.playerAnswer);
        } else {
            formattedCorrect = formatAnswerWithEmojis(result.correctAnswer);
            formattedPlayer = formatAnswerWithEmojis(result.playerAnswer);
        }
        const answerX = 0.5 * width;
        const answerY = titleY + 0.25 * R;
        text(`Correct answer: ${formattedCorrect}`, answerX, answerY + R);
        text(`   Your answer: ${formattedPlayer}`, answerX, answerY + 2*R);
        pop();

        // Draw board using exact same logic as normal gameplay
        const boardX = D;
        const boardY = answerY + 4*R;
        const cellSpacing = D;
        drawGoBoard(board, boardX, boardY, cellSpacing, R - halfStrokeWeight, 2*halfStrokeWeight, false);

        // Display territory information below the board for hard mode only
        if (result.blackScore !== undefined && result.whiteScore !== undefined) {
            push();
            fill(255); // White text
            textAlign(CENTER, CENTER);
            textSize(R * 0.9);
            textStyle(BOLD);
            textFont('Arial');
            const territoryX = 0.5 * width;
            const territoryY = boardY + cellSpacing*8.5 + R;
            
            // Print territory
            text(`⚫ ${result.blackScore}   ⚪ ${result.whiteScore}`, territoryX, territoryY);
            pop();
        }
    }
}


function viewBoardFromSummary(boardIndex) {
    reviewingBoardIndex = boardIndex;
    // Resize canvas to normal size for board review
    windowResized();
    // Use centered layout for individual board review (no scrolling)
    document.body.style.alignItems = 'center';
    document.body.style.paddingTop = '';
    document.body.style.height = '100%';
    document.body.style.minHeight = '';
    document.body.style.overflowY = '';
    document.body.style.webkitOverflowScrolling = '';
    // Update button visibility for board review
    updateSummaryButtons();
    console.log(`👁️ Viewing board ${boardIndex} from summary`);
}


function backToSummary() {
    reviewingBoardIndex = -1;
    // Resize canvas back to extended size for summary grid
    windowResized();
    // Restore scrollable layout for summary grid
    document.body.style.alignItems = 'flex-start';
    document.body.style.paddingTop = '80px';
    document.body.style.height = 'auto';
    document.body.style.minHeight = '100vh';
    document.body.style.overflowY = 'auto';
    document.body.style.webkitOverflowScrolling = 'touch';
    // Update button visibility
    updateSummaryButtons();
    console.log('🔙 Returning to summary view');
}


function backToLobbyFromSummary() {
    if (viewingHistoricalGame) {
        // Historical game - return to lobby
        exitHistoricalSummary();
    } else {
        // Current game summary - return to lobby
        returnToLobby();
    }
}


function updateSummaryButtons() {
    const backToSummaryButton = document.getElementById('back-to-summary-button');
    const backToLobbyButton = document.getElementById('back-to-lobby-button');
    const prevBoardButton = document.getElementById('prev-board-button');
    const nextBoardButton = document.getElementById('next-board-button');
    
    // If essential elements don't exist yet, try again after DOM is ready
    if (!backToLobbyButton) {
        setTimeout(updateSummaryButtons, 100);
        return;
    }
    
    // Always show appropriate back button when in summary phase, regardless of other conditions
    if (gameState.phase === 'summary') {
        if (reviewingBoardIndex !== -1) {
            // Viewing individual board - ALWAYS show "Back to Summary" and navigation buttons
            if (backToSummaryButton) backToSummaryButton.style.display = 'block';
            backToLobbyButton.style.display = 'none';
            
            // Show navigation buttons for detailed summary view (if they exist)
            if (prevBoardButton) prevBoardButton.style.display = 'block';
            if (nextBoardButton) nextBoardButton.style.display = 'block';
            
            // Update button states based on current position
            updateNavigationButtonStates();
        } else {
            // Viewing summary grid - ALWAYS show "Back to Lobby", hide other buttons
            if (backToSummaryButton) backToSummaryButton.style.display = 'none';
            backToLobbyButton.style.display = 'block';
            if (prevBoardButton) prevBoardButton.style.display = 'none';
            if (nextBoardButton) nextBoardButton.style.display = 'none';
        }
    } else {
        // Not in summary mode - hide all summary buttons
        if (backToSummaryButton) backToSummaryButton.style.display = 'none';
        backToLobbyButton.style.display = 'none';
        if (prevBoardButton) prevBoardButton.style.display = 'none';
        if (nextBoardButton) nextBoardButton.style.display = 'none';
    }
}


function updateNavigationButtonStates() {
    const prevBoardButton = document.getElementById('prev-board-button');
    const nextBoardButton = document.getElementById('next-board-button');
    
    if (!prevBoardButton || !nextBoardButton) return;
    
    // Get the current board results for navigation
    const boardResultsToShow = window.currentDisplayBoardResults || 
                               currentGameBoardResults.filter(result => result.gameInstanceId === currentGameInstanceId);
    
    const maxIndex = boardResultsToShow.length - 1;
    
    // Update button states
    prevBoardButton.disabled = reviewingBoardIndex <= 0;
    nextBoardButton.disabled = reviewingBoardIndex >= maxIndex;
    
    // Update button opacity based on state
    prevBoardButton.style.opacity = prevBoardButton.disabled ? '0.5' : '1';
    nextBoardButton.style.opacity = nextBoardButton.disabled ? '0.5' : '1';
}


function navigateToPreviousBoard() {
    if (gameState.phase !== 'summary' || reviewingBoardIndex <= 0) return;
    
    reviewingBoardIndex--;
    updateNavigationButtonStates();
    console.log(`Navigated to previous board: ${reviewingBoardIndex}`);
}


function navigateToNextBoard() {
    if (gameState.phase !== 'summary') return;
    
    const boardResultsToShow = window.currentDisplayBoardResults || 
                               currentGameBoardResults.filter(result => result.gameInstanceId === currentGameInstanceId);
    const maxIndex = boardResultsToShow.length - 1;
    
    if (reviewingBoardIndex >= maxIndex) return;
    
    reviewingBoardIndex++;
    updateNavigationButtonStates();
    console.log(`Navigated to next board: ${reviewingBoardIndex}`);
}


function drawGoBoard(boardData, startX, startY, cellSpacing, stoneRadius, strokeWeightValue = 1, showWhiteOutlines = true) {
    if (!boardData || !boardData.width || !boardData.height) return;
    
    push();
    
    // Draw grid lines
    stroke(0);
    strokeWeight(strokeWeightValue);
    translate(startX, startY);
    
    for (let x = 0; x < boardData.width; x++) {
        line(x * cellSpacing, 0, x * cellSpacing, (boardData.height - 1) * cellSpacing);
    }
    
    for (let y = 0; y < boardData.height; y++) {
        line(0, y * cellSpacing, (boardData.width - 1) * cellSpacing, y * cellSpacing);
    }
    
    // Draw stones (exactly matching hard mode button style)
    for (let x = 0; x < boardData.width; x++) {
        for (let y = 0; y < boardData.height; y++) {
            // Draw tengen
            if (x == 4 && y == 4) {
                // Black stone - exactly match hard mode button style
                fill(0); // Pure black like board stones
                stroke(0); // Black stroke like hard mode buttons
                strokeWeight(strokeWeightValue);
                circle(x * cellSpacing, y * cellSpacing, 0.15*stoneRadius);
            }

            // Draw board data
            if (boardData[x] && boardData[x][y] !== 0) {
                if (boardData[x][y] === window.BLACK) {
                    // Black stone - exactly match hard mode button style
                    fill(0); // Pure black like board stones
                    stroke(0); // Black stroke like hard mode buttons
                    strokeWeight(strokeWeightValue);
                } else {
                    // White stone - exactly match hard mode button style  
                    fill(255); // Pure white like board stones
                    stroke(0); // Black stroke like hard mode buttons
                    strokeWeight(strokeWeightValue);
                }
                // Use same circle sizing as hard mode buttons: stoneRadius - strokeWeight/2
                circle(x * cellSpacing, y * cellSpacing, stoneRadius - strokeWeightValue/2);
            }
        }
    }
    
    pop();
}


function exitHistoricalSummary() {
    console.log('Exiting historical summary');
    
    // Reset historical viewing state
    viewingHistoricalGame = null;
    reviewingBoardIndex = -1;
    currentGameBoardResults = [];
    currentGameInstanceId = null;
    viewingSummary = false;
    
    // Use the standard return to lobby function
    returnToLobby();
}


function handleSummaryGridClick() {
    console.log('🖱️ handleSummaryGridClick called with mouseX:', mouseX, 'mouseY:', mouseY);
    
    // Use the same filtering as drawSummaryScreen
    const filteredBoardResults = currentGameBoardResults.filter(result => result.gameInstanceId === currentGameInstanceId);
    const totalCount = filteredBoardResults.length;
    console.log('📊 Filtered board results count:', totalCount, 'for game instance:', currentGameInstanceId);
    
    // Calculate grid layout (same as in drawSummaryScreen)
    const boardsPerRow = Math.min(4, Math.ceil(Math.sqrt(totalCount)));
    const rows = Math.ceil(totalCount / boardsPerRow);
    const miniSize = 120;
    const gap = 20;
    const gridWidth = boardsPerRow * miniSize + (boardsPerRow - 1) * gap;
    const startX = (width - gridWidth) / 2;
    const startY = 120;
    console.log('📐 Grid layout: startX:', startX, 'startY:', startY, 'miniSize:', miniSize, 'boardsPerRow:', boardsPerRow);
    
    // Check clicks on mini boards
    for (let i = 0; i < filteredBoardResults.length; i++) {
        const row = Math.floor(i / boardsPerRow);
        const col = i % boardsPerRow;
        const x = startX + col * (miniSize + gap);
        const y = startY + row * (miniSize + 60) + row * gap;
        
        // Check if click is within this mini board (including text area)
        if (mouseX >= x && mouseX <= x + miniSize &&
            mouseY >= y && mouseY <= y + miniSize + 70) {
            // Store the filtered results for board review and use the filtered index
            window.currentDisplayBoardResults = filteredBoardResults;
            viewBoardFromSummary(i);
            console.log(`🖱️ Clicked on mini board ${i} (Board #${filteredBoardResults[i].boardId}) from game instance ${filteredBoardResults[i].gameInstanceId}`);
            return;
        }
    }
}


function handleHistoricalSummaryGridClick() {
    if (!viewingHistoricalGame || !currentHistoricalBoardResults.length) return;
    
    const totalCount = currentHistoricalBoardResults.length;
    
    // Calculate grid layout using current game format (matching unified summary screen)
    const boardsPerRow = Math.min(4, Math.ceil(Math.sqrt(totalCount)));
    const rows = Math.ceil(totalCount / boardsPerRow);
    const miniSize = 120;
    const gap = 20;
    const gridWidth = boardsPerRow * miniSize + (boardsPerRow - 1) * gap;
    const gridStartX = (width - gridWidth) / 2;
    const gridStartY = 120;
    
    // Check clicks on mini boards
    for (let i = 0; i < currentHistoricalBoardResults.length; i++) {
        const row = Math.floor(i / boardsPerRow);
        const col = i % boardsPerRow;
        const x = gridStartX + col * (miniSize + gap);
        const y = gridStartY + row * (miniSize + 60) + row * gap;
        
        // Check if click is within this mini board (including text area)
        if (mouseX >= x && mouseX <= x + miniSize &&
            mouseY >= y && mouseY <= y + miniSize + 70) {
            viewBoardFromSummary(i); // Reuse the same function
            console.log(`🖱️ Clicked on historical mini board ${i} (Board #${currentHistoricalBoardResults[i].boardId})`);
            return;
        }
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


function createNewRoom(playerName, timePerBoard, creatorUUID) {
    console.log('🎯 Creating room with default settings');
    
    // Use default settings - can be adjusted in room lobby
    socket.emit('create-room', {
        playerUUID: creatorUUID, // Include UUID for host persistence
        settings: {
            timePerBoard: timePerBoard, // Default 60 seconds per board
            totalBoards: 10, // Default 10 boards
            progressiveDifficulty: true,
            hardMode: false // Default normal mode
        }
    }, (response) => {
        if (response.success) {
            gameState.roomId = response.roomId;
            gameState.isCreator = true;
            
            // Save room ID to localStorage
            saveToStorage(STORAGE_KEYS.ROOM_ID, response.roomId);
            console.log('Saved room ID to localStorage:', response.roomId);
            
            // Update browser URL to match room join link
            updateBrowserURL(response.roomId);
            
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
    
    // Sync local game variables with room settings on join
    if (response.gameState.settings) {
        currentTimePerBoard = response.gameState.settings.timePerBoard;
        currentTotalBoards = response.gameState.settings.totalBoards;
        console.log('🔄 Synced local variables with room settings on join:', {
            currentTimePerBoard,
            currentTotalBoards
        });
    }
    
    // Save room ID to localStorage
    saveToStorage(STORAGE_KEYS.ROOM_ID, response.gameState.roomId);
    console.log('Saved room ID to localStorage:', response.gameState.roomId);
    
    // Update browser URL to match room join link
    updateBrowserURL(response.gameState.roomId);
    
    showRoomLobby();
}


function updateRoomTimeFromInput() {
    if (!gameState.isCreator) {
        console.log('❌ Only room creator can update settings');
        return;
    }
    
    const timeInput = document.getElementById('room-time-input');
    if (!timeInput) {
        console.log('❌ Time input not found');
        return;
    }
    
    const newTime = parseInt(timeInput.value);
    console.log('⏰ Timer input changed to:', newTime, 'from', gameState.settings.timePerBoard);
    
    if (isNaN(newTime) || newTime < 1 || newTime > 600) {
        console.log('⚠️ Invalid time value, reverting to previous');
        timeInput.value = gameState.settings.timePerBoard;
        return;
    }
    
    if (newTime !== gameState.settings.timePerBoard) {
        // Clear existing debounce timer
        if (roomSettingsTimeDebounceTimer) {
            clearTimeout(roomSettingsTimeDebounceTimer);
        }
        
        // Debounce the update to prevent rapid server calls
        roomSettingsTimeDebounceTimer = setTimeout(() => {
            updateRoomSettings({ timePerBoard: newTime });
            roomSettingsTimeDebounceTimer = null;
        }, 500); // Wait 500ms after user stops typing
    }
}


function updateRoomBoardsFromInput() {
    if (!gameState.isCreator) {
        console.log('❌ Only room creator can update settings');
        return;
    }
    
    const boardsInput = document.getElementById('room-boards-input');
    if (!boardsInput) {
        console.log('❌ Boards input not found');
        return;
    }
    
    const newBoards = parseInt(boardsInput.value);
    console.log('🎯 Boards input changed to:', newBoards, 'from', gameState.settings.totalBoards);
    
    if (isNaN(newBoards) || newBoards < 1 || newBoards > 50) {
        console.log('⚠️ Invalid boards value, reverting to previous');
        boardsInput.value = gameState.settings.totalBoards;
        return;
    }
    
    if (newBoards !== gameState.settings.totalBoards) {
        // Clear existing debounce timer
        if (roomSettingsBoardsDebounceTimer) {
            clearTimeout(roomSettingsBoardsDebounceTimer);
        }
        
        // Debounce the update to prevent rapid server calls
        roomSettingsBoardsDebounceTimer = setTimeout(() => {
            updateRoomSettings({ totalBoards: newBoards });
            roomSettingsBoardsDebounceTimer = null;
        }, 500); // Wait 500ms after user stops typing
    }
}


function toggleRoomHardMode() {
    if (!gameState.isCreator) {
        console.log('❌ Only room creator can update settings');
        return;
    }
    
    if (!gameState.settings) {
        console.log('❌ No room settings available');
        return;
    }
    
    const newHardMode = !gameState.settings.hardMode;
    updateRoomSettings({ hardMode: newHardMode });
}

function toggleRoomScoringMode() {
    if (!gameState.isCreator) {
        console.log('❌ Only room creator can update settings');
        return;
    }
    
    if (!gameState.settings) {
        console.log('❌ No room settings available');
        return;
    }
    
    const newScoringMode = gameState.settings.scoringMode === 'territory' ? 'area' : 'territory';
    console.log('🎯 Toggling scoring mode from', gameState.settings.scoringMode, 'to', newScoringMode);
    updateRoomSettings({ scoringMode: newScoringMode });
}


function updateRoomSettings(partialSettings) {
    const currentSettings = gameState.settings;
    const settings = {
        timePerBoard: currentSettings.timePerBoard,
        totalBoards: currentSettings.totalBoards,
        progressiveDifficulty: currentSettings.progressiveDifficulty || true,
        hardMode: currentSettings.hardMode || false,
        ...partialSettings
    };
    
    console.log('🔄 Updating room settings:', partialSettings);
    
    socket.emit('update-room-settings', { settings: settings }, (response) => {
        if (response.success) {
            console.log('✅ Room settings updated successfully:', response.settings);
        } else {
            console.error('❌ Failed to update room settings:', response.error);
            alert('Failed to update room settings: ' + response.error);
        }
    });
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


function showBoardNumberIndicator() {
    const indicator = document.getElementById('board-number-indicator');
    if (indicator) {
        indicator.style.display = 'block';
    }
}


function hideBoardNumberIndicator() {
    const indicator = document.getElementById('board-number-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}


function updateBoardNumberIndicator() {
    const valueElement = document.getElementById('board-number-value');
    if (valueElement && gameState.boardSequence && gameState.currentBoard < gameState.boardSequence.length) {
        // Show the actual board ID from the sequence
        const actualBoardId = gameState.boardSequence[gameState.currentBoard];
        valueElement.textContent = actualBoardId;
    }
}


function showScoringModeIndicator() {
    const indicator = document.getElementById('scoring-mode-indicator');
    if (indicator) {
        indicator.style.display = 'block';
    }
}


function hideScoringModeIndicator() {
    const indicator = document.getElementById('scoring-mode-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}


function updateScoringModeIndicator() {
    const valueElement = document.getElementById('scoring-mode-value');
    if (valueElement && gameState.settings) {
        const scoringMode = gameState.settings.scoringMode || 'territory';
        const displayMode = scoringMode === 'area' ? 'Area' : 'Territory';
        valueElement.textContent = displayMode;
        
        // Update color based on mode (same as lobby UI)
        const indicator = document.getElementById('scoring-mode-indicator');
        if (indicator) {
            const color = scoringMode === 'area' ? '#FF9500' : '#2196F3';
            valueElement.style.color = color;
        }
    }
}


function drawNormalModeUI() {
    // Responsive sizing factor for all buttons in normal mode
    const screenSizeFactor = Math.min(window.innerWidth, window.innerHeight) < 768 ? 1.0 : 1.2;
    
    // Update bounce animations
    blackStoneBounce *= bounceDecay;
    whiteStoneBounce *= bounceDecay;
    
    // Update success animation
    if (successAnimationIntensity > 0) {
        successAnimationIntensity *= successAnimationDecay;
        if (successAnimationIntensity < 0.01) {
            successAnimationIntensity = 0; // Clean cutoff
        }
    }
    
    // Update error shake animation (same as hard mode)
    if (errorShakeIntensity > 0) {
        errorShakeTime++;
        if (errorShakeTime >= errorShakeDuration) {
            errorShakeIntensity = 0; // End shake
            errorShakeTime = 0;
        } else {
            errorShakeIntensity *= errorShakeDecay; // Fade shake over time
        }
    }
    
    // Stone button properties (same as hard mode)
    // Calculate responsive scaling factor based on screen size and aspect ratio
    const screenArea = width * height;
    const baseArea = 800 * 600; // Base reference size
    const aspectRatio = height / width;
    
    // Base scaling from screen area
    let scaleFactor = Math.sqrt(screenArea / baseArea);
    
    // Additional scaling for portrait orientation (more vertical space)
    if (aspectRatio > 1.2) { // Portrait mode with significant vertical space
        const portraitBonus = Math.min(0.3, (aspectRatio - 1.2) * 0.5); // Reduced for normal mode
        scaleFactor += portraitBonus;
    }
    
    // Clamp the scale factor to prevent buttons from becoming too large
    scaleFactor = Math.min(1.4, Math.max(1, scaleFactor));
    const stoneRadius = R * 1.25 * scaleFactor; // Responsive sizing
    const buttonStrokeWeight = halfStrokeWeight * 2;
    
    // Black stone button (left position)
    // Calculate shake offset for error animation (only for incorrect stone)
    let blackShakeOffsetX = 0;
    let blackShakeOffsetY = 0;
    let showBlackAsError = false;
    
    if (errorShakeIntensity > 0 && correctColor !== 'black') {
        // Only shake if this is NOT the correct answer
        blackShakeOffsetX = (Math.random() - 0.5) * errorShakeIntensity * 8;
        blackShakeOffsetY = (Math.random() - 0.5) * errorShakeIntensity * 8;
        showBlackAsError = true;
    }
    
    push();
    translate(bx + blackShakeOffsetX, by + blackShakeOffsetY);
    
    // Calculate bounce scale for black stone
    const blackScale = 1 + blackStoneBounce * bounceStrength;
    
    // Handle hover effect
    if (dist(mouseX, mouseY, bx, by) < stoneRadius) {
        if (mouseIsPressed) {
            scale(blackScale * 1.1); // Bigger when pressed
        } else {
            scale(blackScale * 1.05); // Slightly bigger on hover
        }
    } else {
        scale(blackScale);
    }
    
    // Handle dev mode highlighting and error state
    let strokeColor = 0;
    let strokeWeight_val = buttonStrokeWeight;
    
    if (showBlackAsError) {
        // Error state - red stone during shake animation
        fill('#FF4444');
        stroke('#CC0000');
        strokeWeight(buttonStrokeWeight * 2);
        circle(0, 0, stoneRadius - buttonStrokeWeight/2);
    } else {
        // Normal black stone
        fill(0); // Pure black like board stones
        if (IS_DEV_MODE && correctColor === 'black') {
            strokeColor = '#00FF00'; // Green highlight for correct answer
            strokeWeight_val = buttonStrokeWeight * 2;
        }
        stroke(strokeColor);
        strokeWeight(strokeWeight_val);
        circle(0, 0, stoneRadius - buttonStrokeWeight/2);
    }
    
    // Draw success animation glow effect for black stone
    if (successAnimationIntensity > 0 && correctColor === 'black') {
        push();
        noFill();
        stroke(76, 175, 80, successAnimationIntensity * 255); // Green glow
        strokeWeight(buttonStrokeWeight * 3 * successAnimationIntensity);
        circle(0, 0, stoneRadius + buttonStrokeWeight);
        pop();
    }
    
    pop();
    
    // White stone button (right position)
    // Calculate shake offset for error animation (only for incorrect stone)
    let whiteShakeOffsetX = 0;
    let whiteShakeOffsetY = 0;
    let showWhiteAsError = false;
    
    if (errorShakeIntensity > 0 && correctColor !== 'white') {
        // Only shake if this is NOT the correct answer
        whiteShakeOffsetX = (Math.random() - 0.5) * errorShakeIntensity * 8;
        whiteShakeOffsetY = (Math.random() - 0.5) * errorShakeIntensity * 8;
        showWhiteAsError = true;
    }
    
    push();
    translate(wx + whiteShakeOffsetX, wy + whiteShakeOffsetY);
    
    // Calculate bounce scale for white stone
    const whiteScale = 1 + whiteStoneBounce * bounceStrength;
    
    // Handle hover effect
    if (dist(mouseX, mouseY, wx, wy) < stoneRadius) {
        if (mouseIsPressed) {
            scale(whiteScale * 1.1); // Bigger when pressed
        } else {
            scale(whiteScale * 1.05); // Slightly bigger on hover
        }
    } else {
        scale(whiteScale);
    }
    
    // Handle dev mode highlighting and error state
    strokeColor = 0;
    strokeWeight_val = buttonStrokeWeight;
    
    if (showWhiteAsError) {
        // Error state - red stone during shake animation
        fill('#FF4444');
        stroke('#CC0000');
        strokeWeight(buttonStrokeWeight * 2);
        circle(0, 0, stoneRadius - buttonStrokeWeight/2);
    } else {
        // Normal white stone
        fill(255); // Pure white like board stones
        if (IS_DEV_MODE && correctColor === 'white') {
            strokeColor = '#00FF00'; // Green highlight for correct answer
            strokeWeight_val = buttonStrokeWeight * 2;
        }
        stroke(strokeColor);
        strokeWeight(strokeWeight_val);
        circle(0, 0, stoneRadius - buttonStrokeWeight/2);
    }
    
    // Draw success animation glow effect for white stone
    if (successAnimationIntensity > 0 && correctColor === 'white') {
        push();
        noFill();
        stroke(76, 175, 80, successAnimationIntensity * 255); // Green glow
        strokeWeight(buttonStrokeWeight * 3 * successAnimationIntensity);
        circle(0, 0, stoneRadius + buttonStrokeWeight);
        pop();
    }
    
    pop();
    
    // Store stone positions for click detection (using scaled radius)
    normalModeBlackStone = { x: bx, y: by, radius: stoneRadius };
    normalModeWhiteStone = { x: wx, y: wy, radius: stoneRadius };
}


function drawHardModeUI() {
    // Responsive sizing factor for all buttons in hard mode
    const screenSizeFactor = Math.min(window.innerWidth, window.innerHeight) < 768 ? 1.0 : 1.2;
    
    // Update bounce animations
    stoneButtonBounce *= bounceDecay;
    for (let i = 0; i < scoreButtonBounces.length; i++) {
        scoreButtonBounces[i] *= bounceDecay;
    }
    
    // Update success animation
    if (successAnimationIntensity > 0) {
        successAnimationIntensity *= successAnimationDecay;
        if (successAnimationIntensity < 0.01) {
            successAnimationIntensity = 0; // Clean cutoff
        }
    }
    
    // Update error shake animation
    if (errorShakeIntensity > 0) {
        errorShakeTime++;
        if (errorShakeTime >= errorShakeDuration) {
            errorShakeIntensity = 0; // End shake
            errorShakeTime = 0;
        } else {
            errorShakeIntensity *= errorShakeDecay; // Fade shake over time
        }
    }
    
    // Single stone toggle button (left side, higher position to avoid clipping)
    // Use board stone proportions: R is the board stone radius
    // Calculate responsive scaling factor based on screen size and aspect ratio
    const screenArea = width * height;
    const baseArea = 800 * 600; // Base reference size
    const aspectRatio = height / width;
    
    // Base scaling from screen area
    let scaleFactor = Math.sqrt(screenArea / baseArea);
    
    // Minimal scaling for portrait orientation (hard mode needs smaller buttons)
    if (aspectRatio > 1.2) { // Portrait mode with significant vertical space
        const portraitBonus = Math.min(0.15, (aspectRatio - 1.2) * 0.3); // Much smaller for hard mode
        scaleFactor += portraitBonus;
    }
    
    // Clamp the scale factor - much smaller maximum for hard mode buttons
    scaleFactor = Math.min(1.15, Math.max(1, scaleFactor));
    const stoneRadius = R * 1.25 * scaleFactor; // Responsive sizing
    const stoneX = width * 0.15;
    const stoneY = height - 3*R; // Use fixed positioning like normal mode
    
    // Calculate bounce scale for stone button
    const stoneScale = 1 + stoneButtonBounce * bounceStrength;
    
    // Check if this stone color is correct
    const isStoneColorCorrect = window.currentTerritoryScore && 
                               ((selectedColorValue === 1 && window.currentTerritoryScore.winningColor === 'black') ||
                                (selectedColorValue === -1 && window.currentTerritoryScore.winningColor === 'white'));
    
    // Calculate shake offset for error animation (only for incorrect stone color)
    let stoneShakeOffsetX = 0;
    let stoneShakeOffsetY = 0;
    let showStoneAsError = false;
    
    if (errorShakeIntensity > 0 && !isStoneColorCorrect) {
        // Only shake if this is NOT the correct color
        stoneShakeOffsetX = (Math.random() - 0.5) * errorShakeIntensity * 8;
        stoneShakeOffsetY = (Math.random() - 0.5) * errorShakeIntensity * 8;
        showStoneAsError = true;
    }
    
    // Draw toggle stone button (changes between black and white) with shake offset
    push();
    translate(stoneX + stoneShakeOffsetX, stoneY + stoneShakeOffsetY);
    
    // Handle hover effect for stone button
    if (dist(mouseX, mouseY, stoneX, stoneY) < stoneRadius) {
        if (mouseIsPressed) {
            scale(stoneScale * 1.1); // Bigger when pressed
        } else {
            scale(stoneScale * 1.05); // Slightly bigger on hover
        }
    } else {
        scale(stoneScale);
    }
    
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
    
    if (showStoneAsError) {
        // Error state - red stone during shake animation (only for incorrect color)
        fill('#FF4444');
        stroke('#CC0000');
        strokeWeight(buttonStrokeWeight * 2);
        circle(0, 0, stoneRadius - buttonStrokeWeight/2);
    } else if (selectedColorValue === 1) {
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
    
    // Draw success animation glow effect for hard mode stone button
    if (successAnimationIntensity > 0 && isStoneColorCorrect) {
        push();
        noFill();
        stroke(76, 175, 80, successAnimationIntensity * 255); // Green glow
        strokeWeight(buttonStrokeWeight * 3 * successAnimationIntensity);
        circle(0, 0, stoneRadius + buttonStrokeWeight);
        pop();
    }
    
    pop();
    
    // Score difference buttons (arranged in a horizontal row)
    if (scoreChoices.length === 4) {
        // Use similar proportions to board stones for consistency
        // Apply same responsive scaling as stone buttons
        const buttonRadius = R * 1.2 * scaleFactor; // Responsive sizing
        // Adjust total width based on button size to prevent overlap
        const baseWidth = width * 0.5;
        const minButtonSpacing = buttonRadius * 2.5; // Ensure minimum spacing
        const calculatedWidth = Math.max(baseWidth, minButtonSpacing * 3); // 3 gaps between 4 buttons
        const totalWidth = Math.min(calculatedWidth, width * 0.7); // Don't exceed 70% of screen
        const buttonY = stoneY; // Same height as stone button
        const spacing = totalWidth / 3; // Space between centers of 4 buttons
        const startX = width * 0.60 - totalWidth / 2; // Center the group of buttons
        
        for (let i = 0; i < 4; i++) {
            const buttonX = startX + (i * spacing);
            const score = scoreChoices[i];
            
            // Calculate bounce scale for this button
            const buttonScale = 1 + scoreButtonBounces[i] * bounceStrength;
            
            // Check if this is the correct score AND the correct color is selected
            // Use the active scoring mode to determine correct answer
            const usingAreaScoring = gameState.settings?.scoringMode === 'area';
            const activeScore = usingAreaScoring ? window.currentAreaScore : window.currentTerritoryScore;
            
            const hasCorrectColor = activeScore && 
                                  ((selectedColorValue === 1 && activeScore.winningColor === 'black') ||
                                   (selectedColorValue === -1 && activeScore.winningColor === 'white'));
            const isCorrectScore = hasCorrectColor && activeScore && 
                                 score === activeScore.scoreMagnitude;
            
            // Check if this button is currently selected
            const isSelected = selectedDifference === score;
            
            // Calculate shake offset for error animation (only for incorrect buttons)
            let shakeOffsetX = 0;
            let shakeOffsetY = 0;
            let showAsError = false;
            
            if (errorShakeIntensity > 0 && !isCorrectScore) {
                // Only shake if this is NOT the correct answer
                shakeOffsetX = (Math.random() - 0.5) * errorShakeIntensity * 10;
                shakeOffsetY = (Math.random() - 0.5) * errorShakeIntensity * 10;
                showAsError = true;
            }
            
            // Use board stone styling approach with shake offset
            push();
            translate(buttonX + shakeOffsetX, buttonY + shakeOffsetY);
            
            // Handle hover effect for score buttons
            if (dist(mouseX, mouseY, buttonX, buttonY) < buttonRadius) {
                if (mouseIsPressed) {
                    scale(buttonScale * 1.1); // Bigger when pressed
                } else {
                    scale(buttonScale * 1.05); // Slightly bigger on hover
                }
            } else {
                scale(buttonScale);
            }
            
            // Determine colors based on error state, correctness, and selection
            let fillColor, strokeColor, strokeWeight_val, textColor;
            
            if (showAsError) {
                // Error state - red buttons during shake animation (only for incorrect answers)
                fillColor = '#FF4444';
                strokeColor = '#CC0000';
                strokeWeight_val = buttonStrokeWeight * 1.5;
                textColor = '#FFFFFF';
            } else if (isCorrectScore && IS_DEV_MODE) {
                // Golden highlight for correct answer when correct color is selected (dev mode only)
                fillColor = '#FFD700';
                strokeColor = '#FF8C00'; // Darker gold for border
                strokeWeight_val = buttonStrokeWeight * 1.5;
                textColor = '#000000';
            } else if (isSelected) {
                // Selected state - use theme colors
                strokeWeight_val = buttonStrokeWeight * 1.5;
                if (selectedColorValue === 1) {
                    // Black stone theme - use consistent black
                    fillColor = 0; // Pure black like board stones
                    strokeColor = 0;
                    textColor = 255; // White text
                } else {
                    // White stone theme - pure white buttons to match white stones
                    fillColor = 255; // Pure white like board stones
                    strokeColor = '#000000';
                    textColor = 0; // Black text for better contrast on white
                }
            } else {
                // Match the current stone color theme
                if (selectedColorValue === 1) {
                    // Black stone theme - use consistent black
                    fillColor = 0; // Pure black like board stones
                    strokeColor = 0;
                    textColor = 255; // White text
                } else {
                    // White stone theme - pure white buttons to match white stones
                    fillColor = 255; // Pure white like board stones
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
            
            // Draw success animation glow effect for correct score button
            if (successAnimationIntensity > 0 && isCorrectScore) {
                push();
                noFill();
                stroke(76, 175, 80, successAnimationIntensity * 255); // Green glow
                strokeWeight(buttonStrokeWeight * 3 * successAnimationIntensity);
                circle(0, 0, buttonRadius + buttonStrokeWeight);
                pop();
            }
            
            pop();
            
            // Store button positions for click detection
            if (!window.hardModeButtons) window.hardModeButtons = [];
            window.hardModeButtons[i] = { x: buttonX, y: buttonY, radius: buttonRadius, score: score };
        }
    }
    
    // Store stone button position for click detection
    window.hardModeStone = { x: stoneX, y: stoneY, radius: stoneRadius };
}


function submitNormalModeAnswer(guess) {
    if (gameState.phase !== 'playing' || penaltyMode) return;

    const isCorrect = guess === correctColor;
    
    // Comprehensive logging for normal mode
    console.log('🎮 === NORMAL MODE ANSWER SUBMISSION ===');
    console.log('🎮 Player Answer:', guess);
    console.log('🎮 Scoring Mode:', gameState.settings?.scoringMode || 'territory (default)');
    if (window.currentTerritoryScore && window.currentAreaScore) {
        console.log('🎮 Territory Winner:', window.currentTerritoryScore.winningColor);
        console.log('🎮 Area Winner:', window.currentAreaScore.winningColor);
    }
    console.log('🎮 Correct Answer:', correctColor, 'using', gameState.settings?.scoringMode || 'territory', 'scoring');
    console.log('🎮 Result:', isCorrect ? '✅ CORRECT' : '❌ WRONG');
    
    // Track board result for summary screen
    if (gameState.boardSequence && gameState.currentBoard < gameState.boardSequence.length) {
        const boardId = gameState.boardSequence[gameState.currentBoard];
        const currentBoards = getCurrentBoards();
        const currentDeadStones = getCurrentDeadStones();
        
        // Calculate territory score for this board, accounting for transforms
        let territoryScore = null;
        try {
            // Apply transforms to get the board as the player saw it
            let boardString = currentBoards[boardId];
            let deadStonesString = currentDeadStones[boardId];
            
            if (currentBoardTransforms) {
                boardString = applyBoardTransformations(boardString, currentBoardTransforms);
                deadStonesString = applyBoardTransformations(deadStonesString, currentBoardTransforms);
            }
            
            territoryScore = calculateTerritoryScore(boardString, deadStonesString);
            
        } catch (error) {
            console.error('Error calculating territory score for tracking:', error);
        }
        
        // Calculate time taken for this board
        const timeTaken = boardStartTime ? (Date.now() - boardStartTime) / 1000 : null;
        
        const boardResult = {
            boardId: boardId,
            gameInstanceId: currentGameInstanceId,
            playerAnswer: guess,
            correctAnswer: correctColor,
            isCorrect: isCorrect,
            blackScore: territoryScore.blackTerritory,
            whiteScore: territoryScore.whiteTerritory,
            difference: territoryScore.difference,
            winningColor: territoryScore.winningColor,
            transforms: currentBoardTransforms,
            timeTaken: timeTaken
        };
        
        playerBoardResults.push(boardResult);
        currentGameBoardResults.push(boardResult);
        console.log('📝 Tracked board result:', boardResult);
    }
    
    socket.emit('submit-answer', { 
        answer: guess, 
        isCorrect: isCorrect,
        currentBoardIndex: gameState.currentBoard,
        transforms: currentBoardTransforms
    }, (response) => {
        if (response.success) {
            // Handle answer like in single player
            if (isCorrect) {
                // Trigger success animation
                successAnimationIntensity = 1.0;
                
                score++;
                //maxTime -= 1000; // Progressive difficulty
                gameState.currentBoard++;
                
                // Add a brief delay to show correct answer feedback before next board
                setTimeout(() => {
                    // Check if there are more boards to play
                    if (gameState.boardSequence && gameState.currentBoard < gameState.boardSequence.length) {
                        loadMultiplayerBoard(gameState.currentBoard);
                    } else {
                        // Game finished - player completed all boards
                        console.log('🎯 Player completed all boards! Current failed state:', failed, 'Current bgColor:', document.bgColor);
                        
                        // Set blue color when completing all boards individually (same as timeout)
                        failed = true;
                        document.bgColor = 'royalblue'; // Blue for individual completion
                        console.log('🏁 Player completed all boards individually - set background to royalblue');
                        
                        // Enter summary mode instead of finished mode
                        enterSummaryMode();
                        
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
                    }
                }, correctAnswerDelay); // delay for correct answer feedback
            } else {
                // Wrong answer - trigger shake animation immediately
                console.log('Wrong answer - triggering shake animation');
                errorShakeIntensity = 1.0; // Start with full shake intensity
                errorShakeTime = 0; // Reset time counter
                
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
                    } else {
                        // Game finished - player completed all boards (with some mistakes)
                        console.log('🎯 Player completed all boards with mistakes! Final score:', score);
                        
                        // Set blue color when completing all boards individually (same as timeout)
                        failed = true;
                        document.bgColor = 'royalblue';
                        console.log('🏁 Player completed all boards individually - set background to royalblue');
                        
                        // Enter summary mode instead of finished mode
                        enterSummaryMode();
                        
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


function handleHardModeClick() {
    console.log('🖱️ handleHardModeClick called, mouseX:', mouseX, 'mouseY:', mouseY, 'hardModeStone:', window.hardModeStone, 'hardModeButtons:', window.hardModeButtons);
    
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


function handleNormalModeClick() {
    console.log('🖱️ handleNormalModeClick called, mouseX:', mouseX, 'mouseY:', mouseY, 'normalModeBlackStone:', normalModeBlackStone, 'normalModeWhiteStone:', normalModeWhiteStone);
    
    // Check black stone button click
    if (normalModeBlackStone) {
        const stone = normalModeBlackStone;
        
        if (dist(mouseX, mouseY, stone.x, stone.y) < stone.radius) {
            // Trigger bounce animation for black stone button
            blackStoneBounce = 1;
            
            // Submit black answer
            submitNormalModeAnswer('black');
            return;
        }
    }
    
    // Check white stone button click
    if (normalModeWhiteStone) {
        const stone = normalModeWhiteStone;
        
        if (dist(mouseX, mouseY, stone.x, stone.y) < stone.radius) {
            // Trigger bounce animation for white stone button
            whiteStoneBounce = 1;
            
            // Submit white answer
            submitNormalModeAnswer('white');
            return;
        }
    }
}


function submitHardModeAnswer(colorValue, scoreDiff) {
    // Calculate the signed score (positive for black, negative for white)
    const signedScore = colorValue * scoreDiff;
    
    // Comprehensive logging for hard mode
    console.log('🎯 === HARD MODE ANSWER SUBMISSION ===');
    console.log('🎯 Player Answer:', colorValue === 1 ? 'Black' : 'White', 'by', scoreDiff);
    console.log('🎯 Signed Score:', signedScore);
    console.log('🎯 Scoring Mode:', gameState.settings?.scoringMode || 'territory (default)');
    
    // Check if scores are available for validation
    if (window.currentTerritoryScore && window.currentAreaScore) {
        // Determine which score to use for validation
        const usingAreaScoring = gameState.settings?.scoringMode === 'area';
        const activeScore = usingAreaScoring ? window.currentAreaScore : window.currentTerritoryScore;
        const correctSignedScore = activeScore.difference;
        
        console.log('🎯 Territory Score:', window.currentTerritoryScore.difference, '(', window.currentTerritoryScore.winningColor, 'by', Math.abs(window.currentTerritoryScore.difference), ')');
        console.log('🎯 Area Score:', window.currentAreaScore.difference, '(', window.currentAreaScore.winningColor, 'by', Math.abs(window.currentAreaScore.difference), ')');
        console.log('🎯 Correct Answer:', correctSignedScore, 'using', usingAreaScoring ? 'area' : 'territory', 'scoring');
        
        const isCorrect = signedScore === correctSignedScore;
        console.log('🎯 Result:', isCorrect ? '✅ CORRECT' : '❌ WRONG');
            
        // Trigger shake animation for incorrect answers
        if (!isCorrect) {
            errorShakeIntensity = 1.0; // Start with full shake intensity
            errorShakeTime = 0; // Reset time counter
        }
        
        // Submit with proper validation - include full answer with score
        const colorString = colorValue === 1 ? 'black' : 'white';
        const formattedAnswer = colorValue === 1 ? `B+${scoreDiff}` : `W+${scoreDiff}`;
        submitMultiplayerHardMode(formattedAnswer, isCorrect);
    } else {
        console.log('❌ No territory score available for validation');
        
        // Trigger shake animation for fallback (since we default to incorrect)
        errorShakeIntensity = 1.0;
        errorShakeTime = 0;
        
        // Fallback to simple color validation with formatted answer
        const formattedAnswer = colorValue === 1 ? `B+${scoreDiff}` : `W+${scoreDiff}`;
        submitMultiplayerHardMode(formattedAnswer, false); // Default to false since we can't validate
    }
}


function submitMultiplayerHardMode(guess, isCorrect) {
    console.log(`📤 Submitting hard mode answer: ${guess}, isCorrect: ${isCorrect}`);
    
    // Track board result for summary screen (hard mode)
    if (gameState.boardSequence && gameState.currentBoard < gameState.boardSequence.length) {
        const boardId = gameState.boardSequence[gameState.currentBoard];
        const territoryScore = window.currentTerritoryScore;
        
        // Calculate time taken for this board
        const timeTaken = boardStartTime ? (Date.now() - boardStartTime) / 1000 : null;
        
        const boardResult = {
            boardId: boardId,
            gameInstanceId: currentGameInstanceId,
            playerAnswer: guess,
            correctAnswer: territoryScore ? territoryScore.winningColor : guess,
            isCorrect: isCorrect,
            blackScore: territoryScore ? territoryScore.blackTerritory : 0,
            whiteScore: territoryScore ? territoryScore.whiteTerritory : 0,
            difference: territoryScore ? territoryScore.difference : 0,
            winningColor: territoryScore ? territoryScore.winningColor : guess,
            mode: 'hard',
            transforms: currentBoardTransforms,
            timeTaken: timeTaken
        };
        
        playerBoardResults.push(boardResult);
        currentGameBoardResults.push(boardResult);
        console.log('📝 Tracked hard mode board result:', boardResult);
    }
    
    socket.emit('submit-answer', { 
        answer: guess, 
        isCorrect: isCorrect,
        currentBoardIndex: gameState.currentBoard,
        transforms: currentBoardTransforms
    }, (response) => {
        console.log('📥 Server response:', response);
        if (response.success) {
            if (isCorrect) {
                console.log('✅ Correct answer - advancing to next board');
                
                // Trigger success animation
                successAnimationIntensity = 1.0;
                
                // Increment score and board index (matching normal mode behavior)
                score++;
                gameState.currentBoard++;
                
                // Add a brief delay to show correct answer feedback before next board
                setTimeout(() => {
                    // Load next board
                    if (gameState.boardSequence && gameState.currentBoard < gameState.boardSequence.length) {
                        loadMultiplayerBoard(gameState.currentBoard);
                    } else if (!gameState.settings?.unlimited) {
                        // Game finished - player completed all boards
                        console.log('🎯 Player completed all boards! Final score:', score);
                        
                        // Set blue color for individual completion
                        failed = true;
                        document.bgColor = 'royalblue';
                        console.log('🏁 Player completed all boards individually - set background to royalblue');
                        
                        // Enter summary mode instead of finished mode
                        enterSummaryMode();
                        
                        // Mark ourselves as finished locally
                        const ourPlayer = gameState.players.find(p => p.id === gameState.playerId);
                        if (ourPlayer) {
                            ourPlayer.finished = true;
                            
                            // Auto-show leaderboard when player finishes
                            setTimeout(() => {
                                showLeaderboard();
                            }, 1000);
                        }
                    }
                }, correctAnswerDelay); // delay for correct answer feedback
            } else {
                // Wrong answer - apply penalty if game is still active and there's more than 1 second left
                if (gameState.phase !== 'finished' && timer > 1000) {
                    console.log('❌ Wrong answer - applying 1 second penalty');
                    
                    // Trigger shake animation for wrong answer
                    errorShakeIntensity = 1.0; // Start with full shake intensity
                    errorShakeTime = 0; // Reset time counter
                    
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
                            
                            // Set blue color for individual completion
                            failed = true;
                            document.bgColor = 'royalblue';
                            console.log('🏁 Player completed all boards individually - set background to royalblue');
                            
                            // Enter summary mode instead of finished mode
                            enterSummaryMode();
                            
                            // Mark ourselves as finished locally
                            const ourPlayer = gameState.players.find(p => p.id === gameState.playerId);
                            if (ourPlayer) {
                                ourPlayer.finished = true;
                                
                                // Auto-show leaderboard when player finishes
                                setTimeout(() => {
                                    showLeaderboard();
                                }, 1000);
                            }
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
    console.log('🖱️ handleClick called - gameState.phase:', gameState.phase, 'mouseX:', mouseX, 'mouseY:', mouseY);
    
    // Handle summary screen clicks
    if (gameState.phase === 'summary') {
        console.log('🎯 In summary mode, reviewingBoardIndex:', reviewingBoardIndex);
        if (reviewingBoardIndex >= 0) {
            console.log('📋 In board review mode - no button handling needed');
            // In board review mode - no button handling needed (using HTML buttons now)
        } else {
            console.log('🎯 In summary grid mode - calling handleSummaryGridClick');
            // In summary grid mode - check for mini board clicks
            handleSummaryGridClick();
            return;
        }
        return;
    }
    
    // Only allow clicks during active gameplay, not during penalty, and player hasn't finished
    if (gameState.phase !== 'playing' || timer <= 0 || penaltyMode || failed) return;
    
    if (gameState.settings && gameState.settings.hardMode) {
        // Hard mode click handling
        handleHardModeClick();
    } else {
        // Normal mode stone button click handling
        handleNormalModeClick();
    }
}


function touchEnded() {
    // No longer needed - removed automatic lobby countdown
}


function mouseWheel(event) {
    // Allow scrolling in lobby mode (for room history)
    if (gameState.phase === 'lobby') {
        return true;
    }
    
    // In summary mode, only allow scrolling in grid view, not in detailed board view
    if (gameState.phase === 'summary' && viewingSummary && reviewingBoardIndex === -1) {
        // Allow scrolling only in summary grid view
        return true;
    }
    // Prevent scrolling in detailed board view and other game modes
    return false;
}


function touchStarted() {
    // Allow touch scrolling in lobby mode (for room history)
    if (gameState.phase === 'lobby') {
        return undefined; // Allow default browser touch behavior for scrolling
    }
    
    // In summary grid mode, allow default touch scrolling behavior
    if (gameState.phase === 'summary' && viewingSummary && reviewingBoardIndex === -1) {
        return undefined; // Allow default browser touch behavior for scrolling
    }
    
    // Historical summaries now use current game format without custom scrolling
    // Let browser handle default touch behavior
    return undefined;
}


function touchMoved() {
    // Allow touch scrolling in lobby mode (for room history)
    if (gameState.phase === 'lobby') {
        return undefined; // Allow default browser touch behavior for scrolling
    }
    
    // In summary grid mode, allow default touch scrolling behavior
    if (gameState.phase === 'summary' && viewingSummary && reviewingBoardIndex === -1) {
        return undefined; // Allow default browser touch behavior for scrolling
    }
    
    // Historical summaries now use current game format without custom scrolling
    // Let browser handle default touch scrolling behavior
    return undefined;
}


async function viewHistoricalGameSummary(gameId) {
    console.log('Viewing historical game summary for:', gameId);
    
    try {
        // Fetch the complete game data from server
        const response = await fetch(`${SERVER_URL}/game/${gameId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch game data: ${response.status}`);
        }
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Failed to load game data');
        }
        
        // Hide the room UI overlay
        document.getElementById('ui-overlay').style.display = 'none';
        
        // Set golden background for summary phase
        document.bgColor = 'goldenrod';
        document.body.style.backgroundColor = 'goldenrod';
        
        // Convert historical data to current game format and use regular summary mode
        viewingHistoricalGame = result.game;
        
        // Convert historical data to currentGameBoardResults format
        currentGameBoardResults = [];
        currentGameInstanceId = result.game.id;
        const currentPlayerName = gameState.playerName;
        
        console.log('🔍 Converting historical game data:');
        console.log('- Current player name:', currentPlayerName);
        console.log('- Game player responses:', result.game.playerResponses);
        
        if (result.game.playerResponses) {
            for (const [playerId, responses] of Object.entries(result.game.playerResponses)) {
                if (responses && responses.length > 0) {
                    console.log(`- Player ${playerId} responses:`, responses.length);
                    console.log(`- Sample response:`, responses[0]);
                    
                    // Filter responses to only show those from the current player
                    const currentPlayerResponses = responses.filter(response => {
                        return response.playerName === currentPlayerName;
                    });
                    
                    console.log(`- Matching responses for ${currentPlayerName}:`, currentPlayerResponses.length);
                    
                    // Add the filtered responses to currentGameBoardResults
                    currentPlayerResponses.forEach(response => {
                        // Calculate timing from historical data
                        let timeTaken = null;
                        if (response.timestamp) {
                            // For the first board, use game start time if available
                            if (response.boardIndex === 0 && result.game.startTime) {
                                timeTaken = (response.timestamp - result.game.startTime) / 1000;
                            }
                            // For subsequent boards, find the previous response timestamp
                            else if (response.boardIndex > 0) {
                                const prevResponse = currentPlayerResponses.find(r => r.boardIndex === response.boardIndex - 1);
                                if (prevResponse && prevResponse.timestamp) {
                                    timeTaken = (response.timestamp - prevResponse.timestamp) / 1000;
                                }
                            }
                        }
                          
                        // Calculate correct answer using territory scoring
                        let correctAnswer = 'Unknown';
                        let blackScore = 0;
                        let whiteScore = 0;
                        let difference = 0;
                        let winningColor = 'Unknown';
                        
                        try {
                            const currentBoards = result.game.settings?.hardMode ? window.boardsHard : boards;
                            const currentDeadStones = result.game.settings?.hardMode ? window.deadStonesHard : window.deadStones;
                            
                            if (currentBoards && currentDeadStones && response.boardId < currentBoards.length) {
                                // Apply transforms to get the board as the player saw it
                                let boardString = currentBoards[response.boardId];
                                let deadStonesString = currentDeadStones[response.boardId];
                                
                                if (response.transforms) {
                                    boardString = applyBoardTransformations(boardString, response.transforms);
                                    deadStonesString = applyBoardTransformations(deadStonesString, response.transforms);
                                }
                                
                                const territoryScore = calculateTerritoryScore(boardString, deadStonesString);
                                blackScore = territoryScore.blackTerritory;
                                whiteScore = territoryScore.whiteTerritory;
                                difference = territoryScore.difference;
                                magnitude = territoryScore.scoreMagnitude;
                                winningColor = territoryScore.winningColor;
                                
                                if (result.game.settings?.hardMode) {
                                    // Hard mode: format as color+difference
                                    correctAnswer = winningColor === 'black' ? `B+${magnitude}` : `W+${magnitude}`;
                                } else {
                                    // Normal mode: just the winning color
                                    correctAnswer = winningColor
                                }
                            }
                        } catch (error) {
                            console.error('Error calculating territory score for historical board:', error);
                        }

                        currentGameBoardResults.push({
                            boardId: response.boardId,
                            isCorrect: response.isCorrect,
                            correctAnswer: correctAnswer,
                            playerAnswer: response.answer,
                            mode: result.game.settings?.hardMode ? 'hard' : 'normal',
                            blackScore: blackScore,
                            whiteScore: whiteScore,
                            difference: difference,
                            winningColor: winningColor,
                            gameInstanceId: result.game.id, 
                            transforms: response.transforms, // Store transforms for consistent display 
                            timeTaken: timeTaken, // Include calculated timing data 
                            timestamp: response.timestamp // Keep original timestamp for debugging
                        });
                    });
                }
            }
        }
        
        console.log(`✅ Converted ${currentGameBoardResults.length} board results from historical game`);
        
        
        // Use regular summary mode
        gameState.phase = 'summary';
        viewingSummary = true; // Enable proper scrolling control
        reviewingBoardIndex = -1; // Start with grid view
        summaryLogged = false; // Reset logging flag
        cachedSummaryData = null; // Clear cached data for historical view
        
        // Enable scrolling for summary content (same as enterSummaryMode)
        document.body.style.alignItems = 'flex-start';
        document.body.style.paddingTop = '80px';
        document.body.style.height = 'auto';
        document.body.style.minHeight = '100vh';
        document.body.style.overflowY = 'auto';
        document.body.style.webkitOverflowScrolling = 'touch';
        
        windowResized() 
        
        // Show UI elements needed for canvas interaction
        document.getElementById('leaderboard').style.display = 'none';
        document.getElementById('leaderboard-toggle').style.display = 'none';
        document.getElementById('resign-button').style.display = 'none';
        
        console.log('Entered historical summary mode for game:', gameId, viewingHistoricalGame);
        
    } catch (error) {
        console.error('Error loading historical game data:', error);
        alert('Failed to load game summary. Please try again.');
    }
}


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
    
    const historyContent = document.getElementById('history-content');
    if (!historyContent) {
        console.warn('⚠️ History content element not found');
        return; // Element doesn't exist yet
    }

    try {
        
        // Only load if we're in a room
        if (!gameState.roomId) {
            console.warn('⚠️ No room ID available for leaderboard history');
            historyContent.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">Join a room to see history</div>';
            return;
        }
        
        // Use mock data only when explicitly enabled
        if (useMockData) {
            console.log('🚀 Development mode: Using mock data');
            setTimeout(() => {
                const roomGames = MOCK_GAMES.filter(game => game.roomId === gameState.roomId);
                console.log(`Mock data: ${roomGames.length} games for room ${gameState.roomId}`);
                
                if (roomGames.length > 0) {
                    displayLeaderboardHistory(roomGames);
                } else {
                    displayLeaderboardHistory([]);
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
                // Normalize both IDs to strings and trim whitespace for comparison
                const gameRoomId = String(game.roomId).trim();
                const currentRoomId = String(gameState.roomId).trim();
                const match = gameRoomId === currentRoomId;
                if (!match) {
                    console.log(`- Game roomId: "${game.roomId}" (${typeof game.roomId}) !== gameState.roomId: "${gameState.roomId}" (${typeof gameState.roomId})`);
                    console.log(`- Normalized comparison: "${gameRoomId}" === "${currentRoomId}" = ${match}`);
                }
                return match;
            });
            console.log(`✅ Filtered to ${roomGames.length} games for room ${gameState.roomId}`);
            
            if (roomGames.length > 0) {
                displayLeaderboardHistory(roomGames);
            } else {
                // Show empty table when no games for this room
                displayLeaderboardHistory([]);
            }
        } else {
            displayLeaderboardHistory([]);
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
