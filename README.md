# Gowright MCP Server

A Model Context Protocol (MCP) server that provides comprehensive testing capabilities for Go projects using the Gowright testing framework. This server allows AI assistants to generate, configure, and run various types of tests including API, UI, mobile, database, integration, and OpenAPI testing.

## Features

- **Test Generation**: Generate complete test code for different testing scenarios (API, UI, Mobile, Database, Integration, OpenAPI)
- **Test Execution**: Run Gowright tests with various options and parallel execution
- **Configuration Management**: Generate configuration files for different testing setups and environments
- **OpenAPI Validation**: Validate OpenAPI specifications, detect breaking changes, and generate API tests
- **Project Setup**: Initialize new Go projects with Gowright framework and modular architecture
- **Mobile Testing Support**: Generate Appium-based mobile tests for Android and iOS platforms
- **Integration Testing**: Create complex multi-system workflow tests with visual diagrams

## Installation

### Quick Install (Recommended)

```bash
# Using our installation script
curl -fsSL https://raw.githubusercontent.com/gowright/framework/main/mcp-server/install.sh | bash

# Or manually with uvx
uvx gowright-mcp-server@latest

# Or with npm
npm install -g gowright-mcp-server@latest
```

### Development Installation

```bash
# Clone and build
git clone https://github.com/gowright/framework.git
cd framework/mcp-server
npm install
npm run build

# Test the server
npm test

# Run locally
node dist/index.js
```

### Local Testing Before Commit

Before committing your changes, run the local CI/CD pipeline to ensure everything works:

```bash
# Unix/Linux/macOS
./test-local.sh
# or
npm run test-local

# Windows
test-local.bat
# or
npm run test-local-win
```

The local test script replicates the CI/CD pipeline and includes:
- Node.js version validation
- Dependency installation
- TypeScript type checking
- Code formatting validation (if Prettier is configured)
- Project build
- Executable validation
- Test execution
- Package integrity checks
- Bundle size analysis
- Additional code quality checks

This ensures your code will pass CI/CD before you push to the repository.

## MCP Configuration

Add this server to your MCP configuration file:

### Workspace Level (`.kiro/settings/mcp.json`)

```json
{
  "mcpServers": {
    "gowright": {
      "command": "uvx",
      "args": ["gowright-mcp-server@latest"],
      "env": {
        "FASTMCP_LOG_LEVEL": "ERROR"
      },
      "disabled": false,
      "autoApprove": [
        "generate_test",
        "generate_config",
        "validate_openapi"
      ]
    }
  }
}
```

### User Level (`~/.kiro/settings/mcp.json`)

