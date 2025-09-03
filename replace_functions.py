#!/usr/bin/env python3
"""
Script to replace functions in src/ files with those from backup/multiplayer.js
"""

import re
import os

def extract_function_from_backup(backup_content, function_name, start_line):
    """Extract a specific function from the backup file"""
    lines = backup_content.split('\n')
    
    if start_line > len(lines):
        return None
    
    # Find the actual function start (accounting for 0-based indexing)
    func_start = start_line - 1
    
    # Extract the full function body
    brace_count = 0
    func_lines = []
    started = False
    
    for i in range(func_start, len(lines)):
        line = lines[i]
        func_lines.append(line)
        
        # Count braces to find function end
        for char in line:
            if char == '{':
                brace_count += 1
                started = True
            elif char == '}':
                brace_count -= 1
                
        if started and brace_count == 0:
            break
    
    return '\n'.join(func_lines)

def find_function_in_file(file_content, function_name):
    """Find a function in a file and return its line number and body"""
    lines = file_content.split('\n')
    
    # Patterns for different function definition styles
    patterns = [
        rf'^(\s*)function\s+{function_name}\s*\([^)]*\)\s*\{{',
        rf'^(\s*)const\s+{function_name}\s*=\s*function\s*\([^)]*\)\s*\{{',
        rf'^(\s*)let\s+{function_name}\s*=\s*function\s*\([^)]*\)\s*\{{',
        rf'^(\s*)var\s+{function_name}\s*=\s*function\s*\([^)]*\)\s*\{{',
        rf'^(\s*)const\s+{function_name}\s*=\s*\([^)]*\)\s*=>\s*\{{',
        rf'^(\s*)let\s+{function_name}\s*=\s*\([^)]*\)\s*=>\s*\{{',
        rf'^(\s*){function_name}\s*:\s*function\s*\([^)]*\)\s*\{{',
        rf'^(\s*){function_name}\s*\([^)]*\)\s*\{{',
    ]
    
    for line_num, line in enumerate(lines, 1):
        for pattern in patterns:
            if re.match(pattern, line.strip()):
                # Extract the full function body
                func_body = extract_function_body(lines, line_num - 1)
                return line_num, func_body
    
    return None, None

def extract_function_body(lines, start_line):
    """Extract the complete function body including all nested braces"""
    if start_line >= len(lines):
        return ""
    
    brace_count = 0
    func_lines = []
    started = False
    
    for i in range(start_line, len(lines)):
        line = lines[i]
        func_lines.append(line)
        
        # Count braces to find function end
        for char in line:
            if char == '{':
                brace_count += 1
                started = True
            elif char == '}':
                brace_count -= 1
                
        if started and brace_count == 0:
            break
    
    return '\n'.join(func_lines)

def replace_function_in_file(file_path, function_name, new_function_body):
    """Replace a function in a file with new implementation"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return False
    
    line_num, old_function_body = find_function_in_file(content, function_name)
    
    if line_num is None:
        print(f"Function {function_name} not found in {file_path}")
        return False
    
    # Replace the old function with the new one
    new_content = content.replace(old_function_body, new_function_body)
    
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"✅ Replaced {function_name} in {file_path}")
        return True
    except Exception as e:
        print(f"Error writing {file_path}: {e}")
        return False

def add_function_to_file(file_path, function_body):
    """Add a new function to a file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Add the function at the end of the file
        new_content = content + '\n\n' + function_body + '\n'
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        return True
    except Exception as e:
        print(f"Error adding function to {file_path}: {e}")
        return False

