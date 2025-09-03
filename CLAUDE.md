# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Counting Battle is a sophisticated multiplayer web-based Go territory counting practice game. Players join rooms and compete to correctly identify which side (black or white) is winning on random Go board positions, with an optional hard mode requiring exact territory score differences. The game features real-time multiplayer synchronization, customizable timers, multiple game modes, and comprehensive scoring systems using the lightvector/goscorer library.

## Common Development Commands

### Running the Game
```bash
# Install server dependencies
npm run install-server

# Start the multiplayer server (development mode with nodemon)
npm run dev

# Start the multiplayer server (production mode)
npm start

# Serve the frontend files locally
python3 -m http.server 8000

# Access the game
# Frontend: http://localhost:8000
# Server: http://localhost:3000
```

### Development Tools
- **Board Editor**: Access at `http://localhost:8000/board-editor.html` (localhost only)
- **Development Mode**: Toggle in main menu (localhost only) - shows correct answers
- **Debug Console**: Available in browser console for testing and debugging

## Architecture Overview

### Modular Frontend Structure
The codebase has been restructured from a monolithic `multiplayer.js` into a modular architecture:

```
src/
├── core/
│   ├── game-state.js      # Central game state management
│   ├── board-logic.js     # Board manipulation and validation
│   ├── scoring.js         # Territory scoring integration
│   └── goscorer.js        # Go territory scoring library
├── ui/
│   └── lobby-ui.js        # UI rendering, canvas drawing, user interactions
├── multiplayer/
│   └── socket-client.js   # Socket.IO client communication
├── utils/
│   ├── storage.js         # localStorage utilities
│   ├── helpers.js         # Common utility functions
│   ├── name-generator.js  # Random player name generation
│   └── dev-tools.js       # Development/debugging tools
├── editor/
│   └── board-editor.js    # Visual board editor (localhost only)
└── main.js                # Application initialization and configuration
```

### Data Organization
```
data/
├── boards/
│   ├── normal.js          # 1000+ Go board positions for normal mode
│   └── hard.js            # Go board positions for hard mode
└── deadstones/
    ├── normal.js          # Dead stone patterns for normal mode
    └── hard.js            # Dead stone patterns for hard mode

assets/
├── lib/
│   └── p5.min.js          # p5.js graphics library
└── css/
    └── main.css           # Base styling
```

### Backend Structure
- **server/server.js**: Node.js Express server with Socket.IO for real-time multiplayer
- **server/package.json**: Server dependencies (express, socket.io, cors)

## Technical Implementation

### Module Loading Strategy
Due to p5.js compatibility requirements, the project uses a hybrid module approach:

1. **ES6 modules** for goscorer library imports (inline script in HTML)
2. **Global script loading** for p5.js-compatible modules
3. **Sequential loading** in index.html maintains dependency order

```html
<!-- ES6 module for goscorer -->
<script type="module">
    import { EMPTY, BLACK, WHITE, territoryScoring, finalTerritoryScore } from './src/core/goscorer.js';
    window.EMPTY = EMPTY;
    // ... global exports for p5.js compatibility
</script>
<!-- Sequential module loading -->
<script src="src/main.js"></script>
<script src="src/core/game-state.js"></script>
<!-- ... other modules -->
```

### Game State Architecture
Central state management in `src/core/game-state.js`:
- **Phase management**: menu → lobby → playing → finished → summary
- **Player state**: tracking scores, status, multiplayer synchronization
- **Board state**: current board, transforms, results tracking
- **User override system**: allows client-side phase control (e.g., staying in summary mode)

### Key Architectural Patterns

#### p5.js Integration
- Global functions (setup, draw, mousePressed, keyPressed) in `src/ui/lobby-ui.js`
- Canvas-based Go board rendering with responsive sizing
- Mouse/touch event handling for button interactions
- Animation system with bounce effects and time-based decay

#### Real-time Multiplayer
- Socket.IO client in `src/multiplayer/socket-client.js`
- Server state synchronization with conflict resolution
- Room-based game sessions with persistent history
- Real-time leaderboard updates during gameplay

#### Territory Scoring System
- Board string format: 'x'=black, 'o'=white, '.'=empty
- Integration with lightvector/goscorer library for accuracy
- Dead stone overlay system for complex scoring scenarios
- Score choice generation for hard mode (4 strategic wrong answers)

## Development Guidelines

### File Organization Principles
- **Modular by function**: core, ui, multiplayer, utils, editor
- **Global exports**: All modules export to window object for p5.js compatibility
- **Single responsibility**: Each module has a focused purpose
- **Dependency management**: main.js handles configuration, modules handle implementation

### Critical Constraints
- **p5.js global scope**: All game functions must be globally accessible via window object
- **No ES6 modules in p5.js code**: Use traditional script loading for p5.js-dependent code
- **Mouse coordinate handling**: Never manually reset p5.js mouseX/mouseY variables
- **Socket.IO sync**: All game state changes must coordinate with server
- **Territory scoring**: Always use goscorer library, never custom implementations

### Testing and Debugging
- **Development mode**: Toggle in main menu (localhost only) shows correct answers
- **Board editor**: Visual editing tool for board positions (localhost only)
- **Console debugging**: Mock data functions and state inspection tools
- **Environment detection**: Automatic localhost vs production configuration

## Common Operations

### Adding New Game Features
1. **State changes**: Update `src/core/game-state.js` for new state variables
2. **UI rendering**: Modify `src/ui/lobby-ui.js` for visual changes
3. **Server sync**: Add Socket.IO events in `src/multiplayer/socket-client.js` if needed
4. **Test both modes**: Verify normal and hard mode compatibility

### Mouse/Click Event Handling
- **Never reset mouseX/mouseY**: p5.js manages these automatically
- **Use handleClick()**: Central click routing in `src/ui/lobby-ui.js`
- **Event bubbling**: Return false from mousePressed() to allow event propagation
- **Button positioning**: Store button coordinates during draw() for click detection

### UI State Transitions
- **Phase management**: Use `getEffectivePhase()` for current phase with user override support
- **Canvas cleanup**: Reset background colors and clear drawings between phases
- **Button visibility**: Show/hide UI elements based on current phase
- **Animation cleanup**: Stop active animations during state transitions

### Board Editor Operations
- **localhost only**: Editor automatically redirects on non-localhost access
- **Export functionality**: Generate updated boards.js and deadstones.js files
- **Visual editing**: Click-based stone placement with undo/redo support
- **Territory preview**: Real-time scoring display during editing

This codebase represents a sophisticated multiplayer game with careful attention to real-time synchronization, accurate territory scoring, modular architecture, and responsive UI state management.