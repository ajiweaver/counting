// Board Editor for Count Battle - Localhost Only
// This editor allows visual editing of boards.js Go positions

// Check if running on localhost (more comprehensive check)
function isLocalhost() {
    const hostname = window.location.hostname;
    const localhostPatterns = [
        'localhost',
        '127.0.0.1',
        '::1',
        '0.0.0.0'
    ];
    
    // Check exact matches
    if (localhostPatterns.includes(hostname)) {
        return true;
    }
    
    // Check for local IP ranges (192.168.x.x, 10.x.x.x, etc.)
    if (hostname.startsWith('192.168.') || 
        hostname.startsWith('10.') || 
        hostname.startsWith('172.')) {
        return true;
    }
    
    // Check for file:// protocol (local file access)
    if (window.location.protocol === 'file:') {
        return true;
    }
    
    return false;
}

if (!isLocalhost()) {
    console.log('Board editor is only available on localhost. Current hostname:', window.location.hostname);
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 3000);
} else {
    // Hide the warning and show the editor
    document.getElementById('localhost-check').style.display = 'none';
    document.getElementById('editor-interface').style.display = 'block';
}

// Global variables
let boardsArray = [];
let deadStonesArray = [];
let currentBoardIndex = 0;
let currentTool = 'black'; // black, white, empty, dead
let modifiedBoards = new Set();
let deadStonePositions = {}; // Maps board index to set of dead positions "x,y"
let undoStack = [];
let redoStack = [];
let canvas;
let boardSize = 400;
let cellSize;
let hardMode = false;

// Board editing state
let originalBoardsData;
let originalDeadStonesData;
let originalBoardsHardData;
let originalDeadStonesHardData;

// Initialize the editor
function initializeEditor() {
    console.log('🎨 Initializing Board Editor...');
    
    // Parse boards.js data
    if (typeof boards !== 'undefined') {
        originalBoardsData = [...boards].filter(board => board.trim());
        console.log(`📋 Loaded ${originalBoardsData.length} normal boards`);
    } else {
        console.error('❌ boards.js not loaded');
        return;
    }
    
    // Parse boards_hard.js data if available
    if (typeof boardsHard !== 'undefined') {
        originalBoardsHardData = [...boardsHard].filter(board => board.trim());
        console.log(`📋 Loaded ${originalBoardsHardData.length} hard boards`);
    } else {
        console.warn('⚠️ boards_hard.js not loaded');
        originalBoardsHardData = [...originalBoardsData]; // Fallback to normal boards
    }
    
    // Parse deadstones.js data if available
    if (typeof deadStones !== 'undefined') {
        originalDeadStonesData = [...deadStones].filter(stones => stones.trim());
        console.log(`🪦 Loaded ${originalDeadStonesData.length} normal dead stone patterns`);
    }
    
    // Parse deadstones_hard.js data if available
    if (typeof deadStonesHard !== 'undefined') {
        originalDeadStonesHardData = [...deadStonesHard].filter(stones => stones.trim());
        console.log(`🪦 Loaded ${originalDeadStonesHardData.length} hard dead stone patterns`);
    } else {
        console.warn('⚠️ deadstones_hard.js not loaded');
        originalDeadStonesHardData = [...originalDeadStonesData]; // Fallback to normal deadstones
    }
    
    // Initialize with normal mode
    switchMode(false);
    
    // Update UI
    updateBoardCounter();
    setupEventListeners();
    setupKeyboardShortcuts();
    
    // Load first board
    loadBoard(0);
    updateStatus();
    
    // Initialize score display with a small delay to ensure goscorer is loaded
    setTimeout(() => {
        updateScoreDisplay();
    }, 100);
    
    console.log('✅ Board Editor initialized successfully');
}