def main():
    # Load backup file
    backup_file = 'backup/multiplayer.js'
    try:
        with open(backup_file, 'r', encoding='utf-8') as f:
            backup_content = f.read()
    except Exception as e:
        print(f"Error reading backup file: {e}")
        return
    
    print("🔄 Starting function replacement from backup/multiplayer.js to src/ files")
    print("=" * 80)
    
    # Define function mappings (backup_line: (src_file, function_name))
    different_implementations = {
        59: ('src/core/game-state.js', 'resetBoardResults'),
        71: ('src/ui/lobby-ui.js', 'enterSummaryMode'),
        934: ('src/utils/helpers.js', 'formatAnswerWithEmojis'),
        1585: ('src/multiplayer/socket-client.js', 'initSocket'),
        1769: ('src/ui/lobby-ui.js', 'showMainMenu'),
        1942: ('src/ui/lobby-ui.js', 'displayLeaderboardHistory'),
        2009: ('src/utils/helpers.js', 'getTimeAgo'),
        2022: ('src/utils/helpers.js', 'formatDuration'),
        2045: ('src/utils/storage.js', 'saveToStorage'),
        2193: ('src/utils/dev-tools.js', 'debugHardModeState'),
        2205: ('src/utils/storage.js', 'loadFromStorage'),
        2216: ('src/utils/storage.js', 'getPlayerUUID'),
        2227: ('src/utils/storage.js', 'clearRoomStorage'),
        2237: ('src/main.js', 'initializeUI'),
        2432: ('src/main.js', 'tryReconnectToRoom'),
        2523: ('src/ui/lobby-ui.js', 'createRoom'),
        2808: ('src/ui/lobby-ui.js', 'updateRoomSettingsDisplay'),
        2923: ('src/ui/lobby-ui.js', 'startGame'),
        2945: ('src/utils/helpers.js', 'copyRoomLink'),
        2983: ('src/utils/helpers.js', 'updateBrowserURL'),
        3003: ('src/utils/helpers.js', 'resetBrowserURL'),
        3017: ('src/utils/helpers.js', 'fallbackCopyToClipboard'),
        3042: ('src/utils/helpers.js', 'showCopyFeedback'),
        3097: ('src/ui/lobby-ui.js', 'resignGame'),
        3143: ('src/ui/lobby-ui.js', 'leaveRoom'),
        3172: ('src/ui/lobby-ui.js', 'returnToRoomLobby'),
        3298: ('src/ui/lobby-ui.js', 'hideLeaderboard'),
        3307: ('src/ui/lobby-ui.js', 'showLeaderboard'),
        3321: ('src/ui/lobby-ui.js', 'checkLeaderboardOverlap'),
        3341: ('src/core/game-state.js', 'updateGameState'),
        3649: ('src/ui/lobby-ui.js', 'startMultiplayerGame'),
        3745: ('src/core/board-logic.js', 'applyBoardTransformations'),
        3782: ('src/core/board-logic.js', 'convertDeadStoneStringToObject'),
        3802: ('src/editor/board-editor.js', 'calculateTerritoryScore'),
        4230: ('src/ui/lobby-ui.js', 'loadMultiplayerBoard'),
        4418: ('src/ui/lobby-ui.js', 'updateLeaderboard'),
        4615: ('src/ui/lobby-ui.js', 'preload'),
        4620: ('src/editor/board-editor.js', 'setup'),
        4680: ('src/ui/lobby-ui.js', 'windowResized'),
        4747: ('src/editor/board-editor.js', 'draw'),
        4884: ('src/core/board-logic.js', 'getBoard'),
        5174: ('src/ui/lobby-ui.js', 'keyPressed'),
        5298: ('src/editor/board-editor.js', 'mousePressed'),
    }
    
    # Missing functions to add (backup_line: (target_file, function_name))
    missing_functions = {
        141: ('src/ui/lobby-ui.js', 'drawSummaryScreen'),
        293: ('src/ui/lobby-ui.js', 'drawMiniBoard'),
        368: ('src/ui/lobby-ui.js', 'drawBoardReview'),
        467: ('src/ui/lobby-ui.js', 'viewBoardFromSummary'),
        483: ('src/ui/lobby-ui.js', 'backToSummary'),
        499: ('src/ui/lobby-ui.js', 'backToLobbyFromSummary'),
        510: ('src/ui/lobby-ui.js', 'updateSummaryButtons'),
        548: ('src/ui/lobby-ui.js', 'updateNavigationButtonStates'),
        570: ('src/ui/lobby-ui.js', 'navigateToPreviousBoard'),
        579: ('src/ui/lobby-ui.js', 'navigateToNextBoard'),
        594: ('src/ui/lobby-ui.js', 'drawGoBoard'),
        806: ('src/ui/lobby-ui.js', 'exitHistoricalSummary'),
        821: ('src/ui/lobby-ui.js', 'handleSummaryGridClick'),
        855: ('src/ui/lobby-ui.js', 'handleHistoricalSummaryGridClick'),
        1807: ('src/utils/dev-tools.js', 'debugLeaderboardStats'),
        1817: ('src/utils/dev-tools.js', 'resetLeaderboardStats'),
        2295: ('src/main.js', 'blurHandler'),
        2383: ('src/main.js', 'boardsBlurHandler'),
        2500: ('src/ui/lobby-ui.js', 'handleTimeChange'),
        2598: ('src/ui/lobby-ui.js', 'createNewRoom'),
        2629: ('src/ui/lobby-ui.js', 'joinCreatedRoom'),
        2646: ('src/ui/lobby-ui.js', 'handleJoinRoomSuccess'),
        2701: ('src/ui/lobby-ui.js', 'updateRoomTimeFromInput'),
        2736: ('src/ui/lobby-ui.js', 'updateRoomBoardsFromInput'),
        2771: ('src/ui/lobby-ui.js', 'toggleRoomHardMode'),
        2786: ('src/ui/lobby-ui.js', 'updateRoomSettings'),
        3085: ('src/ui/lobby-ui.js', 'updateResignButtonVisibility'),
        3626: ('src/ui/lobby-ui.js', 'showBoardNumberIndicator'),
        3633: ('src/ui/lobby-ui.js', 'hideBoardNumberIndicator'),
        3640: ('src/ui/lobby-ui.js', 'updateBoardNumberIndicator'),
        3844: ('src/ui/lobby-ui.js', 'drawNormalModeUI'),
        3895: ('src/ui/lobby-ui.js', 'drawNormalModeStoneUI'),
        4028: ('src/ui/lobby-ui.js', 'drawHardModeUI'),
        4455: ('src/ui/lobby-ui.js', 'submitNormalModeAnswer'),
        4910: ('src/ui/lobby-ui.js', 'handleHardModeClick'),
        4945: ('src/ui/lobby-ui.js', 'handleNormalModeClick'),
        4975: ('src/ui/lobby-ui.js', 'submitHardModeAnswer'),
        5016: ('src/ui/lobby-ui.js', 'submitMultiplayerHardMode'),
        5146: ('src/ui/lobby-ui.js', 'handleClick'),
        5305: ('src/ui/lobby-ui.js', 'mouseMoved'),
        5309: ('src/ui/lobby-ui.js', 'mouseReleased'),
        5314: ('src/ui/lobby-ui.js', 'touchEnded'),
        5321: ('src/ui/lobby-ui.js', 'mouseWheel'),
        5336: ('src/ui/lobby-ui.js', 'touchStarted'),
        5352: ('src/ui/lobby-ui.js', 'touchMoved'),
    }
    
    # Replace existing functions with different implementations
    print(f"\n📝 Replacing {len(different_implementations)} functions with different implementations:")
    print("-" * 60)
    
    replaced_count = 0
    for backup_line, (target_file, func_name) in different_implementations.items():
        func_body = extract_function_from_backup(backup_content, func_name, backup_line)
        if func_body:
            if replace_function_in_file(target_file, func_name, func_body):
                replaced_count += 1
            else:
                print(f"❌ Failed to replace {func_name} in {target_file}")
        else:
            print(f"❌ Could not extract {func_name} from backup line {backup_line}")
    
    print(f"\n✅ Successfully replaced {replaced_count}/{len(different_implementations)} functions")
    
    # Add missing functions
    print(f"\n📦 Adding {len(missing_functions)} missing functions:")
    print("-" * 60)
    
    added_count = 0
    for backup_line, (target_file, func_name) in missing_functions.items():
        func_body = extract_function_from_backup(backup_content, func_name, backup_line)
        if func_body:
            if add_function_to_file(target_file, func_body):
                print(f"✅ Added {func_name} to {target_file}")
                added_count += 1
            else:
                print(f"❌ Failed to add {func_name} to {target_file}")
        else:
            print(f"❌ Could not extract {func_name} from backup line {backup_line}")
    
    print(f"\n✅ Successfully added {added_count}/{len(missing_functions)} functions")
    
    print("\n" + "=" * 80)
    print("📊 FINAL SUMMARY:")
    print(f"  Functions replaced: {replaced_count}/{len(different_implementations)}")
    print(f"  Functions added: {added_count}/{len(missing_functions)}")
    print(f"  Total operations: {replaced_count + added_count}/{len(different_implementations) + len(missing_functions)}")
    print("=" * 80)

if __name__ == "__main__":
    main()