#!/usr/bin/env python3
"""
Comprehensive script to replace ALL functions (including async) in src/ files with those from backup/multiplayer.js
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
    
    # Patterns for different function definition styles (including async)
    patterns = [
        rf'^(\s*)function\s+{function_name}\s*\([^)]*\)\s*\{{',
        rf'^(\s*)async\s+function\s+{function_name}\s*\([^)]*\)\s*\{{',
        rf'^(\s*)const\s+{function_name}\s*=\s*function\s*\([^)]*\)\s*\{{',
        rf'^(\s*)const\s+{function_name}\s*=\s*async\s+function\s*\([^)]*\)\s*\{{',
        rf'^(\s*)let\s+{function_name}\s*=\s*function\s*\([^)]*\)\s*\{{',
        rf'^(\s*)let\s+{function_name}\s*=\s*async\s+function\s*\([^)]*\)\s*\{{',
        rf'^(\s*)var\s+{function_name}\s*=\s*function\s*\([^)]*\)\s*\{{',
        rf'^(\s*)var\s+{function_name}\s*=\s*async\s+function\s*\([^)]*\)\s*\{{',
        rf'^(\s*)const\s+{function_name}\s*=\s*\([^)]*\)\s*=>\s*\{{',
        rf'^(\s*)const\s+{function_name}\s*=\s*async\s*\([^)]*\)\s*=>\s*\{{',
        rf'^(\s*)let\s+{function_name}\s*=\s*\([^)]*\)\s*=>\s*\{{',
        rf'^(\s*)let\s+{function_name}\s*=\s*async\s*\([^)]*\)\s*=>\s*\{{',
        rf'^(\s*)const\s+{function_name}\s*=\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*=>\s*\{{',
        rf'^(\s*)const\s+{function_name}\s*=\s*async\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*=>\s*\{{',
        rf'^(\s*){function_name}\s*:\s*function\s*\([^)]*\)\s*\{{',
        rf'^(\s*){function_name}\s*:\s*async\s+function\s*\([^)]*\)\s*\{{',
        rf'^(\s*)async\s+{function_name}\s*\([^)]*\)\s*\{{',
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
    
    print("🔄 Starting comprehensive function replacement from backup/multiplayer.js to src/ files")
    print("=" * 90)
    
    # Define function mappings based on updated analysis
    # Functions with different implementations (need to be replaced)
    different_implementations = {
        2672: ('src/ui/lobby-ui.js', 'showRoomLobby'),
        3225: ('src/ui/lobby-ui.js', 'returnToLobbyUI'),
        3413: ('src/ui/lobby-ui.js', 'updatePlayerListAndStatus'),
        3503: ('src/ui/lobby-ui.js', 'updateUI'),
    }
    
    # Missing functions to add (all should go to appropriate files)
    missing_functions = {
        647: ('src/ui/lobby-ui.js', 'viewHistoricalGameSummary'),
        1431: ('src/ui/lobby-ui.js', 'getTotalScoresForRoom'),
        1825: ('src/ui/lobby-ui.js', 'loadLeaderboardHistory'),
    }
    
    # Replace existing functions with different implementations
    print(f"📝 Replacing {len(different_implementations)} functions with different implementations:")
    print("-" * 70)
    
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
    
    print("\n" + "=" * 90)
    print("📊 FINAL SUMMARY:")
    print(f"  Functions replaced: {replaced_count}/{len(different_implementations)}")
    print(f"  Functions added: {added_count}/{len(missing_functions)}")
    print(f"  Total operations: {replaced_count + added_count}/{len(different_implementations) + len(missing_functions)}")
    print("=" * 90)
    
    # Run verification
    print("\n🔍 Running verification check...")
    os.system("python3 check_functions.py > final_verification.txt 2>&1")
    
    # Check results
    try:
        with open('final_verification.txt', 'r') as f:
            content = f.read()
            if 'Missing from src/: 0' in content:
                print("✅ VERIFICATION PASSED: All functions are now present!")
            else:
                print("⚠️ VERIFICATION: Some functions may still be missing. Check final_verification.txt")
    except:
        print("❌ Could not verify results")

if __name__ == "__main__":
    main()