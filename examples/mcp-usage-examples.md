# Gowright MCP Server Usage Examples

This document provides comprehensive examples of how to use the Gowright MCP server across different projects and scenarios.

## Quick Setup

### 1. Install and Configure

```bash
# Install via uvx (recommended)
uvx gowright-mcp-server@latest

# Or install globally via npm
npm install -g gowright-mcp-server
```

### 2. Add to MCP Configuration

**Workspace Level** (`.kiro/settings/mcp.json`):
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
        "generate_config"
      ]
    }
  }
}
```

## Usage Examples

### 1. Generate API Tests

**Prompt:** "Generate an API test for the GET /api/users endpoint"

**MCP Tool Call:**
```json
{
  "tool": "generate_test",
  "parameters": {
    "testType": "api",
    "testName": "UserAPI",
    "endpoint": "/api/users",
    "method": "GET"
  }
}
```

**Result:** Complete Go test file with API client setup, request execution, and assertions.

### 2. Create Mobile Tests

**Prompt:** "Create an Android test for login button in com.myapp.mobile"

**MCP Tool Call:**
```json
{
  "tool": "generate_test",
  "parameters": {
    "testType": "mobile",
    "testName": "LoginButton",
    "platform": "android",
    "appPackage": "com.myapp.mobile",
    "selector": "login-button"
  }
}
```

### 3. Database Testing

**Prompt:** "Generate a database test to verify user count"

**MCP Tool Call:**
```json
{
  "tool": "generate_test",
  "parameters": {
    "testType": "database",
    "testName": "UserCount",
    "query": "SELECT COUNT(*) FROM users WHERE active = true",
    "connection": "main"
  }
}
```

### 4. UI Testing

**Prompt:** "Create a UI test for the login form on https://myapp.com/login"

**MCP Tool Call:**
```json
{
  "tool": "generate_test",
  "parameters": {
    "testType": "ui",
    "testName": "LoginForm",
    "url": "https://myapp.com/login",
    "selector": "#login-form"
  }
}
```

### 5. Integration Testing

**Prompt:** "Generate an integration test for user registration workflow"

**MCP Tool Call:**
```json
{
  "tool": "generate_test",
  "parameters": {
    "testType": "integration",
    "testName": "UserRegistration"
  }
}
```

### 6. OpenAPI Validation

**Prompt:** "Validate my OpenAPI spec and check for breaking changes"

**MCP Tool Call:**
```json
{
  "tool": "validate_openapi",
  "parameters": {
    "specPath": "./api/openapi.yaml",
    "checkBreaking": true,
    "previousCommit": "HEAD~1"
  }
}
```

## Configuration Examples

### Full Project Configuration

**Prompt:** "Generate a complete Gowright configuration for my project"

**MCP Tool Call:**
```json
{
  "tool": "generate_config",
  "parameters": {
    "configType": "full",
    "baseUrl": "https://api.myproject.com",
    "dbDriver": "postgres",
    "dbDsn": "postgres://user:pass@localhost/mydb?sslmode=disable",
    "appiumUrl": "http://localhost:4723"
  }
}
```

### API-Only Configuration

**MCP Tool Call:**
```json
{
  "tool": "generate_config",
  "parameters": {
    "configType": "api",
    "baseUrl": "https://api.example.com"
  }
}
```

## Project Setup Examples

### New Go Testing Project

**Prompt:** "Initialize a new Go testing project called 'api-tests'"

**MCP Tool Call:**
```json
{
  "tool": "setup_project",
  "parameters": {
    "projectName": "api-tests",
    "modulePath": "github.com/myorg/api-tests",
    "includeExamples": true
  }
}
```

## Running Tests

### Execute Specific Test

**MCP Tool Call:**
```json
{
  "tool": "run_test",
  "parameters": {
    "testFile": "./api_test.go",
    "testFunction": "TestUserAPI",
    "verbose": true
  }
}
```

### Run All Tests in Parallel

**MCP Tool Call:**
```json
{
  "tool": "run_test",
  "parameters": {
    "testFile": "./...",
    "parallel": true,
    "verbose": true
  }
}
```

## Cross-Project Usage Patterns

### 1. Microservices Testing

For each microservice:
1. Generate service-specific API tests
2. Create integration tests between services
3. Set up database tests for data validation
4. Configure OpenAPI validation for API contracts

### 2. Full-Stack Application Testing

1. **Backend API Tests**: Test all REST endpoints
2. **Frontend UI Tests**: Test user workflows
3. **Mobile App Tests**: Test mobile-specific features
4. **Integration Tests**: Test end-to-end workflows
5. **Database Tests**: Validate data integrity

### 3. CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test with Gowright
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v3
        with:
          go-version: '1.22'
      
      # Use MCP server to generate tests
      - name: Generate Tests
        run: |
          # This would be called via your AI assistant
          # using the MCP server to generate appropriate tests
          
      - name: Run Tests
        run: go test -v ./...
```

## Advanced Usage

### Custom Test Templates

You can extend the MCP server by modifying the test generation templates in the source code to match your organization's standards.

### Environment-Specific Configurations

Generate different configurations for different environments:

```json
{
  "tool": "generate_config",
  "parameters": {
    "configType": "api",
    "baseUrl": "https://staging-api.myproject.com",
    "outputPath": "gowright-staging.json"
  }
}
```

### Batch Test Generation

Generate multiple related tests:

1. Generate API tests for all endpoints
2. Generate corresponding integration tests
3. Generate database validation tests
4. Generate UI tests for critical paths

## Troubleshooting

### Common Issues

1. **Go Module Not Found**: Ensure you're in a Go project directory with `go.mod`
2. **Import Path Issues**: Check that the Gowright framework is properly installed
3. **Configuration Errors**: Validate your `gowright-config.json` syntax
4. **Test Execution Failures**: Ensure all dependencies are installed

### Debug Mode

Enable verbose logging:
```json
{
  "mcpServers": {
    "gowright": {
      "env": {
        "FASTMCP_LOG_LEVEL": "DEBUG"
      }
    }
  }
}
```

## Best Practices

1. **Start Simple**: Begin with basic API or UI tests
2. **Incremental Complexity**: Add database and integration tests gradually
3. **Configuration Management**: Use environment-specific configs
4. **Test Organization**: Group related tests in separate files
5. **CI/CD Integration**: Automate test generation and execution
6. **Documentation**: Document your test scenarios and expected outcomes

## Support and Resources

- **Framework Documentation**: [Gowright Docs](https://gowright.github.io/framework/)
- **MCP Protocol**: [Model Context Protocol](https://modelcontextprotocol.io/)
- **Issues**: [GitHub Issues](https://github.com/gowright/framework/issues)
- **Community**: [GitHub Discussions](https://github.com/gowright/framework/discussions)