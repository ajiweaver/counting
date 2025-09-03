#!/usr/bin/env python3
import difflib

# Let's extract and compare just one function to see what's different
def extract_function_from_file(file_path, func_name):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        lines = content.split('\n')
        
        # Find the function
        for i, line in enumerate(lines):
            if f'function {func_name}(' in line or f'function {func_name} (' in line:
                # Extract the function body
                brace_count = 0
                func_lines = []
                started = False
                
                for j in range(i, len(lines)):
                    current_line = lines[j]
                    func_lines.append(current_line)
                    
                    for char in current_line:
                        if char == '{':
                            brace_count += 1
                            started = True
                        elif char == '}':
                            brace_count -= 1
                    
                    if started and brace_count == 0:
                        break
                
                return '\n'.join(func_lines)
        
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None

# Compare getCurrentBoards function
backup_func = extract_function_from_file('backup/multiplayer.js', 'getCurrentBoards')
src_func = extract_function_from_file('src/core/game-state.js', 'getCurrentBoards')

if backup_func and src_func:
    print("=== BACKUP VERSION ===")
    print(repr(backup_func))
    print("\n=== SRC VERSION ===") 
    print(repr(src_func))
    
    print("\n=== UNIFIED DIFF ===")
    diff = difflib.unified_diff(
        backup_func.splitlines(keepends=True),
        src_func.splitlines(keepends=True),
        fromfile='backup/getCurrentBoards',
        tofile='src/getCurrentBoards',
        lineterm=''
    )
    print(''.join(diff))
    
    print(f"\n=== EXACT MATCH: {backup_func == src_func} ===")
else:
    print("Could not extract functions for comparison")