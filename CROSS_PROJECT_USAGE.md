# Cross-Project Usage Guide

This guide explains how to use the Gowright MCP Server across different projects and development environments.

## Installation Methods

### Method 1: uvx (Recommended)

```bash
# Install uvx if not already installed
pip install uv

# Use the MCP server (auto-installs on first use)
uvx gowright-mcp-server@latest
```

### Method 2: Global npm Installation

```bash
npm install -g gowright-mcp-server@latest
```

### Method 3: Project-Specific Installation

```bash
# In your project directory
npm install gowright-mcp-server@latest
npx gowright-mcp-server
```

## Configuration Levels

The MCP server supports multiple configuration levels for maximum flexibility:

### 1. User-Level Configuration (Global)

**Location:** `~/.kiro/settings/mcp.json`

```json
{
  "mcpServers": {
    "gowright": {
      "command": "uvx",
      "args": ["gowright-mcp-server@latest"],
      "disabled": false,
      "autoApprove": [
        "generate_test",
        "generate_config",
        "analyze_project"
      ]
    }
  }
}
```

**Use Case:** When you want Gowright available across all your projects.

### 2. Workspace-Level Configuration (Project-Specific)

**Location:** `.kiro/settings/mcp.json` (in your project root)

```json
{
  "mcpServers": {
    "gowright": {
      "command": "uvx",
      "args": ["gowright-mcp-server@latest"],
      "disabled": false,
      "autoApprove": [
        "generate_test",
        "run_test",
        "generate_config"
      ],
      "env": {
        "GOWRIGHT_PROJECT_TYPE": "microservice",
        "GOWRIGHT_DEFAULT_CONFIG": "api"
      }
    }
  }
}
```

**Use Case:** When you want project-specific settings or different versions.

## Project Types and Patterns

### 1. Microservices Architecture

For each microservice:

```bash
# Analyze the service
"Analyze this microservice for testing opportunities"

# Generate API tests
"Create API tests for all endpoints in this service"

# Generate integration tests
"Create integration tests between this service and the user service"

# Generate database tests
"Create database tests for user data validation"
```

**Recommended Configuration:**
```json
{
  "configType": "api",
  "baseUrl": "http://localhost:8080",
  "dbDriver": "postgres",
  "dbDsn": "postgres://user:pass@localhost/service_db?sslmode=disable"
}
```

### 2. Monolithic Applications

```bash
# Full project analysis
"Analyze this monolithic application structure"

# Generate comprehensive test suite
"Generate a full test configuration for this application"

# Create module-specific tests
"Create API tests for the user management module"
"Create UI tests for the admin dashboard"
"Create database tests for the reporting module"
```

**Recommended Configuration:**
```json
{
  "configType": "full",
  "baseUrl": "http://localhost:3000",
  "dbDriver": "mysql",
  "dbDsn": "user:pass@tcp(localhost:3306)/app_db"
}
```

### 3. API-First Development

```bash
# OpenAPI validation
"Validate my OpenAPI specification and check for breaking changes"

# Generate tests from spec
"Generate API tests based on my OpenAPI specification"

# Contract testing
"Create contract tests for API consumers"
```

**Recommended Configuration:**
```json
{
  "configType": "api",
  "baseUrl": "https://api.myservice.com",
  "openapi_config": {
    "spec_path": "./api/openapi.yaml",
    "validate_spec": true,
    "check_breaking_changes": true
  }
}
```

### 4. Mobile Applications

```bash
# Mobile test setup
"Set up mobile testing for my Android app"

# Cross-platform testing
"Create tests that work on both Android and iOS"

# API + Mobile integration
"Create integration tests between mobile app and backend API"
```

**Recommended Configuration:**
```json
{
  "configType": "mobile",
  "appiumUrl": "http://localhost:4723",
  "api_config": {
    "base_url": "https://api.mobileapp.com"
  }
}
```

## Environment-Specific Configurations

### Development Environment

```json
{
  "api_config": {
    "base_url": "http://localhost:8080",
    "timeout": "30s"
  },
  "database_config": {
    "connections": {
      "main": {
        "driver": "postgres",
        "dsn": "postgres://dev:dev@localhost/testdb?sslmode=disable"
      }
    }
  }
}
```

