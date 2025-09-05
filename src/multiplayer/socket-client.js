// Socket Client
// Socket.IO client connection and event handlers for multiplayer functionality

// Initialize socket connection
function initSocket() {
    console.log('🔌 initSocket() called - SERVER_URL:', SERVER_URL);
    
    if (socketInitialized) {
        console.log('⚠️ Socket already initialized, skipping');
        return;
    }
    
    if (socket) {
        console.log('⚠️ Socket already exists, disconnecting old one');
        socket.disconnect();
    }
    
    socketInitialized = true;
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
        
        const joinedPlayer = data.player;
        const isCurrentPlayer = joinedPlayer && joinedPlayer.id === gameState.playerId;
        
        // Only update UI for other players joining, not when current player joins
        // (current player's UI is updated via join-room response callback)
        if (!isCurrentPlayer) {
            console.log(`🔄 Another player joined: ${joinedPlayer?.name}, updating player list`);
            await updatePlayerListAndStatus();
        } else {
            console.log(`🔄 Current player joined event received, skipping UI update to prevent duplicates`);
        }
        
        // Only reload leaderboard history when the current user joins (not when others join)
        if (isCurrentPlayer && gameState.phase === 'lobby' && gameState.roomId) {
            console.log('🔄 Player joined room - history will be loaded by showRoomLobby()');
            // Don't call loadLeaderboardHistory here since showRoomLobby() already handles it
        }
    });
    
    socket.on('player-left', async (data) => {
        updateGameState(data.gameState);
        
        // Use targeted update instead of full UI redraw
        await updatePlayerListAndStatus();
    });
    
    socket.on('game-started', (data) => {
        console.log('🎮 Game started event received:', data);
        updateGameState(data);
        resetBoardResults(); // Reset and generate new game instance ID
        startMultiplayerGame();
    });
    
    socket.on('room-settings-updated', async (data) => {
        console.log('🔄 Room settings updated from server:', data.settings);
        updateGameState(data.gameState);
        
        // Sync local game variables with room settings
        if (data.gameState.settings) {
            currentTimePerBoard = data.gameState.settings.timePerBoard;
            currentTotalBoards = data.gameState.settings.totalBoards;
            console.log('🔄 Synced local variables with room settings:', {
                currentTimePerBoard,
                currentTotalBoards
            });
        }
        
        updateRoomSettingsDisplay();
        
        // Update scoring mode indicator during gameplay
        if (typeof updateScoringModeIndicator === 'function') {
            updateScoringModeIndicator();
        }
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

    socket.on('returned-to-lobby', async (data) => {
        // This handles room-wide lobby returns (when server forces all players back)
        updateGameState(data);
        await returnToLobbyUI();
    });

    // Handle game finished event - ensures all players get final colors
    socket.on('game-finished', (data) => {
        console.log('🏁 Game finished event received:', data);
        
        // Check if player is currently in summary mode or lobby BEFORE updating game state
        const wasInSummaryMode = (getEffectivePhase() === 'summary');
        const wasInLobby = (getEffectivePhase() === 'lobby');
        const wasViewingHistorical = (viewingHistoricalGame !== null);
        console.log('🔍 Player state before game finished - Summary:', wasInSummaryMode, 'Lobby:', wasInLobby, 'Historical:', wasViewingHistorical);
        
        // For players in lobby or viewing historical data, ignore the game-finished event completely
        if (wasInLobby || wasViewingHistorical) {
            console.log('🚫 Player in lobby or viewing historical data - ignoring game-finished event');
            updateLeaderboard(); // Only update leaderboard data
            return;
        }
        
        // Update game state with final results
        updateGameState(data.gameState);
        timer = -1;
        
        // Only affect players who were actively playing (not in summary)
        if (!wasInSummaryMode) {
            // Only set background colors and show leaderboard for players not reviewing individual boards
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
        } else {
            console.log('🔍 Player was in summary mode - not changing background or showing leaderboard');
        }
        
        // Only enter summary mode for players who were actively playing (not in summary)
        if (!wasInSummaryMode) {
            enterSummaryMode();
            console.log('🎯 Player transitioned to summary mode (was actively playing)');
        } else {
            console.log('🎯 Player already in summary mode - preserving current view state');
        }
        
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

// Socket event helper functions
function emitJoinRoom(roomId, playerName) {
    if (!socket) {
        console.error('❌ Socket not initialized');
        return;
    }
    
    socket.emit('join-room', { roomId, playerName }, (response) => {
        handleJoinRoomResponse(response);
    });
}

function emitCreateRoom(playerName, settings, creatorUUID) {
    if (!socket) {
        console.error('❌ Socket not initialized');
        return;
    }
    
    socket.emit('create-room', { playerName, settings, creatorUUID }, (response) => {
        handleCreateRoomResponse(response);
    });
}

function emitStartGame() {
    if (!socket || !gameState.roomId) {
        console.error('❌ Cannot start game - missing socket or room ID');
        return;
    }
    
    socket.emit('start-game', { roomId: gameState.roomId });
}

function emitPlayerAnswer(answer, isCorrect, mode = 'normal', additionalData = {}) {
    if (!socket || !gameState.roomId) {
        console.error('❌ Cannot submit answer - missing socket or room ID');
        return;
    }
    
    const answerData = {
        roomId: gameState.roomId,
        answer,
        isCorrect,
        mode,
        boardId: gameState.currentBoard,
        timeTaken: boardStartTime ? Date.now() - boardStartTime : 0,
        ...additionalData
    };
    
    socket.emit('player-answer', answerData);
}

function emitResignGame() {
    if (!socket || !gameState.roomId) {
        console.error('❌ Cannot resign - missing socket or room ID');
        return;
    }
    
    socket.emit('resign-game', { roomId: gameState.roomId });
}

function emitLeaveRoom() {
    if (!socket || !gameState.roomId) {
        console.error('❌ Cannot leave room - missing socket or room ID');
        return;
    }
    
    socket.emit('leave-room', { roomId: gameState.roomId });
}

function emitUpdateRoomSettings(settings) {
    if (!socket || !gameState.roomId) {
        console.error('❌ Cannot update settings - missing socket or room ID');
        return;
    }
    
    socket.emit('update-room-settings', { roomId: gameState.roomId, settings });
}

// Export functions for global access
window.initSocket = initSocket;
window.emitJoinRoom = emitJoinRoom;
window.emitCreateRoom = emitCreateRoom;
window.emitStartGame = emitStartGame;
window.emitPlayerAnswer = emitPlayerAnswer;
window.emitResignGame = emitResignGame;
window.emitLeaveRoom = emitLeaveRoom;
window.emitUpdateRoomSettings = emitUpdateRoomSettings;