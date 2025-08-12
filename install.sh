#!/bin/bash

# Gowright MCP Server Installation Script
# This script helps users install and configure the MCP server for cross-project usage

set -e

echo "🚀 Gowright MCP Server Installation"
echo "===================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Check if Go is installed (optional but recommended)
if command -v go &> /dev/null; then
    echo "✅ Go $(go version | awk '{print $3}') detected"
else
    echo "⚠️  Go not detected. Install Go 1.22+ for full functionality."
    echo "   Visit: https://golang.org/dl/"
fi

# Check if uvx is available (preferred installation method)
if command -v uvx &> /dev/null; then
    echo "✅ uvx detected - using uvx for installation"
    INSTALL_METHOD="uvx"
elif command -v npm &> /dev/null; then
    echo "✅ npm detected - using npm for installation"
    INSTALL_METHOD="npm"
else
    echo "❌ Neither uvx nor npm found. Please install one of them first."
    echo "   For uvx: pip install uv"
    echo "   For npm: comes with Node.js"
    exit 1
fi

echo ""
echo "📦 Installing Gowright MCP Server..."

# Install based on available method
if [ "$INSTALL_METHOD" = "uvx" ]; then
    uvx gowright-mcp-server@latest --help > /dev/null 2>&1 || {
        echo "Installing via uvx..."
        uvx --install gowright-mcp-server@latest
    }
    COMMAND="uvx"
    ARGS='["gowright-mcp-server@latest"]'
else
    npm install -g gowright-mcp-server@latest
    COMMAND="gowright-mcp-server"
    ARGS='[]'
fi

echo "✅ Installation completed!"
echo ""

# Create MCP configuration
echo "⚙️  Setting up MCP configuration..."

# Check for existing Kiro settings
WORKSPACE_MCP_DIR=".kiro/settings"
USER_MCP_DIR="$HOME/.kiro/settings"

# Function to create MCP config
create_mcp_config() {
    local config_file="$1"
    local config_dir=$(dirname "$config_file")
    
    # Create directory if it doesn't exist
    mkdir -p "$config_dir"
    
    # Create or update MCP configuration
    if [ -f "$config_file" ]; then
        echo "📝 Updating existing MCP configuration: $config_file"
        # Backup existing config
        cp "$config_file" "$config_file.backup.$(date +%s)"
        
        # Use jq to merge if available, otherwise manual merge
        if command -v jq &> /dev/null; then
            jq --argjson server "{
                \"gowright\": {
                    \"command\": \"$COMMAND\",
                    \"args\": $ARGS,
                    \"disabled\": false,
                    \"autoApprove\": [\"generate_test\", \"generate_config\", \"analyze_project\"]
                }
            }" '.mcpServers += $server' "$config_file" > "$config_file.tmp" && mv "$config_file.tmp" "$config_file"
        else
            echo "⚠️  jq not found. Please manually add the Gowright server to $config_file"
        fi
    else
        echo "📝 Creating new MCP configuration: $config_file"
        cat > "$config_file" << EOF
{
  "mcpServers": {
    "gowright": {
      "command": "$COMMAND",
      "args": $ARGS,
      "disabled": false,
      "autoApprove": [
        "generate_test",
        "generate_config",
        "analyze_project"
      ]
    }
  }
}
EOF
    fi
}

# Ask user where to install configuration
echo ""
echo "📍 Where would you like to install the MCP configuration?"
echo "1) Workspace level (.kiro/settings/mcp.json) - for this project only"
echo "2) User level (~/.kiro/settings/mcp.json) - for all projects"
echo "3) Both"
echo "4) Skip configuration setup"

read -p "Enter choice (1-4): " config_choice

case $config_choice in
    1)
        create_mcp_config "$WORKSPACE_MCP_DIR/mcp.json"
        ;;
    2)
        create_mcp_config "$USER_MCP_DIR/mcp.json"
        ;;
    3)
        create_mcp_config "$WORKSPACE_MCP_DIR/mcp.json"
        create_mcp_config "$USER_MCP_DIR/mcp.json"
        ;;
    4)
        echo "⏭️  Skipping configuration setup"
        ;;
    *)
        echo "❌ Invalid choice. Skipping configuration setup."
        ;;
esac

echo ""
echo "🎉 Installation completed successfully!"
echo ""
echo "📋 Available MCP Tools:"
echo "  • generate_test    - Generate test code for various scenarios"
echo "  • run_test         - Execute Gowright tests"
echo "  • generate_config  - Create configuration files"
echo "  • validate_openapi - Validate OpenAPI specifications"
echo "  • setup_project    - Initialize new Go projects"
echo "  • analyze_project  - Analyze project structure"
echo ""
echo "🚀 Next Steps:"
echo "1. Open your AI assistant (Kiro, Claude, etc.)"
echo "2. Ask: 'Analyze my project structure for testing'"
echo "3. Generate tests: 'Create an API test for /api/users'"
echo "4. Set up configuration: 'Generate a full Gowright config'"
echo ""
echo "📚 Documentation: https://github.com/gowright/framework/tree/main/mcp-server"
echo "🐛 Issues: https://github.com/gowright/framework/issues"
echo ""
echo "Happy testing! 🧪"