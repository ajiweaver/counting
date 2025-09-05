// Scoring Functions

// Territory scoring using lightvector/goscorer
function calculateTerritoryScore(board_raw, deadstones_raw) {
    // Convert our internal board representation to goscorer format
    stones = convertBoardStringToStones(board_raw);
    deadstones = convertDeadStoneStringToObject(deadstones_raw);
    
    const ysize = stones.length;
    const xsize = stones[0].length;
    
    // Create markedDead array using deadstones.js data
    const markedDead = Array.from({length: ysize}, () => Array.from({length: xsize}, () => false));
    
    // If we have a board number and dead stones data, use it
    if (typeof deadstones !== 'undefined' && deadstones) {
        
        for (let y = 0; y < ysize; y++) {
            const col = deadstones[y];
            for (let x = 0; x < xsize; x++) {
                // A 1 in deadstones.js represents dead stones (both black and white)
                if (col[x] === 1) {
                    markedDead[x][y] = true;
                }
            }
        }
    }
    
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
        scoreMagnitude: Math.abs(difference)
    };
}

// Area scoring using stones + territory (Chinese style)
function calculateAreaScore(board_raw, deadstones_raw) {
    // First get territory score
    const territoryScore = calculateTerritoryScore(board_raw, deadstones_raw);
    
    // Convert board to goscorer format for stone counting
    const stones = convertBoardStringToStones(board_raw);
    const deadstones = convertDeadStoneStringToObject(deadstones_raw);
    
    const ysize = stones.length;
    const xsize = stones[0].length;
    
    // Create markedDead array using deadstones.js data
    const markedDead = Array.from({length: ysize}, () => Array.from({length: xsize}, () => false));
    
    // If we have dead stones data, use it
    if (typeof deadstones !== 'undefined' && deadstones) {
        for (let y = 0; y < ysize; y++) {
            const col = deadstones[y];
            for (let x = 0; x < xsize; x++) {
                // A 1 in deadstones.js represents dead stones (both black and white)
                if (col[x] === 1) {
                    markedDead[x][y] = true;
                }
            }
        }
    }
    
    // Count living stones (not marked dead) using the area scoring formula
    const non_deadstones = stones.map((row, i) => 
        row.map((val, j) => val * !markedDead[i][j])
    );
    const blackStonesAlive = non_deadstones.reduce((x, y) => 
        x + y.reduce((z, value) => value === window.BLACK ? z + 1 : z, 0), 0
    );
    const whiteStonesAlive = non_deadstones.reduce((x, y) => 
        x + y.reduce((z, value) => value === window.WHITE ? z + 1 : z, 0), 0
    );
    
    // Area = living stones + territory
    const blackArea = blackStonesAlive + territoryScore.blackTerritory;
    const whiteArea = whiteStonesAlive + territoryScore.whiteTerritory;
    const areaDifference = blackArea - whiteArea;
    
    console.log('📊 Area Scoring Calculation:');
    console.log('   - Black Stones Alive:', blackStonesAlive);
    console.log('   - White Stones Alive:', whiteStonesAlive);
    console.log('   - Black Territory:', territoryScore.blackTerritory);
    console.log('   - White Territory:', territoryScore.whiteTerritory);
    console.log('   - Black Area Total:', blackArea, '(', blackStonesAlive, 'stones +', territoryScore.blackTerritory, 'territory)');
    console.log('   - White Area Total:', whiteArea, '(', whiteStonesAlive, 'stones +', territoryScore.whiteTerritory, 'territory)');
    console.log('   - Area Difference:', areaDifference);
    
    return {
        blackArea,
        whiteArea,
        blackStonesAlive,
        whiteStonesAlive,
        blackTerritory: territoryScore.blackTerritory,
        whiteTerritory: territoryScore.whiteTerritory,
        difference: areaDifference, // Positive if black has more area, negative if white
        winningColor: areaDifference > 0 ? 'black' : areaDifference < 0 ? 'white' : 'tie',
        scoreMagnitude: Math.abs(areaDifference)
    };
}


//function generateScoreChoices(correctScore, winningColor) {
    //// Generate 4 choices: 1 correct + 3 wrong
    //const choices = [];
    //const correctDiff = Math.abs(correctScore);
    
    //// Add correct answer
    //choices.push(correctDiff);
    
    //// Generate 3 different wrong answers
    //const wrongChoices = new Set();
    
    //// Strategy: Create varied wrong answers around the correct one
    //const variations = [
        //correctDiff - 3, correctDiff - 2, correctDiff - 1,
        //correctDiff + 1, correctDiff + 2, correctDiff + 3,
        //Math.max(1, correctDiff - 4), Math.max(1, correctDiff + 4),
        //Math.max(1, Math.floor(correctDiff / 2)),
        //correctDiff * 2
    //];
    
    //// Add variations that are different from correct answer
    //for (const variation of variations) {
        //if (variation !== correctDiff && variation > 0 && wrongChoices.size < 3) {
            //wrongChoices.add(variation);
        //}
    //}
    
    //// If we don't have enough wrong choices, add some random ones
    //while (wrongChoices.size < 3) {
        //const randomChoice = Math.max(1, correctDiff + Math.floor(Math.random() * 10) - 5);
        //if (randomChoice !== correctDiff) {
            //wrongChoices.add(randomChoice);
        //}
    //}
    
    //// Add wrong choices to array
    //choices.push(...Array.from(wrongChoices).slice(0, 3));
    
    //// Shuffle the choices
    //for (let i = choices.length - 1; i > 0; i--) {
        //const j = Math.floor(Math.random() * (i + 1));
        //[choices[i], choices[j]] = [choices[j], choices[i]];
    //}
    
    //return choices;
//}

//function formatScoreAnswer(colorValue, difference) {
    //const color = colorValue === 1 ? 'B' : 'W';
    //return `${color}+${difference}`;
//}

//function validateHardModeAnswer(selectedColorValue, selectedDifference, correctScore) {
    //// Calculate what the player's answer represents
    //const playerAnswer = selectedColorValue * selectedDifference;
    
    //// Check if it matches the correct score (considering sign)
    //return playerAnswer === correctScore;
//}

// Export functions for global access
window.calculateTerritoryScore = calculateTerritoryScore;
window.calculateAreaScore = calculateAreaScore;
//window.generateScoreChoices = generateScoreChoices;
//window.formatScoreAnswer = formatScoreAnswer;
//window.validateHardModeAnswer = validateHardModeAnswer;
