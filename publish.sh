#!/bin/bash

# Gowright MCP Server Publishing Script
# 
# This script can be used for local publishing or to trigger the GitHub Action.
# For automated publishing, push a git tag and let GitHub Actions handle it:
#   git tag v1.0.1 && git push origin v1.0.1

set -e

echo "🚀 Publishing Gowright MCP Server..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Run this script from the mcp-server directory."
    exit 1
fi

# Check if we have the required files
if [ ! -f "src/index.ts" ]; then
    echo "❌ Error: src/index.ts not found."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

# Check if build was successful
if [ ! -f "dist/index.js" ]; then
    echo "❌ Error: Build failed. dist/index.js not found."
    exit 1
fi

# Make the built file executable
chmod +x dist/index.js

# Run basic validation
echo "✅ Running validation..."
node dist/index.js --help > /dev/null 2>&1 || echo "⚠️  Warning: Could not run help command"

# Check if user is logged in to npm
if ! npm whoami > /dev/null 2>&1; then
    echo "❌ Error: Not logged in to npm. Run 'npm login' first."
    exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📋 Current version: $CURRENT_VERSION"

# Ask for version bump type
echo "🔢 Select version bump type:"
echo "1) patch (bug fixes)"
echo "2) minor (new features)"
echo "3) major (breaking changes)"
echo "4) custom version"
echo "5) skip version bump"

read -p "Enter choice (1-5): " choice

case $choice in
    1)
        npm version patch
        ;;
    2)
        npm version minor
        ;;
    3)
        npm version major
        ;;
    4)
        read -p "Enter custom version: " custom_version
        npm version $custom_version
        ;;
    5)
        echo "⏭️  Skipping version bump"
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "🆕 New version: $NEW_VERSION"

# Publish to npm
echo "📤 Publishing to npm..."
npm publish

# Create git tag if version was bumped
if [ "$NEW_VERSION" != "$CURRENT_VERSION" ]; then
    echo "🏷️  Creating git tag..."
    git tag "v$NEW_VERSION"
    echo "📤 Pushing tag to trigger GitHub Action..."
    git push origin "v$NEW_VERSION"
    echo ""
    echo "🤖 GitHub Action will handle npm publishing and release creation"
    echo "    Check: https://github.com/gowright/gowright/actions"
else
    echo "📤 Publishing to npm..."
    npm publish
fi

echo "✅ Successfully published gowright-mcp-server@$NEW_VERSION"
echo ""
echo "📋 Installation instructions:"
echo "   uvx gowright-mcp-server@$NEW_VERSION"
echo "   # or"
echo "   npm install -g gowright-mcp-server@$NEW_VERSION"
echo ""
echo "🔧 MCP Configuration:"
echo '   {'
echo '     "mcpServers": {'
echo '       "gowright": {'
echo '         "command": "uvx",'
echo '         "args": ["gowright-mcp-server@'$NEW_VERSION'"]'
echo '       }'
echo '     }'
echo '   }'