# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Counting Battle is a sophisticated multiplayer web-based Go territory counting practice game. Players join rooms and compete to correctly identify which side (black or white) is winning on random Go board positions, with an optional hard mode requiring exact territory score differences. The game features real-time multiplayer synchronization, customizable timers, multiple game modes, and comprehensive scoring systems using the lightvector/goscorer library.

## Architecture Overview

### Frontend (Client-Side)
- **index.html**: Main application entry point with module loading and UI structure
- **multiplayer.js**: Core game logic, UI rendering, Socket.IO client, and p5.js integration
- **boards.js**: 1000+ hand-crafted Go board positions in string format
- **goscorer.js**: Imported Go territory scoring library (lightvector/goscorer)
- **name-generator.js**: Random player name generation
- **about.html/about.css**: Game rules and information pages
- **style.css**: Minimal base styling for canvas centering

### Backend (Server-Side)
- **server/server.js**: Node.js Express server with Socket.IO for multiplayer coordination
- **server/package.json**: Server dependencies (express, socket.io, cors)

### Key Libraries
- **p5.js**: Graphics rendering and canvas management
- **Socket.IO**: Real-time multiplayer communication
- **lightvector/goscorer**: Accurate Go territory scoring with seki detection

## Core Features

### Game Modes
1. **Normal Mode**: Players select winning color (black/white)
2. **Hard Mode**: Players select winning color AND exact territory score difference
3. **Development Mode**: Shows correct answers for testing (localhost only)

### Multiplayer System
- Real-time room-based multiplayer via Socket.IO
- Room creation with 6-character codes
- Host controls (start game, return to lobby)
- Live leaderboard with player rankings
- Room history showing completed games
- Automatic lobby return after game completion

### Board Management
- 1000+ unique Go positions stored as strings ('x'=black, 'o'=white, '.'=empty)
- Dynamic board transformations (rotation, flipping, color inversion)
- Sequential board progression during games
- Territory scoring using goscorer library with flood fill algorithms

### UI Features
- Responsive canvas rendering with p5.js
- Animated stone selection toggle button
- Bounce animations on button interactions  
- Score choice buttons with golden highlighting for correct answers (dev mode)
- Countdown timers and penalty systems
- Leaderboard toggle with click-to-hide functionality
- Clean state transitions between lobby/game phases

## Technical Implementation

### Module Loading Strategy
Due to p5.js compatibility issues with ES6 modules, the project uses a hybrid approach:

```html
<!-- Inline ES6 module for goscorer functions -->
<script type="module">
    import { EMPTY, BLACK, WHITE, territoryScoring, finalTerritoryScore } from './goscorer.js';
    window.EMPTY = EMPTY;
    window.BLACK = BLACK; 
    window.WHITE = WHITE;
    window.territoryScoring = territoryScoring;
    window.finalTerritoryScore = finalTerritoryScore;
</script>
<!-- Regular script for p5.js compatibility -->
<script src="multiplayer.js"></script>
```

### Hard Mode Implementation
- Two-step selection: color toggle + score difference choice
- Territory scoring converts board strings to numerical arrays for goscorer
- Score validation: `selectedColorValue × selectedDifference = signedAnswer`
- Wrong answer generation with varied distributions (3 below, 2+1, 1+2, 3 above)

### Game State Management
```javascript
gameState = {
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
```

### Animation System
- Bounce effects using transform scaling with decay
- Button press feedback with configurable strength/decay
- CSS transitions for smooth UI state changes

## Development Guidelines

### File Organization
- **Never create new files** unless absolutely necessary - prefer editing existing files
- **Never create documentation** unless explicitly requested
- All core logic resides in `multiplayer.js` to maintain p5.js compatibility
- Server logic separated in `server/` directory

### Code Patterns
- Use p5.js global functions (setup, draw, mousePressed, etc.)
- Socket.IO event handlers for multiplayer synchronization
- Territory scoring via goscorer library functions
- Responsive canvas sizing with proper coordinate systems
- Animation updates in draw() loop with time-based decay

### Testing and Development
- Development mode toggles available on localhost
- Test board functions for debugging specific positions  
- Mock data system for offline development
- Server supports both local and production environments

### Key Functions
- `calculateTerritoryScore(board)`: Convert board to goscorer format and score
- `generateScoreChoices(correctScore)`: Create 4 score options with strategic wrong answers
- `toggleSelectedColor()`: Animate stone selection button
- `selectScoreChoice(index)`: Handle score selection with validation
- `returnToLobbyUI()`: Clean canvas and reset UI state for lobby

## Configuration

### Environment Detection
- Localhost detection for development features
- Automatic server URL selection (localhost:3000 vs production)
- Development mode toggle appears only on localhost

### Game Settings
- Customizable timer (1-120 seconds per board)
- Variable board count (1-50 boards per game)
- Hard mode toggle for exact scoring
- Development mode for answer visibility

## Common Operations

### Adding New Features
1. Implement client-side logic in `multiplayer.js`
2. Add server-side coordination in `server/server.js` if needed
3. Update UI in `index.html` only if new elements required
4. Test in both normal and hard modes
5. Verify multiplayer synchronization

### Debugging Territory Scoring
- Use development mode to see correct answers
- Test specific boards with `setTestBoard(boardIndex)`
- Verify goscorer integration with proper array conversion
- Check score choice generation logic

### UI State Management
- Always clean up when transitioning between phases
- Hide game UI elements when returning to lobby
- Reset canvas background colors and clear drawings
- Stop any active animations or timers

## Important Constraints

- **ES6 modules not fully supported**: Use hybrid loading approach for external libraries
- **p5.js global scope required**: All game functions must be globally accessible
- **Socket.IO synchronization**: All game state changes must be coordinated with server
- **Territory scoring accuracy**: Always use goscorer library, not custom implementations
- **UI cleanup mandatory**: Clean state transitions prevent visual artifacts

This codebase represents a sophisticated multiplayer game requiring careful attention to real-time synchronization, accurate territory scoring, and responsive UI state management.
