#!/bin/bash

echo "🔄 Starting build watcher for cmmn-js-properties-panel-flowable..."
echo "Watching lib/ and styles/ directories for changes..."
echo "Press Ctrl+C to stop"

# Run initial build
npm run build

# Use fswatch if available, otherwise use a basic polling approach
if command -v fswatch >/dev/null 2>&1; then
    echo "Using fswatch for file monitoring..."
    fswatch -o lib/ styles/ | while read f; do
        echo "📁 Files changed, rebuilding..."
        npm run build
        echo "✅ Build completed at $(date)"
    done
else
    echo "fswatch not found. Using basic polling (install fswatch with: brew install fswatch for better performance)"
    
    # Basic polling approach
    LAST_MODIFIED=""
    while true; do
        CURRENT_MODIFIED=$(find lib styles -type f \( -name "*.js" -o -name "*.less" \) -exec stat -f "%m" {} \; | sort -nr | head -1)
        
        if [ "$CURRENT_MODIFIED" != "$LAST_MODIFIED" ] && [ -n "$LAST_MODIFIED" ]; then
            echo "📁 Files changed, rebuilding..."
            npm run build
            echo "✅ Build completed at $(date)"
        fi
        
        LAST_MODIFIED="$CURRENT_MODIFIED"
        sleep 2
    done
fi