// Switch between normal and hard mode
function switchMode(isHardMode) {
    hardMode = isHardMode;
    
    // Clear current state
    undoStack = [];
    redoStack = [];
    modifiedBoards.clear();
    deadStonePositions = {};
    
    // Set current arrays based on mode
    if (hardMode) {
        boardsArray = [...originalBoardsHardData];
        deadStonesArray = [...originalDeadStonesHardData];
        console.log(`🔥 Switched to Hard Mode - ${boardsArray.length} boards`);
    } else {
        boardsArray = [...originalBoardsData];
        deadStonesArray = [...originalDeadStonesData];
        console.log(`✨ Switched to Normal Mode - ${boardsArray.length} boards`);
    }
    
    // Reset to first board
    currentBoardIndex = 0;
    document.getElementById('current-board').value = 0;
    
    // Initialize dead stone positions from current mode data
    initializeDeadStonePositions();
    
    // Update UI
    updateBoardCounter();
    updateStatus();
    updateScoreDisplay();
    loadBoard(currentBoardIndex);
    updateUndoRedoButtons();
}

// Initialize dead stone positions from deadStones data
function initializeDeadStonePositions() {
    deadStonePositions = {};
    
    deadStonesArray.forEach((deadPattern, boardIndex) => {
        if (!deadPattern || !deadPattern.trim()) return;
        
        const deadBoard = parseBoard(deadPattern);
        const deadSet = new Set();
        
        for (let y = 0; y < deadBoard.length; y++) {
            for (let x = 0; x < deadBoard[y].length; x++) {
                if (deadBoard[y][x] === 'y') { // 'y' marks dead stones in deadstones.js
                    deadSet.add(`${x},${y}`);
                }
            }
        }
        
        if (deadSet.size > 0) {
            deadStonePositions[boardIndex] = deadSet;
        }
    });
    
    console.log(`🪦 Initialized dead positions for ${Object.keys(deadStonePositions).length} boards`);
}

// Parse a board string into 2D array
function parseBoard(boardString) {
    const lines = boardString.trim().split('\n').filter(line => line.trim());
    return lines.map(line => line.split(''));
}

// Convert 2D array back to board string
function boardToString(board2D) {
    return board2D.map(row => row.join('')).join('\n');
}

// Load a specific board
function loadBoard(index) {
    if (index < 0 || index >= boardsArray.length) {
        console.warn(`Invalid board index: ${index}`);
        return;
    }
    
    currentBoardIndex = index;
    document.getElementById('current-board').value = index;
    
    // Don't save undo state when just loading a board
    
    // Update navigation buttons
    document.getElementById('prev-board').disabled = index === 0;
    document.getElementById('next-board').disabled = index === boardsArray.length - 1;
    
    // Update modified indicator
    const boardCounter = document.getElementById('board-total');
    if (modifiedBoards.has(index)) {
        boardCounter.innerHTML = `of ${boardsArray.length} <span class="modified">(modified)</span>`;
    } else {
        boardCounter.innerHTML = `of ${boardsArray.length}`;
    }
    
    // Trigger redraw if p5.js is ready
    if (typeof redraw !== 'undefined') {
        redraw();
    }
    
    // Update score display
    updateScoreDisplay();
    
    console.log(`📋 Loaded board ${index}`);
}

// Save current state for undo functionality
function saveStateForUndo() {
    // Deep copy dead stone positions for current board
    const currentDeadStones = deadStonePositions[currentBoardIndex] ? 
        new Set(deadStonePositions[currentBoardIndex]) : null;
    
    undoStack.push({
        boardIndex: currentBoardIndex,
        boardData: boardsArray[currentBoardIndex],
        deadStonesData: deadStonesArray[currentBoardIndex],
        deadStonePositions: currentDeadStones,
        modifiedBoards: new Set(modifiedBoards)
    });
    
    // Limit undo stack size
    if (undoStack.length > 50) {
        undoStack.shift();
    }
    
    // Clear redo stack when new action is performed
    redoStack = [];
    updateUndoRedoButtons();
}

