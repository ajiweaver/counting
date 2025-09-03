#!/usr/bin/env python3
"""
Debug the exact extraction logic to see what's happening
"""
import re

def extract_functions_debug(file_path, target_function):
    """Debug version of function extraction"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return None
    
    lines = content.split('\n')
    
    # Pattern for function functionName
    pattern = r'^(\s*)function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{'
    
    for line_num, line in enumerate(lines, 1):
        match = re.match(pattern, line.strip())
        if match and len(match.groups()) >= 2:
            func_name = match.group(2)
            if func_name == target_function:
                print(f"Found {func_name} at line {line_num}: {line.strip()}")
                
                # Extract function body
                brace_count = 0
                func_lines = []
                started = False
                found_opening_brace = False
                
                for i in range(line_num - 1, len(lines)):
                    current_line = lines[i]
                    
                    if i == line_num - 1:
                        brace_pos = current_line.find('{')
                        if brace_pos != -1:
                            func_lines.append(current_line)
                            found_opening_brace = True
                            started = True
                            brace_count = 1
                        else:
                            func_lines.append(current_line)
                    else:
                        func_lines.append(current_line)
                    
                    if found_opening_brace or i > line_num - 1:
                        for char in current_line:
                            if char == '{':
                                if not found_opening_brace:
                                    found_opening_brace = True
                                    started = True
                                brace_count += 1
                            elif char == '}':
                                brace_count -= 1
                                
                                if started and brace_count == 0:
                                    return '\n'.join(func_lines)
                    
                    if len(func_lines) > 100:  # Safety
                        break
                
                return '\n'.join(func_lines)
    
    return None

# Test on getCurrentBoards
backup_result = extract_functions_debug('backup/multiplayer.js', 'getCurrentBoards')
src_result = extract_functions_debug('src/core/game-state.js', 'getCurrentBoards')

print("=== BACKUP EXTRACTION ===")
if backup_result:
    print(f"Length: {len(backup_result)}")
    print("Raw:")
    print(repr(backup_result))
    print("Formatted:")
    print(backup_result)
else:
    print("Not found")

print("\n=== SRC EXTRACTION ===")
if src_result:
    print(f"Length: {len(src_result)}")
    print("Raw:")
    print(repr(src_result))
    print("Formatted:")
    print(src_result)
else:
    print("Not found")

print(f"\n=== EXACT MATCH: {backup_result == src_result if backup_result and src_result else False} ===")

if backup_result and src_result and backup_result != src_result:
    # Show character by character difference
    print("\n=== CHARACTER BY CHARACTER COMPARISON ===")
    backup_chars = list(backup_result)
    src_chars = list(src_result)
    
    min_len = min(len(backup_chars), len(src_chars))
    for i in range(min_len):
        if backup_chars[i] != src_chars[i]:
            print(f"Difference at position {i}:")
            print(f"  Backup: {repr(backup_chars[i])}")
            print(f"  Src:    {repr(src_chars[i])}")
            print(f"  Context: ...{repr(backup_result[max(0,i-10):i+10])}...")
            break
    
    if len(backup_chars) != len(src_chars):
        print(f"Length difference: backup={len(backup_chars)}, src={len(src_chars)}")