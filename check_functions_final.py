#!/usr/bin/env python3
"""
Final version: Use AST-like parsing to accurately extract functions
"""

import re
import os
import ast

def find_function_bounds(content, func_name):
    """Find the start and end positions of a function in content"""
    lines = content.split('\n')
    
    # Find function start
    start_line = None
    patterns = [
        rf'^\s*function\s+{re.escape(func_name)}\s*\(',
        rf'^\s*window\.{re.escape(func_name)}\s*=\s*(async\s+)?function',
        rf'^\s*(const|let|var)\s+{re.escape(func_name)}\s*=\s*(async\s+)?function',
        rf'^\s*(const|let)\s+{re.escape(func_name)}\s*=\s*(async\s*)?\([^)]*\)\s*=>',
        rf'^\s*{re.escape(func_name)}\s*:\s*(async\s+)?function',
        rf'^\s*async\s+function\s+{re.escape(func_name)}\s*\(',
    ]
    
    for line_idx, line in enumerate(lines):
        for pattern in patterns:
            if re.search(pattern, line):
                start_line = line_idx
                break
        if start_line is not None:
            break
    
    if start_line is None:
        return None
    
    # Find the opening brace and matching closing brace
    brace_count = 0
    in_string = False
    string_delimiter = None
    escaped = False
    function_started = False
    
    for line_idx in range(start_line, len(lines)):
        line = lines[line_idx]
        
        for char_idx, char in enumerate(line):
            # Handle escape sequences
            if escaped:
                escaped = False
                continue
                
            if char == '\\':
                escaped = True
                continue
            
            # Handle strings
            if char in ['"', "'", '`'] and not in_string:
                in_string = True
                string_delimiter = char
                continue
            elif char == string_delimiter and in_string:
                in_string = False
                string_delimiter = None
                continue
            elif in_string:
                continue
            
            # Count braces outside of strings
            if char == '{':
                brace_count += 1
                function_started = True
            elif char == '}' and function_started:
                brace_count -= 1
                if brace_count == 0:
                    # Found the end of the function
                    return (start_line, line_idx)
        
        # Safety check - functions shouldn't be more than 500 lines
        if line_idx - start_line > 500:
            break
    
    return None

def extract_function_by_name(content, func_name):
    """Extract a specific function from content"""
    bounds = find_function_bounds(content, func_name)
    if bounds is None:
        return None
    
    start_line, end_line = bounds
    lines = content.split('\n')
    
    return '\n'.join(lines[start_line:end_line + 1])

def find_all_functions(content):
    """Find all function names in content"""
    functions = set()
    
    # More comprehensive patterns
    patterns = [
        r'^\s*function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(',
        r'^\s*window\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?function',
        r'^\s*(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?function',
        r'^\s*(?:const|let)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>',
        r'^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(?:async\s+)?function',
        r'^\s*async\s+function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(',
    ]
    
    for line in content.split('\n'):
        for pattern in patterns:
            match = re.search(pattern, line)
            if match:
                func_name = match.group(1)
                # Filter out keywords and common false positives
                if func_name not in ['if', 'for', 'while', 'switch', 'catch', 'try', 'else', 'do', 'with']:
                    functions.add(func_name)
    
    return functions

def compare_functions_accurately():
    """Main comparison function with accurate extraction"""
    
    # Read backup
    with open('backup/multiplayer.js', 'r') as f:
        backup_content = f.read()
    
    backup_functions = find_all_functions(backup_content)
    print(f"Found {len(backup_functions)} functions in backup")
    
    # Find src files
    src_files = []
    for root, dirs, files in os.walk('src'):
        for file in files:
            if file.endswith('.js'):
                src_files.append(os.path.join(root, file))
    
    exact_matches = []
    different_funcs = []
    missing_funcs = []
    
    print(f"\nComparing {len(backup_functions)} functions...")
    
    for func_name in sorted(backup_functions):
        print(f"Processing {func_name}...", end='')
        
        # Extract from backup
        backup_func = extract_function_by_name(backup_content, func_name)
        if not backup_func:
            print(" (failed to extract from backup)")
            continue
        
        found_in_src = False
        
        # Check each src file
        for src_file in src_files:
            with open(src_file, 'r') as f:
                src_content = f.read()
            
            src_func = extract_function_by_name(src_content, func_name)
            if src_func:
                found_in_src = True
                
                # Normalize whitespace for comparison
                backup_normalized = '\n'.join(line.rstrip() for line in backup_func.split('\n'))
                src_normalized = '\n'.join(line.rstrip() for line in src_func.split('\n'))
                
                if backup_normalized == src_normalized:
                    exact_matches.append({'name': func_name, 'file': src_file})
                    print(" ✅")
                else:
                    different_funcs.append({
                        'name': func_name,
                        'file': src_file,
                        'backup_lines': len(backup_func.split('\n')),
                        'src_lines': len(src_func.split('\n'))
                    })
                    print(" ⚠️")
                break
        
        if not found_in_src:
            missing_funcs.append({'name': func_name})
            print(" ❌")
    
    # Print results
    print("\n" + "="*80)
    print("ACCURATE FUNCTION COMPARISON RESULTS")
    print("="*80)
    
    print(f"\n✅ EXACT MATCHES ({len(exact_matches)} functions):")
    for match in exact_matches[:15]:
        print(f"  {match['name']:30} | {match['file']}")
    if len(exact_matches) > 15:
        print(f"  ... and {len(exact_matches) - 15} more exact matches")
    
    print(f"\n⚠️ DIFFERENT IMPLEMENTATIONS ({len(different_funcs)} functions):")
    for diff in different_funcs[:10]:
        print(f"  {diff['name']:30} | {diff['file']} | backup:{diff['backup_lines']} lines, src:{diff['src_lines']} lines")
    if len(different_funcs) > 10:
        print(f"  ... and {len(different_funcs) - 10} more different implementations")
    
    print(f"\n❌ MISSING FUNCTIONS ({len(missing_funcs)} functions):")
    for missing in missing_funcs:
        print(f"  {missing['name']:30}")
    
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
    compare_functions_accurately()