// Undo last action
function undoAction() {
    if (undoStack.length === 0) return;
    
    // Save current state to redo stack
    const currentDeadStones = deadStonePositions[currentBoardIndex] ? 
        new Set(deadStonePositions[currentBoardIndex]) : null;
    
    const currentState = {
        boardIndex: currentBoardIndex,
        boardData: boardsArray[currentBoardIndex],
        deadStonesData: deadStonesArray[currentBoardIndex],
        deadStonePositions: currentDeadStones,
        modifiedBoards: new Set(modifiedBoards)
    };
    
    redoStack.push(currentState);
    
    // Restore previous state
    const previousState = undoStack.pop();
    currentBoardIndex = previousState.boardIndex;
    boardsArray[currentBoardIndex] = previousState.boardData;
    deadStonesArray[currentBoardIndex] = previousState.deadStonesData;
    
    // Restore dead stone positions
    if (previousState.deadStonePositions) {
        deadStonePositions[currentBoardIndex] = new Set(previousState.deadStonePositions);
    } else {
        delete deadStonePositions[currentBoardIndex];
    }
    
    modifiedBoards = previousState.modifiedBoards;
    
    loadBoard(currentBoardIndex);
    updateStatus();
    updateScoreDisplay();
    updateUndoRedoButtons();
}

// Redo last undone action
function redoAction() {
    if (redoStack.length === 0) return;
    
    // Save current state to undo stack
    const currentDeadStones = deadStonePositions[currentBoardIndex] ? 
        new Set(deadStonePositions[currentBoardIndex]) : null;
    
    const currentState = {
        boardIndex: currentBoardIndex,
        boardData: boardsArray[currentBoardIndex],
        deadStonesData: deadStonesArray[currentBoardIndex],
        deadStonePositions: currentDeadStones,
        modifiedBoards: new Set(modifiedBoards)
    };
    
    undoStack.push(currentState);
    
    // Restore next state
    const nextState = redoStack.pop();
    currentBoardIndex = nextState.boardIndex;
    boardsArray[currentBoardIndex] = nextState.boardData;
    deadStonesArray[currentBoardIndex] = nextState.deadStonesData;
    
    // Restore dead stone positions
    if (nextState.deadStonePositions) {
        deadStonePositions[currentBoardIndex] = new Set(nextState.deadStonePositions);
    } else {
        delete deadStonePositions[currentBoardIndex];
    }
    
    modifiedBoards = nextState.modifiedBoards;
    
    loadBoard(currentBoardIndex);
    updateStatus();
    updateScoreDisplay();
    updateUndoRedoButtons();
}

// Update undo/redo button states
function updateUndoRedoButtons() {
    document.getElementById('undo').disabled = undoStack.length === 0;
    document.getElementById('redo').disabled = redoStack.length === 0;
}

// Edit stone at position
function editStone(x, y, newValue) {
    const board2D = parseBoard(boardsArray[currentBoardIndex]);
    
    if (y >= 0 && y < board2D.length && x >= 0 && x < board2D[y].length) {
        const oldValue = board2D[y][x];
        if (oldValue !== newValue) {
            // Save state before making changes
            saveStateForUndo();
            
            board2D[y][x] = newValue;
            boardsArray[currentBoardIndex] = boardToString(board2D);
            
            // If removing a stone (setting to empty), also remove any dead stone marking
            if (newValue === '.') {
                const posKey = `${x},${y}`;
                const deadSet = deadStonePositions[currentBoardIndex];
                if (deadSet && deadSet.has(posKey)) {
                    deadSet.delete(posKey);
                    // Clean up empty sets
                    if (deadSet.size === 0) {
                        delete deadStonePositions[currentBoardIndex];
                    }
                    // Update deadStonesArray in real-time
                    updateDeadStonesArray();
                }
            }
            
            modifiedBoards.add(currentBoardIndex);
            
            updateStatus();
            updateScoreDisplay();
            loadBoard(currentBoardIndex); // Refresh display
        }
    }
}

