#!/usr/bin/env python3
"""
Simple and accurate function comparison script.
Uses a straightforward approach to extract individual functions only.
"""

import re
import os
from pathlib import Path

def extract_single_function(content, func_name):
    """Extract a single function by name with proper brace matching"""
    lines = content.split('\n')
    
    # Patterns to find function start
    patterns = [
        rf'^(\s*)function\s+{re.escape(func_name)}\s*\(',
        rf'^(\s*)window\.{re.escape(func_name)}\s*=\s*function\s*\(',
        rf'^(\s*)window\.{re.escape(func_name)}\s*=\s*async\s+function\s*\(',
        rf'^(\s*)const\s+{re.escape(func_name)}\s*=\s*function\s*\(',
        rf'^(\s*)const\s+{re.escape(func_name)}\s*=\s*async\s+function\s*\(',
        rf'^(\s*)let\s+{re.escape(func_name)}\s*=\s*function\s*\(',
        rf'^(\s*)var\s+{re.escape(func_name)}\s*=\s*function\s*\(',
        rf'^(\s*)const\s+{re.escape(func_name)}\s*=\s*\([^)]*\)\s*=>\s*\{{',
        rf'^(\s*)const\s+{re.escape(func_name)}\s*=\s*async\s*\([^)]*\)\s*=>\s*\{{',
        rf'^(\s*){re.escape(func_name)}\s*:\s*function\s*\(',
        rf'^(\s*){re.escape(func_name)}\s*:\s*async\s+function\s*\(',
        rf'^(\s*)async\s+function\s+{re.escape(func_name)}\s*\(',
    ]
    
    for line_idx, line in enumerate(lines):
        for pattern in patterns:
            if re.search(pattern, line):
                # Found function start, now extract until matching brace
                return extract_function_from_line(lines, line_idx)
    
    return None

def extract_function_from_line(lines, start_idx):
    """Extract function starting from a specific line"""
    brace_count = 0
    in_string = False
    escape_next = False
    string_char = None
    func_lines = []
    
    for i in range(start_idx, len(lines)):
        line = lines[i]
        func_lines.append(line)
        
        # Process character by character to handle strings properly
        for char in line:
            if escape_next:
                escape_next = False
                continue
                
            if char == '\\':
                escape_next = True
                continue
                
            if in_string:
                if char == string_char:
                    in_string = False
                    string_char = None
                continue
                
            if char in ['"', "'", '`']:
                in_string = True
                string_char = char
                continue
                
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    # Function complete
                    return '\n'.join(func_lines)
        
        # Safety check - allow very large functions but warn if extremely long
        if len(func_lines) > 1000:
            print(f"⚠️ Function extraction exceeded 1000 lines, continuing but this may indicate an issue")
            # Continue extraction instead of breaking
    
    return '\n'.join(func_lines)

def find_all_function_names(content):
    """Find all function names in content"""
    functions = set()
    
    patterns = [
        r'^(\s*)function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(',
        r'^(\s*)window\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*function\s*\(',
        r'^(\s*)window\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*async\s+function\s*\(',
        r'^(\s*)const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*function\s*\(',
        r'^(\s*)const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*async\s+function\s*\(',
        r'^(\s*)let\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*function\s*\(',
        r'^(\s*)var\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*function\s*\(',
        r'^(\s*)const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\([^)]*\)\s*=>\s*\{',
        r'^(\s*)const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*async\s*\([^)]*\)\s*=>\s*\{',
        r'^(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*function\s*\(',
        r'^(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*async\s+function\s*\(',
        r'^(\s*)async\s+function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(',
    ]
    
    for line in content.split('\n'):
        for pattern in patterns:
            match = re.search(pattern, line)
            if match:
                func_name = match.group(2) if len(match.groups()) >= 2 else match.group(1)
                # Filter out control structures
                if func_name and func_name.lower() not in ['if', 'for', 'while', 'switch', 'catch', 'try', 'else', 'do', 'with']:
                    functions.add(func_name)
    
    return functions

def find_js_files(directory):
    """Find all JS files in directory"""
    js_files = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.js'):
                js_files.append(os.path.join(root, file))
    return js_files

def compare_functions():
    """Main comparison function"""
    # Read backup file
    with open('backup/multiplayer.js', 'r') as f:
        backup_content = f.read()
    
    # Find all function names in backup
    backup_functions = find_all_function_names(backup_content)
    
    print(f"Found {len(backup_functions)} functions in backup")
    
    # Find all src files
    src_files = find_js_files('src')
    
    # Compare each function
    exact_matches = []
    different_funcs = []
    missing_funcs = []
    
    for func_name in sorted(backup_functions):
        backup_func = extract_single_function(backup_content, func_name)
        if not backup_func:
            continue
            
        found_in_src = False
        
        for src_file in src_files:
            with open(src_file, 'r') as f:
                src_content = f.read()
            
            src_func = extract_single_function(src_content, func_name)
            if src_func:
                found_in_src = True
                
                if backup_func.strip() == src_func.strip():
                    exact_matches.append({
                        'name': func_name,
                        'file': src_file
                    })
                else:
                    different_funcs.append({
                        'name': func_name,
                        'file': src_file,
                        'backup': backup_func[:200] + '...' if len(backup_func) > 200 else backup_func,
                        'src': src_func[:200] + '...' if len(src_func) > 200 else src_func
                    })
                break
        
        if not found_in_src:
            missing_funcs.append({
                'name': func_name,
                'preview': backup_func[:100] + '...' if len(backup_func) > 100 else backup_func
            })
    
    # Print results
    print("\n" + "="*80)
    print("FUNCTION COMPARISON RESULTS")
    print("="*80)
    
    print(f"\n✅ EXACT MATCHES ({len(exact_matches)} functions):")
    for match in exact_matches[:10]:  # Show first 10
        print(f"  {match['name']:30} | {match['file']}")
    if len(exact_matches) > 10:
        print(f"  ... and {len(exact_matches) - 10} more exact matches")
    
    print(f"\n⚠️ DIFFERENT IMPLEMENTATIONS ({len(different_funcs)} functions):")
    for diff in different_funcs[:5]:  # Show first 5
        print(f"\n🔧 {diff['name']} in {diff['file']}")
        print("  BACKUP:")
        for line in diff['backup'].split('\n')[:2]:
            print(f"    {line}")
        print("  SRC:")
        for line in diff['src'].split('\n')[:2]:
            print(f"    {line}")
    if len(different_funcs) > 5:
        print(f"\n  ... and {len(different_funcs) - 5} more different implementations")
    
    print(f"\n❌ MISSING FUNCTIONS ({len(missing_funcs)} functions):")
    for missing in missing_funcs[:10]:  # Show first 10
        print(f"  {missing['name']:30} | {missing['preview'].split(chr(10))[0][:50]}...")
    if len(missing_funcs) > 10:
        print(f"  ... and {len(missing_funcs) - 10} more missing functions")
    
    print("\n" + "="*80)
    print("SUMMARY:")
    print(f"  Total functions in backup: {len(backup_functions)}")
    print(f"  Exact matches: {len(exact_matches)}")
    print(f"  Different implementations: {len(different_funcs)}")
    print(f"  Missing from src/: {len(missing_funcs)}")
    
    accuracy = (len(exact_matches) / len(backup_functions)) * 100 if len(backup_functions) > 0 else 0
    print(f"  Exact match accuracy: {accuracy:.1f}%")
    print("="*80)

if __name__ == "__main__":
    compare_functions()