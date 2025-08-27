const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:8000", 
      "https://count.ajiweaver.com", 
      "https://ajiweaver.github.io",
      /\.netlify\.app$/,  // Allow any Netlify subdomain
      /\.vercel\.app$/,   // Allow any Vercel subdomain (backup option)
      process.env.FRONTEND_URL // Allow custom frontend URL from environment
    ].filter(Boolean), // Remove undefined values
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// In-memory storage for rooms (use Redis in production)
const rooms = new Map();
const playerRooms = new Map(); // Track which room each player is in
const completedGames = []; // Store completed game results for leaderboard history

// Generate random room ID
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Generate random board sequence for a game
function generateBoardSequence(totalBoards = 10) {
  if (totalBoards === -1) {
    // For unlimited mode, generate a large pool of boards (1000)
    const sequence = [];
    for (let i = 0; i < 1000; i++) {
      sequence.push(Math.floor(Math.random() * 100)); // 100 boards available
    }
    return sequence;
  }
  
  const sequence = [];
  for (let i = 0; i < totalBoards; i++) {
    sequence.push(Math.floor(Math.random() * 100)); // 100 boards available
  }
  return sequence;
}

// Room management
class GameRoom {
  constructor(roomId, settings = {}) {
    this.roomId = roomId;
    this.players = new Map();
    this.gameState = 'waiting'; // waiting, playing, finished
    this.currentBoard = 0;
    this.boardSequence = [];
    this.startTime = null;
    this.settings = {
      timePerBoard: settings.timePerBoard !== undefined ? settings.timePerBoard : 15,
      totalBoards: settings.totalBoards !== undefined ? settings.totalBoards : -1, // Default unlimited
      unlimited: settings.unlimited !== undefined ? settings.unlimited : true, // Default unlimited
      unlimitedTime: settings.unlimitedTime !== undefined ? settings.unlimitedTime : false, // Default timed
      progressiveDifficulty: settings.progressiveDifficulty || true
    };
    this.createdAt = Date.now();
    this.creatorUUID = null; // Track creator by UUID for persistent host identity
    this.creatorReconnectTimeout = null; // Timeout for creator reconnection
  }

  updateSettings(newSettings) {
    if (this.gameState !== 'waiting') {
      throw new Error('Cannot update settings while game is in progress');
    }
    
    // Update only provided settings, keep existing ones
    if (newSettings.timePerBoard !== undefined) {
      this.settings.timePerBoard = newSettings.timePerBoard;
    }
    if (newSettings.totalBoards !== undefined) {
      this.settings.totalBoards = newSettings.totalBoards;
    }
    if (newSettings.unlimited !== undefined) {
      this.settings.unlimited = newSettings.unlimited;
    }
    
    console.log(`Room ${this.roomId}: Settings updated:`, this.settings);
  }

  addPlayer(playerId, playerName, playerUUID = null, isDevMode = false) {
    if (this.gameState !== 'waiting') {
      throw new Error('Game already in progress');
    }
    
    const actualName = playerName || `Player ${this.players.size + 1}`;
    
    // First player with UUID becomes the creator
    if (this.players.size === 0 && !this.creatorUUID && playerUUID) {
      this.creatorUUID = playerUUID;
      console.log(`Room ${this.roomId}: Creator UUID set to ${playerUUID}`);
    }
    
    // Check if this player is the creator (by UUID)
    const isCreator = playerUUID && playerUUID === this.creatorUUID;
    
    // If creator is reconnecting, clear the reconnection timeout
    if (isCreator && this.creatorReconnectTimeout) {
      console.log(`Creator ${actualName} reconnected, clearing timeout`);
      clearTimeout(this.creatorReconnectTimeout);
      this.creatorReconnectTimeout = null;
    }
    
    this.players.set(playerId, {
      id: playerId,
      name: actualName,
      uuid: playerUUID,
      score: 0,
      currentAnswer: null,
      finished: false,
      isCreator: isCreator,
      isDevMode: isDevMode
    });
    
    if (isCreator) {
      console.log(`Room ${this.roomId}: Creator ${actualName} (${playerUUID}) ${this.players.size === 1 ? 'joined' : 'reconnected'}`);
    }
    
    return this.players.get(playerId);
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    const wasCreator = player?.isCreator;
    const leavingPlayerName = player?.name;
    
    this.players.delete(playerId);
    
    // If creator left (disconnected), keep their UUID for potential reconnection
    // Only reassign if game hasn't started and they don't reconnect
    if (wasCreator && this.gameState === 'waiting') {
      console.log(`Creator ${leavingPlayerName} disconnected. Keeping room alive for reconnection.`);
      
      // Set a timeout to allow creator reconnection (5 minutes)
      if (!this.creatorReconnectTimeout) {
        this.creatorReconnectTimeout = setTimeout(() => {
          console.log(`Creator reconnection timeout expired for room ${this.roomId}`);
          this.creatorReconnectTimeout = null;
          // Room will be cleaned up by the periodic cleanup if still empty
        }, 5 * 60 * 1000); // 5 minutes
      }
    }
    
    // Don't immediately remove empty rooms if creator just disconnected
    // This allows for page refreshes and reconnections
    const isEmpty = this.players.size === 0;
    if (isEmpty && wasCreator && this.gameState === 'waiting') {
      // Keep room alive for creator reconnection
      return false;
    }
    
    return isEmpty;
  }