### Staging Environment

```json
{
  "api_config": {
    "base_url": "https://staging-api.myapp.com",
    "timeout": "10s",
    "headers": {
      "Authorization": "Bearer ${STAGING_TOKEN}"
    }
  }
}
```

### Production Testing

```json
{
  "api_config": {
    "base_url": "https://api.myapp.com",
    "timeout": "5s",
    "headers": {
      "Authorization": "Bearer ${PROD_TOKEN}"
    }
  },
  "report_config": {
    "local_reports": {
      "json": true,
      "html": true,
      "output_dir": "./prod-test-reports"
    }
  }
}
```

## Team Collaboration

### Shared Configuration Templates

Create template configurations for your team:

**`templates/api-service.json`:**
```json
{
  "log_level": "info",
  "parallel": true,
  "max_retries": 3,
  "api_config": {
    "timeout": "10s",
    "headers": {
      "Content-Type": "application/json",
      "User-Agent": "MyTeam-Test-Client"
    }
  }
}
```

### CI/CD Integration

**GitHub Actions Example:**
```yaml
name: Generate and Run Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Gowright MCP Server
        run: |
          pip install uv
          uvx gowright-mcp-server@latest --help
      
      - name: Generate Tests (would be done via AI assistant)
        run: |
          # This step would typically be done by your AI assistant
          # using the MCP server to generate appropriate tests
          echo "Tests would be generated here"
      
      - name: Run Tests
        run: go test -v ./...
```

## Best Practices

### 1. Configuration Management

- Use environment-specific config files
- Store sensitive data in environment variables
- Version control your configurations (excluding secrets)
- Use the `analyze_project` tool to get recommendations

### 2. Test Organization

```
project/
├── tests/
│   ├── api/
│   │   ├── users_test.go
│   │   └── auth_test.go
│   ├── integration/
│   │   └── workflow_test.go
│   ├── database/
│   │   └── migrations_test.go
│   └── ui/
│       └── dashboard_test.go
├── gowright-config.json
└── gowright-staging.json
```

### 3. Incremental Adoption

1. **Start Small:** Begin with API tests for critical endpoints
2. **Add Layers:** Gradually add database and integration tests
3. **Expand Coverage:** Add UI and mobile tests as needed
4. **Automate:** Integrate with CI/CD pipelines

### 4. Cross-Project Consistency

- Use consistent naming conventions
- Share configuration templates
- Document project-specific patterns
- Regular team reviews of test strategies

## Troubleshooting

### Common Issues

1. **MCP Server Not Found**
   ```bash
   # Check installation
   uvx gowright-mcp-server@latest --help
   # or
   npm list -g gowright-mcp-server
   ```

2. **Configuration Not Loading**
   ```bash
   # Check config file syntax
   cat gowright-config.json | jq .
   ```

3. **Go Module Issues**
   ```bash
   # Ensure you're in a Go project
   go mod init your-project
   go get github.com/gowright/framework
   ```

### Debug Mode

Enable verbose logging:
```json
{
  "mcpServers": {
    "gowright": {
      "env": {
        "FASTMCP_LOG_LEVEL": "DEBUG",
        "GOWRIGHT_DEBUG": "true"
      }
    }
  }
}
```

## Migration Guide

### From Manual Testing

1. Use `analyze_project` to understand current structure
2. Generate basic configuration with `generate_config`
3. Create your first test with `generate_test`
4. Gradually replace manual tests

### From Other Testing Frameworks

1. Analyze existing test patterns
2. Generate equivalent Gowright tests
3. Run both frameworks in parallel during transition
4. Migrate incrementally by test type

## Support and Resources

- **Documentation:** [Gowright Framework](https://gowright.github.io/framework/)
- **Examples:** [MCP Usage Examples](./examples/mcp-usage-examples.md)
- **Issues:** [GitHub Issues](https://github.com/gowright/framework/issues)
- **Community:** [GitHub Discussions](https://github.com/gowright/framework/discussions)
- **MCP Protocol:** [Model Context Protocol](https://modelcontextprotocol.io/)