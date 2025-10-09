#!/bin/bash

# Auto-fix escaped brackets in MDX files
# This script runs after Decap CMS saves files

echo "Checking for escaped brackets in MDX files..."

# Find all MDX files and fix escaped brackets
find src/content/blog -name "*.mdx" -type f | while read file; do
  # Check if file has escaped brackets
  if grep -q '\\[' "$file" || grep -q '\\]' "$file"; then
    echo "Fixing: $file"

    # Fix escaped brackets
    sed -i.bak 's/\\\[/[/g' "$file"
    sed -i.bak 's/\\\]/]/g' "$file"

    # Remove backup file
    rm "${file}.bak"

    echo "✓ Fixed escaped brackets in $file"
  fi
done

echo "Done!"