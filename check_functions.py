#!/usr/bin/env python3
"""
Comprehensive function comparison script for multiplayer.js backup vs src/ files
Extracts all function definitions (including async) and compares them for exact matches
"""

import re
import os
import difflib
from pathlib import Path

def extract_functions_from_file(file_path):
    """Extract all function definitions (including async) from a JavaScript file"""
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
        # functionName: function(params) {
        r'^(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*function\s*\([^)]*\)\s*\{',
        # functionName: async function(params) {
        r'^(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*async\s+function\s*\([^)]*\)\s*\{',
        # async functionName(params) {  (object method)
        r'^(\s*)async\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{',
        # functionName(params) {  (object method)
        r'^(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{',
    ]
    
    for line_num, line in enumerate(lines, 1):
        for pattern in patterns:
            match = re.match(pattern, line.strip())
            if match:
                if len(match.groups()) >= 2:
                    func_name = match.group(2)
                    if func_name and not func_name in ['if', 'for', 'while', 'switch', 'catch']:
                        # Extract the full function body
                        func_body = extract_function_body(lines, line_num - 1)
                        functions[func_name] = {
                            'line': line_num,
                            'definition': line.strip(),
                            'body': func_body
                        }
                break
    
    return functions

def extract_function_body(lines, start_line):
    """Extract the complete function body including all nested braces"""
    if start_line >= len(lines):
        return ""
    
    # Find opening brace
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

def find_all_js_files(directory):
    """Find all JavaScript files in directory and subdirectories"""
    js_files = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.js'):
                js_files.append(os.path.join(root, file))
    return js_files

def normalize_function_body(body):
    """Normalize function body for comparison (remove extra whitespace, etc.)"""
    # Remove leading/trailing whitespace from each line
    lines = [line.strip() for line in body.split('\n')]
    # Remove empty lines
    lines = [line for line in lines if line]
    return '\n'.join(lines)

def compare_functions(backup_functions, src_functions_dict):
    """Compare functions from backup with functions from src files"""
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
                
                # Normalize bodies for comparison
                backup_body = normalize_function_body(backup_info['body'])
                src_body = normalize_function_body(src_info['body'])
                
                if backup_body == src_body:
                    results['exact_matches'].append({
                        'function': func_name,
                        'backup_line': backup_info['line'],
                        'src_file': file_path,
                        'src_line': src_info['line']
                    })
                else:
                    results['different_implementations'].append({
                        'function': func_name,
                        'backup_line': backup_info['line'],
                        'src_file': file_path,
                        'src_line': src_info['line'],
                        'backup_body': backup_info['body'],
                        'src_body': src_info['body']
                    })
                break
        
        if not found:
            results['missing_functions'].append({
                'function': func_name,
                'backup_line': backup_info['line'],
                'definition': backup_info['definition']
            })
    
    return results

def main():
    backup_file = 'backup/multiplayer.js'
    src_directory = 'src'
    
    print("🔍 Analyzing functions in backup/multiplayer.js vs src/ files...")
    print("=" * 70)
    
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
    print("\n🔍 Comparing functions...")
    results = compare_functions(backup_functions, src_functions_dict)
    
    # Print results
    print("\n" + "=" * 70)
    print("📊 COMPARISON RESULTS")
    print("=" * 70)
    
    print(f"\n✅ EXACT MATCHES ({len(results['exact_matches'])} functions):")
    print("-" * 50)
    for match in results['exact_matches']:
        print(f"  {match['function']:25} | backup:{match['backup_line']:4} | {match['src_file']}:{match['src_line']}")
    
    print(f"\n⚠️  DIFFERENT IMPLEMENTATIONS ({len(results['different_implementations'])} functions):")
    print("-" * 70)
    for diff in results['different_implementations']:
        print(f"\n🔧 {diff['function']} (backup:{diff['backup_line']} vs {diff['src_file']}:{diff['src_line']})")
        print("   BACKUP VERSION:")
        backup_lines = diff['backup_body'].split('\n')[:5]  # Show first 5 lines
        for line in backup_lines:
            print(f"     {line}")
        if len(diff['backup_body'].split('\n')) > 5:
            print("     ...")
        
        print("   SRC VERSION:")
        src_lines = diff['src_body'].split('\n')[:5]  # Show first 5 lines  
        for line in src_lines:
            print(f"     {line}")
        if len(diff['src_body'].split('\n')) > 5:
            print("     ...")
    
    print(f"\n❌ MISSING FUNCTIONS ({len(results['missing_functions'])} functions):")
    print("-" * 50)
    for missing in results['missing_functions']:
        print(f"  {missing['function']:25} | backup:{missing['backup_line']:4} | {missing['definition']}")
    
    print("\n" + "=" * 70)
    print("📈 SUMMARY:")
    print(f"  Total functions in backup: {len(backup_functions)}")
    print(f"  Exact matches: {len(results['exact_matches'])}")
    print(f"  Different implementations: {len(results['different_implementations'])}")
    print(f"  Missing from src/: {len(results['missing_functions'])}")
    print("=" * 70)

if __name__ == "__main__":
    main()