// Toggle dead stone status at position
function toggleDeadStone(x, y) {
    const board2D = parseBoard(boardsArray[currentBoardIndex]);
    
    if (y >= 0 && y < board2D.length && x >= 0 && x < board2D[y].length) {
        const stone = board2D[y][x];
        if (stone === 'x' || stone === 'o') { // Only mark existing stones as dead
            // Save state before making changes
            saveStateForUndo();
            
            const posKey = `${x},${y}`;
            
            if (!deadStonePositions[currentBoardIndex]) {
                deadStonePositions[currentBoardIndex] = new Set();
            }
            
            const deadSet = deadStonePositions[currentBoardIndex];
            if (deadSet.has(posKey)) {
                deadSet.delete(posKey);
            } else {
                deadSet.add(posKey);
            }
            
            // Clean up empty sets
            if (deadSet.size === 0) {
                delete deadStonePositions[currentBoardIndex];
            }
            
            // Update deadStonesArray in real-time
            updateDeadStonesArray();
            
            modifiedBoards.add(currentBoardIndex);
            updateStatus();
            updateScoreDisplay();
            loadBoard(currentBoardIndex); // Refresh display
        }
    }
}

// Update deadStonesArray from current deadStonePositions
function updateDeadStonesArray() {
    // Ensure deadStonesArray has the same length as boardsArray
    while (deadStonesArray.length < boardsArray.length) {
        deadStonesArray.push(Array(9).fill('.'.repeat(9)).join('\n'));
    }
    
    // Update the current board's dead stones pattern
    const deadSet = deadStonePositions[currentBoardIndex];
    
    if (deadSet && deadSet.size > 0) {
        // Create a 9x9 board pattern for dead stones
        const deadBoard = Array(9).fill(null).map(() => Array(9).fill('.'));
        
        deadSet.forEach(posKey => {
            const [x, y] = posKey.split(',').map(Number);
            if (x >= 0 && x < 9 && y >= 0 && y < 9) {
                deadBoard[y][x] = 'y'; // Use 'y' to mark dead stones
            }
        });
        
        const deadPattern = deadBoard.map(row => row.join('')).join('\n');
        deadStonesArray[currentBoardIndex] = deadPattern;
    } else {
        // Empty pattern for boards with no dead stones
        deadStonesArray[currentBoardIndex] = Array(9).fill('.'.repeat(9)).join('\n');
    }
}

// Clear current board
function clearBoard() {
    if (confirm('Clear all stones from this board?')) {
        const board2D = parseBoard(boardsArray[currentBoardIndex]);
        const clearedBoard = board2D.map(row => row.map(() => '.'));
        boardsArray[currentBoardIndex] = boardToString(clearedBoard);
        
        // Clear dead stones for this board too
        delete deadStonePositions[currentBoardIndex];
        updateDeadStonesArray();
        
        modifiedBoards.add(currentBoardIndex);
        
        updateStatus();
        updateScoreDisplay();
        loadBoard(currentBoardIndex);
    }
}

// Reset current board to original
function resetBoard() {
    if (confirm('Reset this board to original state?')) {
        boardsArray[currentBoardIndex] = originalBoardsData[currentBoardIndex];
        
        // Reset dead stones to original state
        if (originalDeadStonesData[currentBoardIndex]) {
            deadStonesArray[currentBoardIndex] = originalDeadStonesData[currentBoardIndex];
            // Re-initialize dead stone positions from original data
            const deadBoard = parseBoard(originalDeadStonesData[currentBoardIndex]);
            const deadSet = new Set();
            
            for (let y = 0; y < deadBoard.length; y++) {
                for (let x = 0; x < deadBoard[y].length; x++) {
                    if (deadBoard[y][x] === 'y') {
                        deadSet.add(`${x},${y}`);
                    }
                }
            }
            
            if (deadSet.size > 0) {
                deadStonePositions[currentBoardIndex] = deadSet;
            } else {
                delete deadStonePositions[currentBoardIndex];
            }
        } else {
            delete deadStonePositions[currentBoardIndex];
            updateDeadStonesArray();
        }
        
        modifiedBoards.delete(currentBoardIndex);
        
        updateStatus();
        updateScoreDisplay();
        loadBoard(currentBoardIndex);
    }
}

// Reset all boards to original
function resetAllBoards() {
    if (confirm('Reset ALL boards to original state? This will lose all changes!')) {
        boardsArray = [...originalBoardsData];
        deadStonesArray = [...originalDeadStonesData];
        modifiedBoards.clear();
        
        // Re-initialize dead stone positions from original data
        initializeDeadStonePositions();
        
        updateStatus();
        updateScoreDisplay();
        loadBoard(currentBoardIndex);
    }
}

