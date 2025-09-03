#!/usr/bin/env python3
"""
Script to find all variable declarations in backup/multiplayer.js and check if they exist in src/ files
"""

import re
import os

def extract_variables_from_file(file_path):
    """Extract all variable declarations from a JavaScript file"""
    variables = {}
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return variables
    
    lines = content.split('\n')
    
    # Patterns for different variable declaration styles
    patterns = [
        # let varName = value;
        r'^(\s*)let\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*([^;]+);?',
        # const varName = value;
        r'^(\s*)const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*([^;]+);?',
        # var varName = value;
        r'^(\s*)var\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*([^;]+);?',
        # let varName; (without initialization)
        r'^(\s*)let\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*;',
        # var varName; (without initialization)
        r'^(\s*)var\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*;',
    ]
    
    for line_num, line in enumerate(lines, 1):
        # Skip comments and function declarations
        stripped_line = line.strip()
        if (stripped_line.startswith('//') or 
            stripped_line.startswith('/*') or 
            stripped_line.startswith('*') or
            'function' in stripped_line):
            continue
            
        for pattern in patterns:
            match = re.match(pattern, line.strip())
            if match:
                var_name = match.group(2)
                # Get the value if it exists
                if len(match.groups()) >= 3:
                    var_value = match.group(3) if len(match.groups()) >= 3 else 'undefined'
                else:
                    var_value = 'undefined'
                
                # Skip certain system variables or duplicates
                if var_name and var_name not in ['i', 'j', 'x', 'y', 'a', 'b']:
                    variables[var_name] = {
                        'line': line_num,
                        'declaration': line.strip(),
                        'value': var_value.strip() if var_value else 'undefined'
                    }
                break
    
    return variables

def search_variable_in_files(var_name, directory):
    """Search for a variable name in all JavaScript files in directory"""
    found_locations = []
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.js'):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        lines = content.split('\n')
                        
                        for line_num, line in enumerate(lines, 1):
                            # Look for variable declarations or references
                            if re.search(rf'\b{var_name}\b', line):
                                # Check if it's a declaration
                                is_declaration = bool(re.search(rf'(let|const|var)\s+{var_name}\b', line.strip()))
                                found_locations.append({
                                    'file': file_path,
                                    'line': line_num,
                                    'content': line.strip(),
                                    'is_declaration': is_declaration
                                })
                except Exception as e:
                    continue
    
    return found_locations

def main():
    backup_file = 'backup/multiplayer.js'
    src_directory = 'src'
    
    print("🔍 Analyzing variables in backup/multiplayer.js vs src/ files...")
    print("=" * 80)
    
    # Extract variables from backup file
    print("📂 Extracting variables from backup file...")
    backup_variables = extract_variables_from_file(backup_file)
    print(f"Found {len(backup_variables)} variables in backup file")
    
    # Check each variable in src files
    print(f"\n📂 Checking variables in src/ files...")
    
    found_variables = []
    missing_variables = []
    referenced_but_not_declared = []
    
    for var_name, var_info in backup_variables.items():
        locations = search_variable_in_files(var_name, src_directory)
        
        # Check if variable is declared in src
        declarations = [loc for loc in locations if loc['is_declaration']]
        references = [loc for loc in locations if not loc['is_declaration']]
        
        if declarations:
            found_variables.append({
                'name': var_name,
                'backup_line': var_info['line'],
                'backup_value': var_info['value'],
                'src_declarations': declarations,
                'src_references': references
            })
        elif references:
            referenced_but_not_declared.append({
                'name': var_name,
                'backup_line': var_info['line'],
                'backup_value': var_info['value'],
                'src_references': references
            })
        else:
            missing_variables.append({
                'name': var_name,
                'backup_line': var_info['line'],
                'backup_value': var_info['value'],
                'declaration': var_info['declaration']
            })
    
    # Print results
    print("\n" + "=" * 80)
    print("📊 VARIABLE ANALYSIS RESULTS")
    print("=" * 80)
    
    print(f"\n✅ VARIABLES FOUND AND DECLARED IN SRC ({len(found_variables)} variables):")
    print("-" * 60)
    for var in found_variables:
        print(f"  {var['name']:25} | backup:{var['backup_line']:4} | value: {var['backup_value'][:30]}")
        for decl in var['src_declarations'][:1]:  # Show first declaration
            print(f"    └─ declared in {decl['file']}:{decl['line']}")
    
    print(f"\n⚠️  VARIABLES REFERENCED BUT NOT DECLARED ({len(referenced_but_not_declared)} variables):")
    print("-" * 70)
    for var in referenced_but_not_declared:
        print(f"  {var['name']:25} | backup:{var['backup_line']:4} | value: {var['backup_value'][:30]}")
        for ref in var['src_references'][:3]:  # Show first few references
            print(f"    └─ referenced in {ref['file']}:{ref['line']}")
    
    print(f"\n❌ MISSING VARIABLES ({len(missing_variables)} variables):")
    print("-" * 50)
    for var in missing_variables:
        print(f"  {var['name']:25} | backup:{var['backup_line']:4} | {var['declaration']}")
    
    print("\n" + "=" * 80)
    print("📈 SUMMARY:")
    print(f"  Total variables in backup: {len(backup_variables)}")
    print(f"  Found and declared in src: {len(found_variables)}")
    print(f"  Referenced but not declared: {len(referenced_but_not_declared)}")
    print(f"  Completely missing: {len(missing_variables)}")
    print("=" * 80)
    
    # Show critical missing variables
    if referenced_but_not_declared or missing_variables:
        print(f"\n🚨 CRITICAL ISSUES TO FIX:")
        print("-" * 40)
        
        critical_vars = referenced_but_not_declared + missing_variables
        for var in critical_vars:
            print(f"  MISSING: {var['name']} = {var['backup_value']}")
            print(f"    From backup line {var['backup_line']}: {var.get('declaration', 'Referenced but not found')}")

if __name__ == "__main__":
    main()