// Board Logic
// Board transformations, conversions, and core board manipulation functions

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

function applyBoardTransformations(boardString, transforms) {
    if (!transforms) {
        return boardString; // No transformations, return original
    }
    
    const { flipX, flipY, transpose, invert } = transforms;
    const boardLines = boardString.split('\n').map(row => row.trim()).filter(row => row !== '');
    let textBoard = boardLines.map(row => row.split(''));
    
    // Create a new transformed board
    let transformedBoard = Array.from({length: textBoard.length}, () => new Array(textBoard[0].length));
    
    const width = textBoard[0].length;
    const height = textBoard.length;
    
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            let a = flipX ? width - 1 - x : x;
            let b = flipY ? height - 1 - y : y;
            if (transpose) [a, b] = [b, a];
            
            let piece = textBoard[b][a];
            if (invert) {
                // Invert colors: x<->o, keep dots
                if (piece === 'x') piece = 'o';
                else if (piece === 'o') piece = 'x';
            }
            
            transformedBoard[y][x] = piece;
        }
    }
    
    // Convert back to string format
    return transformedBoard.map(row => row.join('')).join('\n');
}

function convertDeadStoneStringToObject(boardString, flipX=false, flipY=false, transpose=false) {

    const deadStonesLines = boardString.split('\n').map(row => row.trim()).filter(row => row !== '');
    const textDeadStones = deadStonesLines.map(row => row.split(''));
    const deadStonesParser = {'y':1,'x':0,'o':0,'.':0}
    deadstones = {width: textDeadStones[0].length, height: textDeadStones.length};
    for (let x = 0; x < deadstones.width; x++) {
        deadstones[x] = {};
        for (let y = 0; y < deadstones.height; y++) {
            let a = flipX ? deadstones.width - 1 - x : x;
            let b = flipY ? deadstones.height - 1 - y : y;
            if (transpose) [a, b] = [b, a];
            deadstones[x][y] = deadStonesParser[textDeadStones[b][a]];
        }
    }

    return deadstones;
}

function getBoard(boardString){
    const boardLines = boardString.split('\n').map(row => row.trim()).filter(row => row !== '');
    const textBoard = boardLines.map(row => row.split(''));
    const boardArray = {width: textBoard[0].length, height: textBoard.length};
    const displayBoard = [];
    for (let bx = 0; bx < boardArray.width; bx++) {
        displayBoard[bx] = [];
        for (let by = 0; by < boardArray.height; by++) {
            const cell = textBoard[by][bx];
            if (cell === 'x') { 
                displayBoard[bx][by] = window.BLACK;
            } else if (cell === 'o') {
                displayBoard[bx][by] = window.WHITE;
            } else {
                displayBoard[bx][by] = 0; // Empty
            }
        }
    }

    // Add width and height properties required by drawGoBoard
    displayBoard.width = boardArray.width;
    displayBoard.height = boardArray.height;

    return displayBoard;
}

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

// Export functions for global access
window.convertBoardStringToStones = convertBoardStringToStones;
window.applyBoardTransformations = applyBoardTransformations;
window.convertDeadStoneStringToObject = convertDeadStoneStringToObject;

// Show available mock boards for development
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

window.setRealBoardId = function(boardId) {
    // If no boardId provided, randomly choose one
    if (boardId === undefined || boardId === null) {
        boardId = Math.floor(Math.random() * boards.length);
        console.log(`🎲 Randomly selected real board ID: ${boardId}`);
    }
    
    console.log(`🔄 Switching to real board ID: ${boardId}`);
    
    // Reset to real board data
    useMockData = false;
    
    // Set the specific board ID
    currentBoardNumber = boardId;
    
    console.log(`✅ Set to real board ${boardId}`);
    
    // Start a new round if in the right mode
    if (gameState.phase === 'playing') {
        // Force redraw by calling loadMultiplayerBoard
        loadMultiplayerBoard(boardId);
    }
};

window.getBoard = getBoard;
window.MOCK_BOARDS = MOCK_BOARDS;