// Update board counter display
function updateBoardCounter() {
    document.getElementById('board-total').textContent = `of ${boardsArray.length}`;
}

// Update status message
function updateStatus() {
    const status = document.getElementById('status');
    const modifiedCount = modifiedBoards.size;
    
    if (modifiedCount === 0) {
        status.textContent = 'Ready - No changes made';
        status.className = 'status';
    } else {
        status.textContent = `${modifiedCount} board${modifiedCount === 1 ? '' : 's'} modified`;
        status.className = 'status modified';
    }
}

// Export boards.js file
function exportBoardsJS() {
    const filename = hardMode ? 'boards_hard.js' : 'boards.js';
    const variableName = hardMode ? 'boardsHard' : 'boards';
    
    console.log(`📁 Exporting ${filename} with ${boardsArray.length} boards`);
    console.log('📋 Current board index:', currentBoardIndex);
    console.log('📋 Current board content:', boardsArray[currentBoardIndex]);
    
    const boardsContent = `\n${variableName}=\`\n\n${boardsArray.join('\n\n')}\n\n\`.trim().split('\\n\\n')`;
    console.log(`📁 About to call downloadEditorFile with filename: ${filename}`);
    downloadEditorFile(filename, boardsContent);
    console.log(`📁 Called downloadEditorFile, export complete`);
}

// Export deadstones.js file  
function exportDeadStonesJS() {
    const filename = hardMode ? 'deadstones_hard.js' : 'deadstones.js';
    const variableName = hardMode ? 'deadStonesHard' : 'deadStones';
    
    console.log(`🪦 Exporting ${filename} with ${boardsArray.length} boards`);
    console.log('🪦 Current board dead positions:', deadStonePositions[currentBoardIndex]);
    console.log('🪦 Total boards with dead stones:', Object.keys(deadStonePositions).length);
    
    // Use the already updated deadStonesArray
    const deadStonesContent = `\nwindow.${variableName}=\`\n\n${deadStonesArray.join('\n\n')}\n\n\`.trim().split('\\n\\n');`;
    console.log('🪦 Current board dead stones pattern:');
    console.log(deadStonesArray[currentBoardIndex]);
    console.log(`🪦 About to call downloadEditorFile with filename: ${filename}`);
    downloadEditorFile(filename, deadStonesContent);
    console.log(`🪦 Called downloadEditorFile, export complete`);
}

// Export both files
function exportBothFiles() {
    exportBoardsJS();
    setTimeout(() => exportDeadStonesJS(), 500); // Small delay to avoid browser blocking
}

// Copy boards data to clipboard
function copyToClipboard() {
    const boardsContent = boardsArray.join('\n\n');
    navigator.clipboard.writeText(boardsContent).then(() => {
        alert('Board data copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy to clipboard:', err);
        // Fallback: select text in a temporary textarea
        const textarea = document.createElement('textarea');
        textarea.value = boardsContent;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Board data copied to clipboard!');
    });
}