  startGame() {
    if (this.gameState !== 'waiting') {
      throw new Error('Game already started');
    }
    
    this.gameState = 'playing';
    this.boardSequence = generateBoardSequence(this.settings.totalBoards);
    this.currentBoard = 0;
    this.startTime = Date.now();
    
    // Reset all players
    for (let player of this.players.values()) {
      player.score = 0;
      player.currentAnswer = null;
      player.finished = false;
    }
  }

  restartGame() {
    if (this.gameState === 'waiting') {
      throw new Error('Game not started yet');
    }
    
    this.gameState = 'playing';
    this.boardSequence = generateBoardSequence(this.settings.totalBoards);
    this.currentBoard = 0;
    this.startTime = Date.now();
    
    // Reset all players
    for (let player of this.players.values()) {
      player.score = 0;
      player.currentAnswer = null;
      player.finished = false;
    }
  }

  returnToLobby() {
    this.gameState = 'waiting';
    this.boardSequence = [];
    this.currentBoard = 0;
    this.startTime = null;
    
    // Reset all players
    for (let player of this.players.values()) {
      player.score = 0;
      player.currentAnswer = null;
      player.finished = false;
    }
  }

  submitAnswer(playerId, answer, isCorrect, currentBoardIndex) {
    const player = this.players.get(playerId);
    if (!player || this.gameState !== 'playing') {
      return false;
    }
    
    player.currentAnswer = answer;
    
    if (isCorrect) {
      player.score++;
      // Check if player has completed all boards (only in limited mode)
      if (!this.settings.unlimited && currentBoardIndex >= this.settings.totalBoards - 1) {
        player.finished = true;
        // Auto-finish game when first player completes all boards
        this.finishAllPlayers();
        return true; // Early return since game is finished
      }
    } else {
      player.finished = true; // Mark player as finished when they get wrong answer
    }
    
    return true;
  }

  finishAllPlayers() {
    // Mark all players as finished when the first player completes all boards
    for (let player of this.players.values()) {
      player.finished = true;
    }
  }


  updatePlayerScore(playerId, newScore, finished = false) {
    const player = this.players.get(playerId);
    if (!player) return false;
    
    player.score = newScore;
    player.finished = finished;
    return true;
  }

  nextBoard() {
    this.currentBoard++;
    if (this.currentBoard >= this.settings.totalBoards) {
      this.gameState = 'finished';
      return false;
    }
    
    // Reset current answers
    for (let player of this.players.values()) {
      player.currentAnswer = null;
    }
    
    return true;
  }

  areAllPlayersFinished() {
    if (this.players.size === 0) return false;
    
    for (let player of this.players.values()) {
      if (!player.finished) {
        return false;
      }
    }
    return true;
  }

