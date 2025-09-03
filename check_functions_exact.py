#!/usr/bin/env python3
"""
Exact brace-to-brace function comparison script for multiplayer.js backup vs src/ files
Extracts complete function bodies and compares them character-by-character for exact matches
"""

import re
import os
import difflib
from pathlib import Path

def extract_functions_from_file(file_path):
    """Extract all function definitions with exact brace-to-brace content"""
    functions = {}
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return functions
    
    # Split content into lines for line number tracking
    lines = content.split('\n')
    
    # Patterns for different function definition styles (including async)
    patterns = [
        # function functionName(params) {
        r'^(\s*)function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{',
        # async function functionName(params) {
        r'^(\s*)async\s+function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{',
        # const functionName = function(params) {
        r'^(\s*)const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*function\s*\([^)]*\)\s*\{',
        # const functionName = async function(params) {
        r'^(\s*)const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*async\s+function\s*\([^)]*\)\s*\{',
        # let functionName = function(params) {
        r'^(\s*)let\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*function\s*\([^)]*\)\s*\{',
        # let functionName = async function(params) {
        r'^(\s*)let\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*async\s+function\s*\([^)]*\)\s*\{',
        # var functionName = function(params) {
        r'^(\s*)var\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*function\s*\([^)]*\)\s*\{',
        # var functionName = async function(params) {
        r'^(\s*)var\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*async\s+function\s*\([^)]*\)\s*\{',
        # const functionName = (params) => {
        r'^(\s*)const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\([^)]*\)\s*=>\s*\{',
        # const functionName = async (params) => {
        r'^(\s*)const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*async\s*\([^)]*\)\s*=>\s*\{',
        # let functionName = (params) => {
        r'^(\s*)let\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\([^)]*\)\s*=>\s*\{',
        # let functionName = async (params) => {
        r'^(\s*)let\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*async\s*\([^)]*\)\s*=>\s*\{',
        # const functionName = param => {
        r'^(\s*)const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*=>\s*\{',
        # const functionName = async param => {
        r'^(\s*)const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*async\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*=>\s*\{',
        # window.functionName = function(params) {
        r'^(\s*)window\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*function\s*\([^)]*\)\s*\{',
        # window.functionName = async function(params) {
        r'^(\s*)window\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*async\s+function\s*\([^)]*\)\s*\{',
        # functionName: function(params) {
        r'^(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*function\s*\([^)]*\)\s*\{',
        # functionName: async function(params) {
        r'^(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*async\s+function\s*\([^)]*\)\s*\{',
        # async functionName(params) {  (object method)
        r'^(\s*)async\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{',
        # functionName(params) {  (object method - be careful not to match control structures)
        r'^(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{',
    ]
    
    for line_num, line in enumerate(lines, 1):
        for pattern in patterns:
            match = re.match(pattern, line.strip())
            if match:
                if len(match.groups()) >= 2:
                    func_name = match.group(2)
                    # Filter out control structures and common keywords
                    if func_name and not func_name.lower() in ['if', 'for', 'while', 'switch', 'catch', 'try', 'else', 'do', 'with']:
                        # Extract the full function body with exact formatting
                        func_body = extract_exact_function_body(lines, line_num - 1)
                        if func_body:  # Only add if we found a valid function body
                            functions[func_name] = {
                                'line': line_num,
                                'definition': line.strip(),
                                'body': func_body,
                                'signature': extract_function_signature(line.strip())
                            }
                break
    
    return functions

def extract_function_signature(line):
    """Extract just the function signature (everything before the opening brace)"""
    brace_pos = line.find('{')
    if brace_pos != -1:
        return line[:brace_pos].strip()
    return line.strip()