// Download file helper
function downloadEditorFile(filename, content) {
    console.log('📁 Download filename:', filename);
    console.log('📁 Content length:', content.length);
    
    const blob = new Blob([content], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.getElementById('prev-board').addEventListener('click', () => {
        if (currentBoardIndex > 0) {
            loadBoard(currentBoardIndex - 1);
        }
    });
    
    document.getElementById('next-board').addEventListener('click', () => {
        if (currentBoardIndex < boardsArray.length - 1) {
            loadBoard(currentBoardIndex + 1);
        }
    });
    
    document.getElementById('jump-to').addEventListener('click', () => {
        const index = parseInt(document.getElementById('current-board').value);
        if (index >= 0 && index < boardsArray.length) {
            loadBoard(index);
        }
    });
    
    document.getElementById('current-board').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const index = parseInt(e.target.value);
            if (index >= 0 && index < boardsArray.length) {
                loadBoard(index);
            }
        }
    });
    
    // Hard mode toggle
    document.getElementById('hard-mode-toggle').addEventListener('change', (e) => {
        switchMode(e.target.checked);
    });
    
    // Tools
    document.getElementById('tool-black').addEventListener('click', () => setTool('black'));
    document.getElementById('tool-white').addEventListener('click', () => setTool('white'));
    document.getElementById('tool-empty').addEventListener('click', () => setTool('empty'));
    document.getElementById('tool-dead').addEventListener('click', () => setTool('dead'));
    
    // Actions
    document.getElementById('clear-board').addEventListener('click', clearBoard);
    document.getElementById('undo').addEventListener('click', undoAction);
    document.getElementById('redo').addEventListener('click', redoAction);
    document.getElementById('reset-board').addEventListener('click', resetBoard);
    document.getElementById('reset-all').addEventListener('click', resetAllBoards);
    
    // Export
    document.getElementById('export-boards').addEventListener('click', exportBoardsJS);
    document.getElementById('export-deadstones').addEventListener('click', exportDeadStonesJS);
    document.getElementById('export-both').addEventListener('click', exportBothFiles);
    document.getElementById('copy-clipboard').addEventListener('click', copyToClipboard);
}

