// Board Editor for Counting Battle - Localhost Only
// This editor allows visual editing of boards.js Go positions

// Check if running on localhost
if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    console.log('Board editor is only available on localhost');
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

// Drawing variables
let R, D, halfStrokeWeight;
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
    if (typeof window.boards !== 'undefined') {
        originalBoardsData = [...window.boards].filter(board => board.trim());
        console.log(`📋 Loaded ${originalBoardsData.length} normal boards`);
    } else {
        console.error('❌ boards.js not loaded');
        return;
    }
    
    // Parse boards_hard.js data if available
    if (typeof window.boardsHard !== 'undefined') {
        originalBoardsHardData = [...window.boardsHard].filter(board => board.trim());
        console.log(`📋 Loaded ${originalBoardsHardData.length} hard boards`);
    } else {
        console.warn('⚠️ boards_hard.js not loaded');
        originalBoardsHardData = [...originalBoardsData]; // Fallback to normal boards
    }
    
    // Parse deadstones.js data if available
    if (typeof window.deadStones !== 'undefined') {
        originalDeadStonesData = [...window.deadStones].filter(stones => stones.trim());
        console.log(`🪦 Loaded ${originalDeadStonesData.length} normal dead stone patterns`);
    }
    
    // Parse deadstones_hard.js data if available
    if (typeof window.deadStonesHard !== 'undefined') {
        originalDeadStonesHardData = [...window.deadStonesHard].filter(stones => stones.trim());
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
    createCanvas();
    windowResized();
    
    ellipseMode(RADIUS);
    strokeCap(PROJECT);
    noStroke();
    
    // Don't start game automatically - wait for multiplayer lobby
}

// Handle window resize for board editor
function windowResized() {
    // Calculate basic drawing dimensions like main game
    R = floor(min(window.innerWidth/10, window.innerHeight/12)/2)-1;
    D = 2 * R;
    halfStrokeWeight = 1; // Basic stroke weight for board editor
    
    // Simple canvas sizing for board editor
    const canvasSize = min(window.innerWidth - 40, window.innerHeight - 200);
    resizeCanvas(canvasSize, canvasSize);
}

// p5.js draw function
function draw() {
    // Clear the canvas
    clear();
    
    // Only draw if we have a valid board to display
    if (currentBoardIndex >= 0 && currentBoardIndex < boardsArray.length) {
        // Draw the current board being edited
        drawGoBoard(boardsArray[currentBoardIndex], D, 2*D, D, R - halfStrokeWeight, 2*halfStrokeWeight, false);
        
        // Draw UI elements
        push();
        textSize(R);
        fill('white');
        textAlign(CENTER, CENTER);
        textFont('Arial');
        
        // Show board number
        const boardText = `Board ${currentBoardIndex + 1} of ${boardsArray.length}`;
        text(boardText, width/2, R);
        
        // Show modifications indicator
        if (modifications.length > 0) {
            fill('#ff6b6b');
            text('Modified', width/2, R + 30);
        }
        
        pop();
    }
}

// p5.js mouse click handler for board editor
function mousePressed() {
    // Handle board editor specific mouse clicks here if needed
    // For now, let other handlers process clicks
    
    // Don't prevent default behavior - allow other click handlers to work
    return false; // This allows event to bubble up to other handlers
}

// Prevent context menu on right click
function contextMenu(e) {
    e.preventDefault();
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Wait for boards.js to load
        setTimeout(initializeEditor, 100);
    }
});

// Prevent context menu
document.addEventListener('contextmenu', contextMenu);

// Calculate and update score display
function updateScoreDisplay() {
    if (currentBoardIndex < boardsArray.length && typeof window.territoryScoring !== 'undefined') {
        try {
            const score = calculateTerritoryScore(boardsArray[currentBoardIndex], deadStonesArray[currentBoardIndex]);
            
            const scoreContent = document.getElementById('score-content');
            scoreContent.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                    <span style="color: #000; background: #fff; padding: 2px 6px; border-radius: 3px;">⚪ White: ${score.whiteTerritory}</span>
                    <span style="color: #fff; background: #000; padding: 2px 6px; border-radius: 3px;">⚫ Black: ${score.blackTerritory}</span>
                </div>
                <div style="margin: 5px 0; font-weight: bold; color: ${score.winningColor === 'black' ? '#000' : score.winningColor === 'white' ? '#fff' : '#888'};">
                    ${score.winningColor === 'tie' ? 'Tie Game' : (score.winningColor === 'black' ? '⚫ Black' : '⚪ White') + ' wins by ' + score.scoreDifference}
                </div>
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