def extract_exact_function_body(lines, start_line):
    """Extract the complete function body preserving exact formatting and whitespace"""
    if start_line >= len(lines):
        return ""
    
    # Find opening brace - it might be on the same line as function declaration
    brace_count = 0
    func_lines = []
    started = False
    
    for i in range(start_line, len(lines)):
        line = lines[i]
        func_lines.append(line)
        
        # Count braces in this line
        for char in line:
            if char == '{':
                brace_count += 1
                started = True
            elif char == '}':
                brace_count -= 1
                
                # If we've closed all braces, we're done
                if started and brace_count == 0:
                    return '\n'.join(func_lines)
        
        # Safety check - don't extract more than 200 lines for a single function
        if len(func_lines) > 200:
            print(f"⚠️ Function extraction exceeded 200 lines at line {start_line + 1}, stopping")
            break
    
    # If we never found a complete function (unmatched braces), return what we have
    return '\n'.join(func_lines) if started else ""

def find_all_js_files(directory):
    """Find all JavaScript files in directory and subdirectories"""
    js_files = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.js'):
                js_files.append(os.path.join(root, file))
    return js_files

def are_functions_exactly_equal(backup_body, src_body):
    """Compare two function bodies for exact character-by-character equality"""
    return backup_body.strip() == src_body.strip()

def get_body_without_signature(func_body):
    """Get just the body content without the function signature line"""
    lines = func_body.split('\n')
    if len(lines) <= 1:
        return func_body
    
    # Find the first line that contains an opening brace
    for i, line in enumerate(lines):
        if '{' in line:
            # If the opening brace is on the signature line, start from next line
            brace_pos = line.find('{')
            after_brace = line[brace_pos + 1:].strip()
            
            if after_brace:
                # There's content after the brace on the same line
                remaining_lines = [after_brace] + lines[i + 1:]
            else:
                # Brace is at end of line or only whitespace after
                remaining_lines = lines[i + 1:]
            
            # Remove the final closing brace line
            body_lines = []
            for line in remaining_lines:
                body_lines.append(line)
                if line.strip() == '}' and len([l for l in remaining_lines if l.strip() == '}']) == 1:
                    body_lines.pop()  # Remove the final closing brace
                    break
            
            return '\n'.join(body_lines)
    
    return func_body

def compare_functions(backup_functions, src_functions_dict):
    """Compare functions from backup with functions from src files using exact matching"""
    results = {
        'exact_matches': [],
        'different_implementations': [],
        'missing_functions': []
    }
    
    for func_name, backup_info in backup_functions.items():
        found = False
        
        # Check each src file for this function
        for file_path, src_functions in src_functions_dict.items():
            if func_name in src_functions:
                found = True
                src_info = src_functions[func_name]
                
                # Compare exact function bodies
                if are_functions_exactly_equal(backup_info['body'], src_info['body']):
                    results['exact_matches'].append({
                        'function': func_name,
                        'backup_line': backup_info['line'],
                        'src_file': file_path,
                        'src_line': src_info['line']
                    })
                else:
                    # Also check if just the body content (without signature) matches
                    backup_body_only = get_body_without_signature(backup_info['body'])
                    src_body_only = get_body_without_signature(src_info['body'])
                    
                    body_match = are_functions_exactly_equal(backup_body_only, src_body_only)
                    
                    results['different_implementations'].append({
                        'function': func_name,
                        'backup_line': backup_info['line'],
                        'src_file': file_path,
                        'src_line': src_info['line'],
                        'backup_body': backup_info['body'],
                        'src_body': src_info['body'],
                        'backup_signature': backup_info['signature'],
                        'src_signature': src_info['signature'],
                        'body_only_match': body_match
                    })
                break
        
        if not found:
            results['missing_functions'].append({
                'function': func_name,
                'backup_line': backup_info['line'],
                'definition': backup_info['definition'],
                'signature': backup_info['signature']
            })
    
    return results

def show_diff(backup_body, src_body, func_name):
    """Show a unified diff between backup and src function bodies"""
    backup_lines = backup_body.splitlines(keepends=True)
    src_lines = src_body.splitlines(keepends=True)
    
    diff = difflib.unified_diff(
        backup_lines, 
        src_lines, 
        fromfile=f'backup/{func_name}', 
        tofile=f'src/{func_name}',
        lineterm=''
    )
    
    return ''.join(diff)