// Set current tool
function setTool(tool) {
    currentTool = tool;
    
    // Update button states
    document.querySelectorAll('[id^="tool-"]').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tool-${tool}`).classList.add('active');
    
    console.log(`🔧 Tool set to: ${tool}`);
}

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ignore if typing in input field
        if (e.target.tagName === 'INPUT') return;
        
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                if (currentBoardIndex > 0) loadBoard(currentBoardIndex - 1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (currentBoardIndex < boardsArray.length - 1) loadBoard(currentBoardIndex + 1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                loadBoard(Math.max(0, currentBoardIndex - 10));
                break;
            case 'ArrowDown':
                e.preventDefault();
                loadBoard(Math.min(boardsArray.length - 1, currentBoardIndex + 10));
                break;
            case '1':
            case 'b':
            case 'B':
                e.preventDefault();
                setTool('black');
                break;
            case '2':
            case 'w':
            case 'W':
                e.preventDefault();
                setTool('white');
                break;
            case '0':
            case ' ':
                e.preventDefault();
                setTool('empty');
                break;
            case '3':
            case 'd':
            case 'D':
                e.preventDefault();
                setTool('dead');
                break;
            case 'z':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    undoAction();
                }
                break;
            case 'y':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    redoAction();
                }
                break;
            case 's':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    exportBothFiles();
                }
                break;
        }
    });
}

// p5.js setup function
function setup() {
    // Create canvas in the board container
    const container = document.getElementById('board-canvas');
    canvas = createCanvas(boardSize, boardSize);
    canvas.parent(container);
    
    // Calculate cell size for 9x9 board
    cellSize = boardSize / 9;
    
    console.log('🎨 p5.js canvas created');
}

// p5.js draw function
function draw() {
    background(220, 179, 92); // Go board color
    
    // Draw board lines
    stroke(0);
    strokeWeight(1);
    
    for (let i = 0; i < 9; i++) {
        // Vertical lines
        line(cellSize * i + cellSize/2, cellSize/2, cellSize * i + cellSize/2, height - cellSize/2);
        // Horizontal lines
        line(cellSize/2, cellSize * i + cellSize/2, width - cellSize/2, cellSize * i + cellSize/2);
    }
    
    // Draw star points
    fill(0);
    noStroke();
    const starPoints = [[2,2], [2,6], [6,2], [6,6], [4,4]];
    starPoints.forEach(([x, y]) => {
        circle(x * cellSize + cellSize/2, y * cellSize + cellSize/2, 6);
    });
    
    // Draw stones
    if (currentBoardIndex < boardsArray.length) {
        const board2D = parseBoard(boardsArray[currentBoardIndex]);
        const deadSet = deadStonePositions[currentBoardIndex] || new Set();
        
        for (let y = 0; y < board2D.length; y++) {
            for (let x = 0; x < board2D[y].length; x++) {
                const stone = board2D[y][x];
                const centerX = x * cellSize + cellSize/2;
                const centerY = y * cellSize + cellSize/2;
                const stoneRadius = cellSize * 0.45;
                const isDead = deadSet.has(`${x},${y}`);
                
                if (stone === 'x') {
                    // Black stone
                    fill(0);
                    stroke(isDead ? 200 : 50);
                    strokeWeight(isDead ? 3 : 1);
                    circle(centerX, centerY, stoneRadius * 2);
                    
                    // Add red X for dead stones
                    if (isDead) {
                        stroke(255, 50, 50);
                        strokeWeight(3);
                        const crossSize = stoneRadius * 0.6;
                        line(centerX - crossSize, centerY - crossSize, centerX + crossSize, centerY + crossSize);
                        line(centerX - crossSize, centerY + crossSize, centerX + crossSize, centerY - crossSize);
                    }
                } else if (stone === 'o') {
                    // White stone
                    fill(255);
                    stroke(isDead ? 200 : 0);
                    strokeWeight(isDead ? 3 : 1);
                    circle(centerX, centerY, stoneRadius * 2);
                    
                    // Add red X for dead stones
                    if (isDead) {
                        stroke(255, 50, 50);
                        strokeWeight(3);
                        const crossSize = stoneRadius * 0.6;
                        line(centerX - crossSize, centerY - crossSize, centerX + crossSize, centerY + crossSize);
                        line(centerX - crossSize, centerY + crossSize, centerX + crossSize, centerY - crossSize);
                    }
                }
            }
        }
    }
}

// p5.js mouse click handler
function mousePressed() {
    if (mouseX >= 0 && mouseX < width && mouseY >= 0 && mouseY < height) {
        const gridX = Math.floor(mouseX / cellSize);
        const gridY = Math.floor(mouseY / cellSize);
        
        if (currentTool === 'dead') {
            // Handle dead stone marking
            toggleDeadStone(gridX, gridY);
        } else {
            // Determine what to place based on current tool and mouse button
            let newValue;
            if (mouseButton === RIGHT) {
                newValue = '.'; // Right click always removes
            } else {
                switch (currentTool) {
                    case 'black': newValue = 'x'; break;
                    case 'white': newValue = 'o'; break;
                    case 'empty': newValue = '.'; break;
                    default: newValue = '.';
                }
            }
            
            editStone(gridX, gridY, newValue);
        }
        return false; // Prevent context menu
    }
}

// Prevent context menu on right click
function contextMenu(e) {
    e.preventDefault();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on localhost (use the enhanced check)
    if (isLocalhost()) {
        // Wait for boards.js to load
        setTimeout(initializeEditor, 100);
    }
});

// Prevent context menu
document.addEventListener('contextmenu', contextMenu);

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

// Territory scoring using lightvector/goscorer
function calculateTerritoryScore(board, deadStones) {
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

    const ysize = stones.length;
    const xsize = stones[0].length;

    // Create markedDead array using deadstones.js data
    const markedDead = markDeadStones(deadStones);

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

function markDeadStones(deadStones){

    const deadStoneLines = deadStones.split('\n').map(row => row.trim()).filter(row => row !== '');

    const ysize = deadStoneLines.length;
    const xsize = deadStoneLines[0].length;
    const markedDead = Array.from({length: ysize}, () => Array.from({length: xsize}, () => false));

    // If we have a board number and dead stones data, use it
    if (typeof deadStones !== 'undefined' && deadStones) {

        for (let y = 0; y < Math.min(ysize, deadStoneLines.length); y++) {
            const row = deadStoneLines[y];
            for (let x = 0; x < Math.min(xsize, row.length); x++) {
                // 'y' in deadstones.js represents dead stones (both black and white)
                if (row[x] === 'y') {
                    markedDead[y][x] = true;
                }
            }
        }
    }

    return(markedDead)
}

// Calculate and update score display
function updateScoreDisplay() {
    if (currentBoardIndex < boardsArray.length && typeof window.territoryScoring !== 'undefined') {
        try {
            const boardString = boardsArray[currentBoardIndex];
            const deadStonesString = deadStonesArray[currentBoardIndex];
            const score = calculateTerritoryScore(boardString, deadStonesString);
            
            // Calculate stone counts for validation
            let stones;
            
            stones = convertBoardStringToStones(boardString);
            
            // Count stones using the provided formulas
            const blackStones = stones.reduce((x, y) => x + y.reduce((z, value) => value === window.BLACK ? z + 1 : z, 0), 0);
            const whiteStones = stones.reduce((x, y) => x + y.reduce((z, value) => value === window.WHITE ? z + 1 : z, 0), 0);

            // Count stones in territory for chinese counting
            const markedDead = markDeadStones(deadStonesString);
            const non_deadstones = stones.map((row, i) => row.map((val, j) => val * !markedDead[i][j]));
            const blackStonesInTerritory = non_deadstones.reduce((x, y) => x + y.reduce((z, value) => value === window.BLACK ? z + 1 : z, 0), 0);
            const whiteStonesInTerritory = non_deadstones.reduce((x, y) => x + y.reduce((z, value) => value === window.WHITE ? z + 1 : z, 0), 0);
            const scoreWhiteArea = blackStonesInTerritory + score.blackTerritory;
            const scoreBlackArea = whiteStonesInTerritory + score.whiteTerritory;
            const scoreAreaDifference = scoreBlackArea - scoreWhiteArea;
            
            // Create stone count warning if counts differ
            const stoneCountWarning = blackStones !== whiteStones ? 
                `<div style="background: #ff6b6b; color: white; padding: 5px; border-radius: 3px; margin: 5px 0; font-size: 12px;">
                    ⚠️ Stone Count Warning: Black=${blackStones}, White=${whiteStones} (diff: ${Math.abs(blackStones - whiteStones)})
                </div>` : '';
            const scoreMismatchWarning = scoreAreaDifference !== score.difference ? 
                `<div style="background: #ff6b6b; color: white; padding: 5px; border-radius: 3px; margin: 5px 0; font-size: 12px;">
                    ⚠️ Score Mismatch  Warning: Area=${scoreAreaDifference}, Territory=${score.difference}
                </div>` : '';
            
            const scoreContent = document.getElementById('score-content');
            scoreContent.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span style="color: #000; background: #fff; padding: 2px 6px; border-radius: 3px;">⚪ White: ${score.whiteTerritory}</span>
                    <span style="color: #fff; background: #000; padding: 2px 6px; border-radius: 3px;">⚫ Black: ${score.blackTerritory}</span>
                </div>

                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span style="color: #000; background: #fff; padding: 2px 6px; border-radius: 3px;">⚪ White: ${scoreWhiteArea} (area)</span>
                    <span style="color: #fff; background: #000; padding: 2px 6px; border-radius: 3px;">⚫ Black: ${scoreBlackArea} (area)</span>
                </div>

                <div style="margin: 5px 0; font-weight: bold; color: ${score.winningColor === 'black' ? '#000' : score.winningColor === 'white' ? '#fff' : '#888'};">
                    ${score.winningColor === 'tie' ? 'Tie Game' : (score.winningColor === 'black' ? '⚫ Black' : '⚪ White') + ' wins by ' + score.scoreDifference}
                </div>

                <div style="margin: 5px 0; font-weight: bold; color: ${scoreAreaDifference > 0 ? '#000' : scoreAreaDifference < 0 ? '#fff' : '#888'};">
                    ${scoreAreaDifference === 0 ? 'Tie Game' : (scoreAreaDifference > 0  ? '⚫ Black' : '⚪ White') + ' wins by ' + Math.abs(scoreAreaDifference)} (area)
                </div>
                ${stoneCountWarning}
                ${scoreMismatchWarning}
            `;
        } catch (error) {
            console.error('Error calculating score:', error);
            document.getElementById('score-content').innerHTML = '<span style="color: #f44336;">Error calculating score</span>';
        }
    } else {
        document.getElementById('score-content').innerHTML = '<span style="color: #888;">Goscorer not loaded</span>';
    }
}

console.log('🎨 Board Editor script loaded');