  saveCompletedGame() {
    console.log(`Checking if game ${this.roomId} should be saved. State: ${this.gameState}, All finished: ${this.areAllPlayersFinished()}`);
    
    if (this.gameState === 'playing' && this.areAllPlayersFinished()) {
      const gameResult = {
        roomId: this.roomId,
        completedAt: new Date().toISOString(),
        duration: this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
        players: Array.from(this.players.values()).map(player => ({
          name: player.name,
          score: player.score,
          finished: player.finished,
          isCreator: player.isCreator
        })).sort((a, b) => b.score - a.score), // Sort by score descending
        settings: {
          timePerBoard: this.settings.timePerBoard,
          unlimited: this.settings.unlimited,
          unlimitedTime: this.settings.unlimitedTime
        }
      };
      
      completedGames.unshift(gameResult); // Add to beginning of array
      console.log(`Game ${this.roomId} saved! Total completed games: ${completedGames.length}`);
      console.log('Game result:', gameResult);
      
      // Keep only last 50 games to prevent memory issues
      if (completedGames.length > 50) {
        completedGames.splice(50);
      }
    } else {
      console.log(`Game ${this.roomId} not saved. Requirements not met.`);
    }
  }

  getGameState() {
    return {
      roomId: this.roomId,
      gameState: this.gameState,
      players: Array.from(this.players.values()),
      currentBoard: this.currentBoard,
      totalBoards: this.settings.totalBoards,
      boardSequence: this.boardSequence,
      settings: this.settings,
      startTime: this.startTime,
      allPlayersFinished: this.areAllPlayersFinished()
    };
  }
}

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // Create room
  socket.on('create-room', (data, callback) => {
    try {
      const roomId = generateRoomId();
      const room = new GameRoom(roomId, data.settings);
      rooms.set(roomId, room);
      
      callback({ success: true, roomId });
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });

  // Join room
  socket.on('join-room', (data, callback) => {
    try {
      const { roomId, playerName, playerUUID, isDevMode } = data;
      const room = rooms.get(roomId);
      
      if (!room) {
        callback({ success: false, error: 'Room not found' });
        return;
      }
      
      const player = room.addPlayer(socket.id, playerName, playerUUID, isDevMode);
      playerRooms.set(socket.id, roomId);
      
      socket.join(roomId);
      
      // Notify all players in room
      io.to(roomId).emit('player-joined', {
        player,
        gameState: room.getGameState()
      });
      
      callback({ success: true, player, gameState: room.getGameState() });
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });

  // Start game (only room creator can start)
  socket.on('start-game', (data, callback) => {
    try {
      const roomId = playerRooms.get(socket.id);
      const room = rooms.get(roomId);
      
      if (!room) {
        callback({ success: false, error: 'Room not found' });
        return;
      }
      
      const player = room.players.get(socket.id);
      if (!player?.isCreator) {
        callback({ success: false, error: 'Only room creator can start game' });
        return;
      }
      
      // Update room settings if provided
      if (data && data.settings) {
        room.updateSettings(data.settings);
      }
      
      room.startGame();
      
      // Notify all players
      io.to(roomId).emit('game-started', room.getGameState());
      
      callback({ success: true });
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });

  // Submit answer
  socket.on('submit-answer', (data, callback) => {
    try {
      const roomId = playerRooms.get(socket.id);
      const room = rooms.get(roomId);
      
      if (!room) {
        callback({ success: false, error: 'Room not found' });
        return;
      }
      
      const success = room.submitAnswer(socket.id, data.answer, data.isCorrect, data.currentBoardIndex);
      if (success) {
        const player = room.players.get(socket.id);
        
        // Broadcast answer and score update to all players
        io.to(roomId).emit('player-answered', {
          playerId: socket.id,
          playerName: player.name,
          answer: data.answer,
          isCorrect: data.isCorrect,
          newScore: player.score,
          finished: player.finished
        });
        
        // Broadcast updated game state to sync leaderboards
        io.to(roomId).emit('score-updated', {
          players: Array.from(room.players.values())
        });
        
        // Save game if all players are finished
        if (room.areAllPlayersFinished()) {
          room.saveCompletedGame();
          
          // Broadcast game finished event to all players in the room
          io.to(roomId).emit('game-finished', {
            gameState: room.getGameState(),
            finalResults: {
              players: Array.from(room.players.values()).sort((a, b) => b.score - a.score),
              gameCompleted: true
            }
          });
          console.log('Game finished event sent to all players in room:', room.roomId);
          
          // Broadcast leaderboard update to all connected clients
          io.emit('leaderboard-updated', {
            games: completedGames.slice(0, 20)
          });
          console.log('Game completed and leaderboard updated:', room.roomId);
        }
        
        callback({ success: true });
      } else {
        callback({ success: false, error: 'Could not submit answer' });
      }
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });

  // Restart game (only room creator can restart)
  socket.on('restart-game', (callback) => {
    try {
      const roomId = playerRooms.get(socket.id);
      const room = rooms.get(roomId);
      
      if (!room) {
        callback({ success: false, error: 'Room not found' });
        return;
      }
      
      const player = room.players.get(socket.id);
      if (!player?.isCreator) {
        callback({ success: false, error: 'Only room creator can restart game' });
        return;
      }
      
      room.restartGame();
      
      // Notify all players
      io.to(roomId).emit('game-restarted', room.getGameState());
      
      callback({ success: true });
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });

  // Return to lobby (only room creator can do this)
  socket.on('return-to-lobby', (callback) => {
    try {
      const roomId = playerRooms.get(socket.id);
      const room = rooms.get(roomId);
      
      if (!room) {
        callback({ success: false, error: 'Room not found' });
        return;
      }
      
      const player = room.players.get(socket.id);
      if (!player?.isCreator) {
        callback({ success: false, error: 'Only room creator can return to lobby' });
        return;
      }
      
      room.returnToLobby();
      
      // Notify all players
      io.to(roomId).emit('returned-to-lobby', room.getGameState());
      
      callback({ success: true });
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
    const roomId = playerRooms.get(socket.id);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        const isEmpty = room.removePlayer(socket.id);
        
        if (isEmpty) {
          rooms.delete(roomId);
        } else {
          // Notify remaining players
          io.to(roomId).emit('player-left', {
            playerId: socket.id,
            gameState: room.getGameState()
          });
        }
      }
      
      playerRooms.delete(socket.id);
    }
  });

  // Get room info
  socket.on('get-room-info', (roomId, callback) => {
    const room = rooms.get(roomId);
    if (room) {
      callback({ success: true, gameState: room.getGameState() });
    } else {
      callback({ success: false, error: 'Room not found' });
    }
  });

  // Find existing room by creator UUID
  socket.on('find-creator-room', (data, callback) => {
    const { creatorUUID } = data;
    
    if (!creatorUUID) {
      callback({ success: false, error: 'No creator UUID provided' });
      return;
    }
    
    // Search for room with matching creator UUID in waiting state
    for (let [roomId, room] of rooms.entries()) {
      if (room.creatorUUID === creatorUUID && room.gameState === 'waiting') {
        console.log(`Found existing room ${roomId} for creator ${creatorUUID}`);
        callback({ 
          success: true, 
          roomId: roomId,
          gameState: room.getGameState()
        });
        return;
      }
    }
    
    callback({ success: false, error: 'No existing room found' });
  });
});

// REST API endpoints
app.get('/', (req, res) => {
  res.json({ 
    message: 'Count Battle! Multiplayer Server', 
    status: 'running',
    version: '1.0.0',
    endpoints: ['/health', '/rooms/:roomId', '/leaderboard'],
    socketNamespace: '/'
  });
});

app.get('/rooms/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (room) {
    res.json({ success: true, gameState: room.getGameState() });
  } else {
    res.status(404).json({ success: false, error: 'Room not found' });
  }
});

app.get('/leaderboard', (req, res) => {
  console.log(`Leaderboard API called. Total games: ${completedGames.length}`);
  res.json({ 
    success: true, 
    games: completedGames.slice(0, 20), // Return last 20 games
    totalGames: completedGames.length
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    rooms: rooms.size, 
    connections: io.engine.clientsCount,
    completedGames: completedGames.length
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Cleanup old rooms (run every 10 minutes)
setInterval(() => {
  const now = Date.now();
  const ROOM_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours
  
  for (let [roomId, room] of rooms.entries()) {
    if (now - room.createdAt > ROOM_TIMEOUT && room.players.size === 0) {
      // Clean up any pending reconnection timeout
      if (room.creatorReconnectTimeout) {
        clearTimeout(room.creatorReconnectTimeout);
        room.creatorReconnectTimeout = null;
      }
      rooms.delete(roomId);
      console.log(`Cleaned up old room: ${roomId}`);
    }
  }
}, 10 * 60 * 1000);