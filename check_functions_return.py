#!/usr/bin/env python3
"""
Function comparison using return statements to help identify function boundaries
"""

import re
import os

def find_function_with_return(content, func_name):
    """Find function bounds using return statements as hints"""
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
    
    # Extract function using both brace counting and return analysis
    brace_count = 0
    in_string = False
    string_delimiter = None
    escaped = False
    function_started = False
    return_found = False
    last_return_line = None
    
    for line_idx in range(start_line, len(lines)):
        line = lines[line_idx]
        line_stripped = line.strip()
        
        # Track return statements at function level (brace_count == 1)
        if brace_count == 1 and (line_stripped.startswith('return ') or line_stripped == 'return;'):
            return_found = True
            last_return_line = line_idx
        
        # Process character by character for brace counting
        for char_idx, char in enumerate(line):
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
                    # Found closing brace - this is likely the function end
                    return (start_line, line_idx, return_found, last_return_line)
        
        # Safety check - don't go beyond reasonable function length
        if line_idx - start_line > 800:
            print(f"⚠️ Function {func_name} extraction stopped at 800 lines")
            break
    
    return None

def extract_function_with_return(content, func_name):
    """Extract function using return-aware boundary detection"""
    bounds = find_function_with_return(content, func_name)
    if bounds is None:
        return None
    
    start_line, end_line, has_return, last_return_line = bounds
    lines = content.split('\n')
    
    # If we found returns, we can be more confident about the boundary
    function_lines = lines[start_line:end_line + 1]
    
    return {
        'content': '\n'.join(function_lines),
        'start_line': start_line,
        'end_line': end_line,
        'has_return': has_return,
        'last_return_line': last_return_line,
        'line_count': len(function_lines)
    }

def find_all_functions(content):
    """Find all function names in content"""
    functions = set()
    
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
                if func_name not in ['if', 'for', 'while', 'switch', 'catch', 'try', 'else', 'do', 'with']:
                    functions.add(func_name)
    
    return functions

def compare_with_return_analysis():
    """Main comparison with return statement analysis"""
    
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
    extraction_issues = []
    
    print(f"\nComparing {len(backup_functions)} functions with return analysis...")
    
    for func_name in sorted(backup_functions):
        print(f"Processing {func_name}...", end='')
        
        # Extract from backup
        backup_result = extract_function_with_return(backup_content, func_name)
        if not backup_result:
            print(" (failed to extract from backup)")
            extraction_issues.append({'name': func_name, 'issue': 'backup extraction failed'})
            continue
        
        found_in_src = False
        
        # Check each src file
        for src_file in src_files:
            with open(src_file, 'r') as f:
                src_content = f.read()
            
            src_result = extract_function_with_return(src_content, func_name)
            if src_result:
                found_in_src = True
                
                # Compare the extracted functions
                backup_normalized = '\n'.join(line.rstrip() for line in backup_result['content'].split('\n'))
                src_normalized = '\n'.join(line.rstrip() for line in src_result['content'].split('\n'))
                
                if backup_normalized == src_normalized:
                    exact_matches.append({
                        'name': func_name,
                        'file': src_file,
                        'lines': backup_result['line_count'],
                        'has_return': backup_result['has_return']
                    })
                    print(" ✅")
                else:
                    different_funcs.append({
                        'name': func_name,
                        'file': src_file,
                        'backup_lines': backup_result['line_count'],
                        'src_lines': src_result['line_count'],
                        'backup_returns': backup_result['has_return'],
                        'src_returns': src_result['has_return']
                    })
                    print(" ⚠️")
                break
        
        if not found_in_src:
            missing_funcs.append({'name': func_name, 'lines': backup_result['line_count']})
            print(" ❌")
    
    # Print results
    print("\n" + "="*90)
    print("FUNCTION COMPARISON WITH RETURN ANALYSIS")
    print("="*90)
    
    print(f"\n✅ EXACT MATCHES ({len(exact_matches)} functions):")
    for match in exact_matches[:15]:
        return_info = "📤" if match['has_return'] else "🔄"
        print(f"  {match['name']:30} | {match['file']:40} | {match['lines']:3} lines {return_info}")
    if len(exact_matches) > 15:
        print(f"  ... and {len(exact_matches) - 15} more exact matches")
    
    print(f"\n⚠️ DIFFERENT IMPLEMENTATIONS ({len(different_funcs)} functions):")
    for diff in different_funcs[:10]:
        backup_ret = "📤" if diff['backup_returns'] else "🔄"
        src_ret = "📤" if diff['src_returns'] else "🔄"
        print(f"  {diff['name']:30} | {diff['file']:40}")
        print(f"      backup: {diff['backup_lines']:3} lines {backup_ret} | src: {diff['src_lines']:3} lines {src_ret}")
    if len(different_funcs) > 10:
        print(f"  ... and {len(different_funcs) - 10} more different implementations")
    
    print(f"\n❌ MISSING FUNCTIONS ({len(missing_funcs)} functions):")
    for missing in missing_funcs:
        print(f"  {missing['name']:30} | {missing['lines']:3} lines")
    
    if extraction_issues:
        print(f"\n🔧 EXTRACTION ISSUES ({len(extraction_issues)} functions):")
        for issue in extraction_issues:
            print(f"  {issue['name']:30} | {issue['issue']}")
    
    print("\n" + "="*90)
    print("SUMMARY WITH RETURN ANALYSIS:")
    print(f"  Total functions in backup: {len(backup_functions)}")
    print(f"  Exact matches: {len(exact_matches)}")
    print(f"  Different implementations: {len(different_funcs)}")
    print(f"  Missing from src/: {len(missing_funcs)}")
    print(f"  Extraction issues: {len(extraction_issues)}")
    
    accuracy = (len(exact_matches) / len(backup_functions)) * 100 if len(backup_functions) > 0 else 0
    print(f"  Exact match accuracy: {accuracy:.1f}%")
    
    # Return analysis stats
    exact_with_returns = sum(1 for m in exact_matches if m['has_return'])
    print(f"  Functions with explicit returns: {exact_with_returns}/{len(exact_matches)} exact matches")
    print("="*90)

if __name__ == "__main__":
    compare_with_return_analysis()