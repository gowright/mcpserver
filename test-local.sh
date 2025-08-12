#!/bin/bash

# Gowright MCP Server - Local Testing Script
# This script replicates the CI/CD pipeline for local testing before committing

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Change to mcpserver directory
cd "$(dirname "$0")"

print_step "Starting local CI/CD pipeline simulation..."

# Check Node.js version
print_step "Checking Node.js version..."
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ required. Current version: $(node --version)"
    exit 1
fi
print_success "Node.js version: $(node --version)"

# Clean previous builds
print_step "Cleaning previous builds..."
rm -rf dist/
rm -rf node_modules/.cache/ 2>/dev/null || true
print_success "Cleaned build artifacts"

# Install dependencies
print_step "Installing dependencies..."
if ! npm ci; then
    print_error "Failed to install dependencies"
    exit 1
fi
print_success "Dependencies installed"

# TypeScript type checking
print_step "Running TypeScript type checking..."
if ! npx tsc --noEmit; then
    print_error "TypeScript type checking failed"
    exit 1
fi
print_success "TypeScript type checking passed"

# Check formatting (if prettier is configured)
print_step "Checking code formatting..."
if [ -f ".prettierrc" ] || [ -f "prettier.config.js" ] || [ -f ".prettierrc.json" ]; then
    if ! npx prettier --check .; then
        print_warning "Code formatting issues found. Run 'npx prettier --write .' to fix"
    else
        print_success "Code formatting is correct"
    fi
else
    print_warning "Prettier not configured, skipping format check"
fi

# Build project
print_step "Building project..."
if ! npm run build; then
    print_error "Build failed"
    exit 1
fi
print_success "Build completed"

# Make executable
print_step "Making executable..."
chmod +x dist/index.js
print_success "Made dist/index.js executable"

# Validate build
print_step "Validating build..."
if [ -f "dist/index.js" ] && [ -x "dist/index.js" ]; then
    print_success "Build validation passed - executable created"
else
    print_error "Build validation failed - executable not found or not executable"
    exit 1
fi

# Run tests
print_step "Running tests..."
if ! npm test; then
    print_error "Tests failed"
    exit 1
fi
print_success "Tests passed"

# Check package integrity
print_step "Checking package integrity..."
if ! npm pack --dry-run >/dev/null; then
    print_error "Package integrity check failed"
    exit 1
fi
print_success "Package integrity check passed"

# Test MCP server functionality
print_step "Testing MCP server functionality..."
if [ -f "test-mcp.js" ]; then
    if timeout 10s node test-mcp.js; then
        print_success "MCP server functionality test passed"
    else
        print_error "MCP server functionality test failed"
        exit 1
    fi
else
    # Fallback: Test basic MCP protocol communication
    print_step "Running basic MCP protocol test..."
    
    # Create a temporary test script
    cat > temp-mcp-test.js << 'EOF'
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = join(__dirname, 'dist', 'index.js');
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let hasError = false;

server.stdout.on('data', (data) => {
  output += data.toString();
});

server.stderr.on('data', (data) => {
  hasError = true;
});

const listToolsRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {}
};

setTimeout(() => {
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  
  setTimeout(() => {
    server.kill();
    
    if (hasError) {
      console.error('MCP server test failed');
      process.exit(1);
    }
    
    if (output.includes('generate_test') && output.includes('analyze_project')) {
      console.log('MCP server test passed');
      process.exit(0);
    } else {
      console.error('MCP server test failed - expected tools not found');
      process.exit(1);
    }
  }, 2000);
}, 1000);
EOF
    
    if timeout 10s node temp-mcp-test.js; then
        print_success "Basic MCP protocol test passed"
        rm -f temp-mcp-test.js
    else
        print_error "Basic MCP protocol test failed"
        rm -f temp-mcp-test.js
        exit 1
    fi
fi

# Check for common issues
print_step "Running additional checks..."

# Check for TODO/FIXME comments
TODO_COUNT=$(find src -name "*.ts" -exec grep -l "TODO\|FIXME" {} \; 2>/dev/null | wc -l)
if [ "$TODO_COUNT" -gt 0 ]; then
    print_warning "Found $TODO_COUNT files with TODO/FIXME comments"
fi

# Check for console.log statements (should use proper logging)
CONSOLE_COUNT=$(find src -name "*.ts" -exec grep -l "console\.log" {} \; 2>/dev/null | wc -l)
if [ "$CONSOLE_COUNT" -gt 0 ]; then
    print_warning "Found $CONSOLE_COUNT files with console.log statements"
fi

# Check bundle size
if [ -f "dist/index.js" ]; then
    BUNDLE_SIZE=$(wc -c < dist/index.js)
    BUNDLE_SIZE_KB=$((BUNDLE_SIZE / 1024))
    if [ "$BUNDLE_SIZE_KB" -gt 1000 ]; then
        print_warning "Bundle size is large: ${BUNDLE_SIZE_KB}KB"
    else
        print_success "Bundle size: ${BUNDLE_SIZE_KB}KB"
    fi
fi

# Final summary
echo
print_step "Local CI/CD pipeline completed successfully!"
echo -e "${GREEN}✓ All checks passed${NC}"
echo
echo "Your code is ready for commit and push!"
echo
echo "Next steps:"
echo "  1. git add ."
echo "  2. git commit -m 'your commit message'"
echo "  3. git push"
echo
echo "For publishing:"
echo "  - Create a tag: git tag v1.0.1"
echo "  - Push tag: git push --tags"
echo "  - Or use GitHub workflow dispatch for version bumping"