```json
{
  "mcpServers": {
    "gowright": {
      "command": "uvx",
      "args": ["gowright-mcp-server@latest"],
      "env": {
        "FASTMCP_LOG_LEVEL": "ERROR"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## Available Tools

### 1. generate_test

Generate Gowright test code for different testing scenarios.

**Parameters:**
- `testType` (required): Type of test (`api`, `ui`, `mobile`, `database`, `integration`, `openapi`)
- `testName` (required): Name for the test function
- `endpoint` (optional): API endpoint path (for API tests)
- `method` (optional): HTTP method (for API tests)
- `url` (optional): URL to test (for UI tests)
- `selector` (optional): CSS selector or element identifier
- `query` (optional): SQL query (for database tests)
- `connection` (optional): Database connection name
- `platform` (optional): Mobile platform (`android`, `ios`)
- `appPackage` (optional): App package/bundle ID
- `specPath` (optional): Path to OpenAPI specification

**Example:**
```json
{
  "testType": "api",
  "testName": "UserAPI",
  "endpoint": "/api/users",
  "method": "GET"
}
```

### 2. run_test

Run Gowright tests with various options.

**Parameters:**
- `testFile` (required): Path to the test file to run
- `testFunction` (optional): Specific test function to run
- `parallel` (optional): Run tests in parallel
- `verbose` (optional): Enable verbose output

**Example:**
```json
{
  "testFile": "./api_test.go",
  "parallel": true,
  "verbose": true
}
```

### 3. generate_config

Generate Gowright configuration files for different scenarios.

**Parameters:**
- `configType` (required): Type of configuration (`basic`, `api`, `ui`, `mobile`, `database`, `full`)
- `outputPath` (optional): Output path for the config file
- `baseUrl` (optional): Base URL for API testing
- `dbDriver` (optional): Database driver
- `dbDsn` (optional): Database connection string
- `appiumUrl` (optional): Appium server URL

**Example:**
```json
{
  "configType": "full",
  "baseUrl": "https://api.myapp.com",
  "dbDriver": "postgres",
  "dbDsn": "postgres://user:pass@localhost/mydb?sslmode=disable"
}
```

### 4. validate_openapi

Validate OpenAPI specifications and check for breaking changes.

**Parameters:**
- `specPath` (required): Path to the OpenAPI specification file
- `checkBreaking` (optional): Check for breaking changes against previous commit
- `previousCommit` (optional): Git commit to compare against

**Example:**
```json
{
  "specPath": "./api/openapi.yaml",
  "checkBreaking": true,
  "previousCommit": "HEAD~1"
}
```

### 5. setup_project

Initialize a new Go project with Gowright framework.

**Parameters:**
- `projectName` (required): Name of the Go project
- `modulePath` (required): Go module path
- `includeExamples` (optional): Include example test files

**Example:**
```json
{
  "projectName": "my-test-project",
  "modulePath": "github.com/myorg/my-test-project",
  "includeExamples": true
}
```

## Usage Examples

### Generate an API Test

Ask your AI assistant:
> "Generate an API test for the GET /api/users endpoint"

The MCP server will create a complete Go test file with:
- Proper imports and setup
- API client configuration
- Test execution with assertions
- Error handling and cleanup

### Create a Mobile Test

Ask your AI assistant:
> "Create an Android mobile test for the login button in com.myapp.mobile"

The server will generate:
- Appium client setup with Android capabilities
- Element finding and interaction
- Screenshot capture
- Proper session management

### Set Up a New Project

Ask your AI assistant:
> "Initialize a new Go testing project called 'api-tests' with module path 'github.com/myorg/api-tests'"

The server will:
- Initialize Go module
- Add Gowright dependency
- Create main.go and test files
- Generate configuration files
- Provide next steps

### Validate OpenAPI Specification

Ask your AI assistant:
> "Validate my OpenAPI spec at ./api/openapi.yaml and check for breaking changes"

The server will:
- Generate validation test code
- Check specification validity
- Detect circular references
- Compare with previous git commit
- Report any issues found

## Test Types Supported

### API Testing
- HTTP/REST API testing with go-resty
- Request/response validation
- Status code and header checks
- JSON path assertions

### UI Testing
- Browser automation with go-rod
- Element interaction and validation
- Screenshot capture
- Wait conditions and timeouts

### Mobile Testing
- Cross-platform mobile testing with Appium
- Android and iOS support
- Touch gestures and interactions
- Device management

### Database Testing
- Multi-database support
- Transaction management
- Query execution and validation
- Setup and teardown operations

### Integration Testing
- Multi-system workflow testing
- Step-by-step execution
- Cross-module validation
- Visual flow diagrams

### OpenAPI Testing
- Specification validation
- Breaking change detection
- Circular reference checking
- Schema compliance testing

## Requirements

- Go 1.22 or later
- Node.js 18 or later (for MCP server)
- Gowright framework dependencies
- Chrome/Chromium (for UI testing)
- Appium server (for mobile testing)
- Database drivers (for database testing)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Cross-Project Usage

This MCP server is designed to work seamlessly across different projects and development environments. See our [Cross-Project Usage Guide](./CROSS_PROJECT_USAGE.md) for detailed information on:

- Multi-project configuration strategies
- Team collaboration patterns
- CI/CD integration
- Environment-specific setups
- Migration from other testing frameworks

## Quick Start for Different Project Types

### Microservices
```bash
# Ask your AI assistant:
"Analyze this microservice and generate API tests for all endpoints"
```

### Monolithic Applications
```bash
# Ask your AI assistant:
"Generate a full test configuration for this application with API, database, and UI testing"
```

### API-First Development
```bash
# Ask your AI assistant:
"Validate my OpenAPI spec and generate comprehensive API tests"
```

### Mobile Applications
```bash
# Ask your AI assistant:
"Set up mobile testing for Android and iOS with API integration tests"
```

## Support

- **Documentation:** [Gowright Framework Docs](https://gowright.github.io/framework/)
- **Cross-Project Guide:** [Cross-Project Usage](./CROSS_PROJECT_USAGE.md)
- **Examples:** [Usage Examples](./examples/mcp-usage-examples.md)
- **Issues:** [GitHub Issues](https://github.com/gowright/framework/issues)
- **Discussions:** [GitHub Discussions](https://github.com/gowright/framework/discussions)
- **MCP Protocol:** [Model Context Protocol](https://modelcontextprotocol.io/)