def main():
    backup_file = 'backup/multiplayer.js'
    src_directory = 'src'
    
    print("🔍 Exact brace-to-brace function analysis: backup/multiplayer.js vs src/ files...")
    print("=" * 80)
    
    # Extract functions from backup file
    print("📂 Extracting functions from backup file...")
    backup_functions = extract_functions_from_file(backup_file)
    print(f"Found {len(backup_functions)} functions in backup file")
    
    # Extract functions from all src files
    print("\n📂 Extracting functions from src/ files...")
    src_files = find_all_js_files(src_directory)
    src_functions_dict = {}
    
    for file_path in src_files:
        functions = extract_functions_from_file(file_path)
        if functions:
            src_functions_dict[file_path] = functions
            print(f"  {file_path}: {len(functions)} functions")
    
    total_src_functions = sum(len(funcs) for funcs in src_functions_dict.values())
    print(f"Found {total_src_functions} total functions in {len(src_files)} src files")
    
    # Compare functions
    print("\n🔍 Performing exact brace-to-brace comparison...")
    results = compare_functions(backup_functions, src_functions_dict)
    
    # Print results
    print("\n" + "=" * 80)
    print("📊 EXACT COMPARISON RESULTS")
    print("=" * 80)
    
    print(f"\n✅ EXACT MATCHES ({len(results['exact_matches'])} functions):")
    print("-" * 60)
    for match in results['exact_matches']:
        print(f"  {match['function']:25} | backup:{match['backup_line']:4} | {match['src_file']}:{match['src_line']}")
    
    print(f"\n⚠️  DIFFERENT IMPLEMENTATIONS ({len(results['different_implementations'])} functions):")
    print("-" * 80)
    for diff in results['different_implementations'][:5]:  # Show first 5 differences in detail
        print(f"\n🔧 {diff['function']} (backup:{diff['backup_line']} vs {diff['src_file']}:{diff['src_line']})")
        print(f"   📝 Body-only match: {'✅ YES' if diff['body_only_match'] else '❌ NO'}")
        
        # Show signature comparison
        if diff['backup_signature'] != diff['src_signature']:
            print("   📋 SIGNATURE DIFFERENCE:")
            print(f"     BACKUP: {diff['backup_signature']}")
            print(f"     SRC:    {diff['src_signature']}")
        
        # Show first few lines of difference
        backup_lines = diff['backup_body'].split('\n')[:3]
        src_lines = diff['src_body'].split('\n')[:3]
        
        print("   📄 FIRST FEW LINES:")
        print("     BACKUP:")
        for line in backup_lines:
            print(f"       {repr(line)}")
        print("     SRC:")
        for line in src_lines:
            print(f"       {repr(line)}")
    
    if len(results['different_implementations']) > 5:
        print(f"\n   ... and {len(results['different_implementations']) - 5} more differences")
    
    print(f"\n❌ MISSING FUNCTIONS ({len(results['missing_functions'])} functions):")
    print("-" * 60)
    for missing in results['missing_functions']:
        print(f"  {missing['function']:25} | backup:{missing['backup_line']:4} | {missing['signature']}")
    
    print("\n" + "=" * 80)
    print("📈 SUMMARY:")
    print(f"  Total functions in backup: {len(backup_functions)}")
    print(f"  Exact matches: {len(results['exact_matches'])}")
    print(f"  Different implementations: {len(results['different_implementations'])}")
    print(f"  Missing from src/: {len(results['missing_functions'])}")
    
    # Calculate accuracy
    if len(backup_functions) > 0:
        accuracy = (len(results['exact_matches']) / len(backup_functions)) * 100
        print(f"  Exact match accuracy: {accuracy:.1f}%")
    
    print("=" * 80)

if __name__ == "__main__":
    main()