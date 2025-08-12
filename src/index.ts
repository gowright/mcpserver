#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { detectProjectContext, sanitizeTestName, validateGoEnvironment, getGowrightVersion } from './utils.js';
import { GowrightTestTemplates } from './templates.js';
import { ConfigManager } from './config.js';

// Zod schemas for tool parameters
const GenerateTestSchema = z.object({
  testType: z.enum(['api', 'ui', 'mobile', 'database', 'integration', 'openapi']),
  testName: z.string(),
  endpoint: z.string().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
  url: z.string().optional(),
  selector: z.string().optional(),
  query: z.string().optional(),
  connection: z.string().optional(),
  platform: z.enum(['android', 'ios']).optional(),
  appPackage: z.string().optional(),
  specPath: z.string().optional(),
});

const RunTestSchema = z.object({
  testFile: z.string(),
  testFunction: z.string().optional(),
  parallel: z.boolean().optional(),
  verbose: z.boolean().optional(),
});

const GenerateConfigSchema = z.object({
  configType: z.enum(['basic', 'api', 'ui', 'mobile', 'database', 'full']),
  outputPath: z.string().optional(),
  baseUrl: z.string().optional(),
  dbDriver: z.string().optional(),
  dbDsn: z.string().optional(),
  appiumUrl: z.string().optional(),
});

const ValidateOpenAPISchema = z.object({
  specPath: z.string(),
  checkBreaking: z.boolean().optional(),
  previousCommit: z.string().optional(),
});

const SetupProjectSchema = z.object({
  projectName: z.string(),
  modulePath: z.string(),
  includeExamples: z.boolean().optional(),
});

const AnalyzeProjectSchema = z.object({
  path: z.string().optional(),
});

class GowrightMCPServer {
  private server: Server;
  private templates: GowrightTestTemplates;
  private configManager: ConfigManager;

  constructor() {
    this.server = new Server(
      {
        name: 'gowright-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.templates = new GowrightTestTemplates();
    this.configManager = ConfigManager.getInstance();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'generate_test',
            description: 'Generate Gowright test code for different testing scenarios (API, UI, Mobile, Database, Integration, OpenAPI)',
            inputSchema: {
              type: 'object',
              properties: {
                testType: {
                  type: 'string',
                  enum: ['api', 'ui', 'mobile', 'database', 'integration', 'openapi'],
                  description: 'Type of test to generate'
                },
                testName: {
                  type: 'string',
                  description: 'Name for the test function'
                },
                endpoint: {
                  type: 'string',
                  description: 'API endpoint path (for API tests)'
                },
                method: {
                  type: 'string',
                  enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
                  description: 'HTTP method (for API tests)'
                },
                url: {
                  type: 'string',
                  description: 'URL to test (for UI tests)'
                },
                selector: {
                  type: 'string',
                  description: 'CSS selector or element identifier (for UI/Mobile tests)'
                },
                query: {
                  type: 'string',
                  description: 'SQL query (for database tests)'
                },
                connection: {
                  type: 'string',
                  description: 'Database connection name (for database tests)'
                },
                platform: {
                  type: 'string',
                  enum: ['android', 'ios'],
                  description: 'Mobile platform (for mobile tests)'
                },
                appPackage: {
                  type: 'string',
                  description: 'App package/bundle ID (for mobile tests)'
                },
                specPath: {
                  type: 'string',
                  description: 'Path to OpenAPI specification (for OpenAPI tests)'
                }
              },
              required: ['testType', 'testName']
            }
          },
          {
            name: 'run_test',
            description: 'Run Gowright tests with various options',
            inputSchema: {
              type: 'object',
              properties: {
                testFile: {
                  type: 'string',
                  description: 'Path to the test file to run'
                },
                testFunction: {
                  type: 'string',
                  description: 'Specific test function to run (optional)'
                },
                parallel: {
                  type: 'boolean',
                  description: 'Run tests in parallel'
                },
                verbose: {
                  type: 'boolean',
                  description: 'Enable verbose output'
                }
              },
              required: ['testFile']
            }
          },
          {
            name: 'generate_config',
            description: 'Generate Gowright configuration files for different scenarios',
            inputSchema: {
              type: 'object',
              properties: {
                configType: {
                  type: 'string',
                  enum: ['basic', 'api', 'ui', 'mobile', 'database', 'full'],
                  description: 'Type of configuration to generate'
                },
                outputPath: {
                  type: 'string',
                  description: 'Output path for the config file (default: gowright-config.json)'
                },
                baseUrl: {
                  type: 'string',
                  description: 'Base URL for API testing'
                },
                dbDriver: {
                  type: 'string',
                  description: 'Database driver (postgres, mysql, sqlite3)'
                },
                dbDsn: {
                  type: 'string',
                  description: 'Database connection string'
                },
                appiumUrl: {
                  type: 'string',
                  description: 'Appium server URL (default: http://localhost:4723)'
                }
              },
              required: ['configType']
            }
          },
          {
            name: 'validate_openapi',
            description: 'Validate OpenAPI specifications and check for breaking changes',
            inputSchema: {
              type: 'object',
              properties: {
                specPath: {
                  type: 'string',
                  description: 'Path to the OpenAPI specification file'
                },
                checkBreaking: {
                  type: 'boolean',
                  description: 'Check for breaking changes against previous commit'
                },
                previousCommit: {
                  type: 'string',
                  description: 'Git commit to compare against (default: HEAD~1)'
                }
              },
              required: ['specPath']
            }
          },
          {
            name: 'setup_project',
            description: 'Initialize a new Go project with Gowright framework',
            inputSchema: {
              type: 'object',
              properties: {
                projectName: {
                  type: 'string',
                  description: 'Name of the Go project'
                },
                modulePath: {
                  type: 'string',
                  description: 'Go module path (e.g., github.com/user/project)'
                },
                includeExamples: {
                  type: 'boolean',
                  description: 'Include example test files'
                }
              },
              required: ['projectName', 'modulePath']
            }
          },
          {
            name: 'analyze_project',
            description: 'Analyze current project structure and provide recommendations for Gowright testing setup',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Path to analyze (defaults to current directory)'
                }
              },
              required: []
            }
          }
        ] as Tool[],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'generate_test':
            return await this.generateTest(GenerateTestSchema.parse(args));
          case 'run_test':
            return await this.runTest(RunTestSchema.parse(args));
          case 'generate_config':
            return await this.generateConfig(GenerateConfigSchema.parse(args));
          case 'validate_openapi':
            return await this.validateOpenAPI(ValidateOpenAPISchema.parse(args));
          case 'setup_project':
            return await this.setupProject(SetupProjectSchema.parse(args));
          case 'analyze_project':
            return await this.analyzeProject(AnalyzeProjectSchema.parse(args));
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    });
  }

  private async generateTest(params: z.infer<typeof GenerateTestSchema>) {
    const { testType, testName, endpoint, method, url, selector, query, connection, platform, appPackage, specPath } = params;
    
    // Validate Go environment
    const goEnv = validateGoEnvironment();
    if (!goEnv.valid) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${goEnv.error}`,
          },
        ],
      };
    }

    // Detect project context
    const context = detectProjectContext();
    const sanitizedTestName = sanitizeTestName(testName);
    
    let testCode = '';
    
    switch (testType) {
      case 'api':
        testCode = this.templates.generateAPITest(sanitizedTestName, endpoint || '/api/test', method || 'GET', context);
        break;
      case 'ui':
        testCode = this.templates.generateUITest(sanitizedTestName, url || 'https://example.com', selector || 'button', context);
        break;
      case 'mobile':
        testCode = this.templates.generateMobileTest(sanitizedTestName, platform || 'android', appPackage || 'com.example.app', selector || 'button', context);
        break;
      case 'database':
        testCode = this.templates.generateDatabaseTest(sanitizedTestName, query || 'SELECT COUNT(*) FROM users', connection || 'main', context);
        break;
      case 'integration':
        testCode = this.templates.generateIntegrationTest(sanitizedTestName, context);
        break;
      case 'openapi':
        testCode = this.templates.generateOpenAPITest(sanitizedTestName, specPath || 'openapi.yaml', context);
        break;
    }

    // Write test file
    const testFileName = `${testName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_test.go`;
    
    try {
      writeFileSync(testFileName, testCode);
      
      return {
        content: [
          {
            type: 'text',
            text: `Generated ${testType} test and saved to ${testFileName}:\n\n\`\`\`go\n${testCode}\n\`\`\`\n\n**Project Context:**\n- Go Project: ${context.isGoProject ? 'Yes' : 'No'}\n- Has Gowright Config: ${context.hasGowrightConfig ? 'Yes' : 'No'}\n- Module Path: ${context.modulePath || 'Not detected'}\n\n**Next Steps:**\n1. Review the generated test code\n2. Adjust configuration values as needed\n3. Run: \`go test -v ${testFileName}\``,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Generated ${testType} test code:\n\n\`\`\`go\n${testCode}\n\`\`\`\n\nFailed to write file: ${error}\n\nYou can copy the code above and save it manually as ${testFileName}`,
          },
        ],
      };
    }
  }

  private async analyzeProject(params: z.infer<typeof AnalyzeProjectSchema>) {
    const { path } = params;
    const projectPath = path || process.cwd();
    
    try {
      const context = detectProjectContext(projectPath);
      const goEnv = validateGoEnvironment();
      
      let analysis = `# Project Analysis\n\n`;
      
      // Go Environment
      analysis += `## Go Environment\n`;
      analysis += `- Go Installed: ${goEnv.valid ? '✅ Yes' : '❌ No'}\n`;
      if (!goEnv.valid) {
        analysis += `- Error: ${goEnv.error}\n`;
      }
      
      // Project Structure
      analysis += `\n## Project Structure\n`;
      analysis += `- Is Go Project: ${context.isGoProject ? '✅ Yes' : '❌ No'}\n`;
      analysis += `- Module Path: ${context.modulePath || 'Not detected'}\n`;
      analysis += `- Has Gowright Config: ${context.hasGowrightConfig ? '✅ Yes' : '❌ No'}\n`;
      analysis += `- Project Root: ${context.projectRoot}\n`;
      
      // Detect existing test files
      const testFiles = this.findTestFiles(projectPath);
      analysis += `\n## Existing Tests\n`;
      analysis += `- Test Files Found: ${testFiles.length}\n`;
      if (testFiles.length > 0) {
        analysis += testFiles.map(f => `  - ${f}`).join('\n') + '\n';
      }
      
      // Recommendations
      analysis += `\n## Recommendations\n`;
      
      if (!goEnv.valid) {
        analysis += `1. ❗ Install Go 1.22 or later\n`;
      }
      
      if (!context.isGoProject) {
        analysis += `2. 🔧 Initialize Go module: \`go mod init <module-path>\`\n`;
      }
      
      if (!context.hasGowrightConfig) {
        analysis += `3. ⚙️ Generate Gowright configuration using the \`generate_config\` tool\n`;
      }
      
      if (testFiles.length === 0) {
        analysis += `4. 🧪 Generate your first test using the \`generate_test\` tool\n`;
      }
      
      // Suggest test types based on project structure
      const suggestions = this.suggestTestTypes(projectPath);
      if (suggestions.length > 0) {
        analysis += `\n## Suggested Test Types\n`;
        analysis += suggestions.map(s => `- ${s}`).join('\n') + '\n';
      }
      
      return {
        content: [
          {
            type: 'text',
            text: analysis,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error analyzing project: ${error}`,
          },
        ],
      };
    }
  }

  private findTestFiles(projectPath: string): string[] {
    try {
      const { execSync } = require('child_process');
      const output = execSync('find . -name "*_test.go" -type f', { 
        cwd: projectPath,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      return output.trim().split('\n').filter((f: string) => f.length > 0);
    } catch (error) {
      // Fallback for Windows or if find command fails
      try {
        const { readdirSync, statSync } = require('fs');
        const { join } = require('path');
        
        const findTestFilesRecursive = (dir: string): string[] => {
          const files: string[] = [];
          const items = readdirSync(dir);
          
          for (const item of items) {
            const fullPath = join(dir, item);
            const stat = statSync(fullPath);
            
            if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
              files.push(...findTestFilesRecursive(fullPath));
            } else if (stat.isFile() && item.endsWith('_test.go')) {
              files.push(fullPath.replace(projectPath, '.'));
            }
          }
          
          return files;
        };
        
        return findTestFilesRecursive(projectPath);
      } catch (fallbackError) {
        return [];
      }
    }
  }

  private suggestTestTypes(projectPath: string): string[] {
    const suggestions: string[] = [];
    
    try {
      // Check for common patterns that suggest specific test types
      const { existsSync } = require('fs');
      const { join } = require('path');
      
      // API testing suggestions
      if (existsSync(join(projectPath, 'main.go')) || 
          existsSync(join(projectPath, 'server.go')) ||
          existsSync(join(projectPath, 'api')) ||
          existsSync(join(projectPath, 'handlers'))) {
        suggestions.push('🌐 **API Testing** - Detected potential web server/API code');
      }
      
      // Database testing suggestions
      if (existsSync(join(projectPath, 'migrations')) ||
          existsSync(join(projectPath, 'models')) ||
          existsSync(join(projectPath, 'database'))) {
        suggestions.push('🗄️ **Database Testing** - Detected database-related code');
      }
      
      // OpenAPI testing suggestions
      if (existsSync(join(projectPath, 'openapi.yaml')) ||
          existsSync(join(projectPath, 'openapi.yml')) ||
          existsSync(join(projectPath, 'swagger.yaml')) ||
          existsSync(join(projectPath, 'api.yaml'))) {
        suggestions.push('📋 **OpenAPI Testing** - Detected OpenAPI specification');
      }
      
      // Integration testing suggestions
      if (suggestions.length > 1) {
        suggestions.push('🔗 **Integration Testing** - Multiple components detected');
      }
      
      // UI testing suggestions (less common for Go projects but possible)
      if (existsSync(join(projectPath, 'web')) ||
          existsSync(join(projectPath, 'static')) ||
          existsSync(join(projectPath, 'templates'))) {
        suggestions.push('🖥️ **UI Testing** - Detected web frontend code');
      }
      
    } catch (error) {
      // Ignore errors in suggestion detection
    }
    
    return suggestions;
  }

  private async runTest(params: z.infer<typeof RunTestSchema>) {
    const { testFile, testFunction, parallel, verbose } = params;
    
    try {
      let command = 'go test';
      
      if (verbose) {
        command += ' -v';
      }
      
      if (parallel) {
        command += ' -parallel 4';
      }
      
      if (testFunction) {
        command += ` -run ${testFunction}`;
      }
      
      command += ` ${testFile}`;
      
      const output = execSync(command, { 
        encoding: 'utf8',
        cwd: process.cwd(),
        timeout: 300000 // 5 minutes timeout
      });
      
      return {
        content: [
          {
            type: 'text',
            text: `Test execution completed successfully:\n\n\`\`\`\n${output}\n\`\`\``,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Test execution failed:\n\n\`\`\`\n${error.stdout || error.message}\n\`\`\``,
          },
        ],
      };
    }
  }

  private async generateConfig(params: z.infer<typeof GenerateConfigSchema>) {
    const { configType, outputPath, baseUrl, dbDriver, dbDsn, appiumUrl } = params;
    
    let config: any = {
      log_level: "info",
      parallel: true,
      max_retries: 3,
    };
    
    switch (configType) {
      case 'basic':
        // Basic config is already set above
        break;
        
      case 'api':
        config.api_config = {
          base_url: baseUrl || "https://api.example.com",
          timeout: "10s",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Gowright-Test-Client"
          }
        };
        break;
        
      case 'ui':
        config.browser_config = {
          headless: true,
          timeout: "30s",
          window_size: {
            width: 1920,
            height: 1080
          }
        };
        break;
        
      case 'mobile':
        config.appium_config = {
          server_url: appiumUrl || "http://localhost:4723",
          timeout: "30s",
          default_capabilities: {
            newCommandTimeout: 60,
            noReset: true
          }
        };
        break;
        
      case 'database':
        config.database_config = {
          connections: {
            main: {
              driver: dbDriver || "postgres",
              dsn: dbDsn || "postgres://user:pass@localhost/testdb?sslmode=disable"
            }
          }
        };
        break;
        
      case 'full':
        config = {
          ...config,
          browser_config: {
            headless: true,
            timeout: "30s",
            window_size: { width: 1920, height: 1080 }
          },
          api_config: {
            base_url: baseUrl || "https://api.example.com",
            timeout: "10s",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "Gowright-Test-Client"
            }
          },
          database_config: {
            connections: {
              main: {
                driver: dbDriver || "postgres",
                dsn: dbDsn || "postgres://user:pass@localhost/testdb?sslmode=disable"
              }
            }
          },
          appium_config: {
            server_url: appiumUrl || "http://localhost:4723",
            timeout: "30s",
            default_capabilities: {
              newCommandTimeout: 60,
              noReset: true
            }
          },
          openapi_config: {
            spec_path: "openapi.yaml",
            validate_spec: true,
            detect_circular_refs: true,
            check_breaking_changes: true,
            previous_commit: "HEAD~1",
            fail_on_warnings: false
          },
          report_config: {
            local_reports: {
              json: true,
              html: true,
              output_dir: "./test-reports"
            }
          }
        };
        break;
    }
    
    const configJson = JSON.stringify(config, null, 2);
    const filePath = outputPath || 'gowright-config.json';
    
    try {
      writeFileSync(filePath, configJson);
      
      return {
        content: [
          {
            type: 'text',
            text: `Generated ${configType} configuration file at ${filePath}:\n\n\`\`\`json\n${configJson}\n\`\`\``,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to write config file: ${error}\n\nGenerated configuration:\n\n\`\`\`json\n${configJson}\n\`\`\``,
          },
        ],
      };
    }
  }

  private async validateOpenAPI(params: z.infer<typeof ValidateOpenAPISchema>) {
    const { specPath, checkBreaking, previousCommit } = params;
    
    if (!existsSync(specPath)) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: OpenAPI specification file not found at ${specPath}`,
          },
        ],
      };
    }
    
    try {
      // Generate a simple validation test
      const testCode = `package main

import (
    "testing"
    
    "github/gowright/framework/pkg/openapi"
    "github.com/stretchr/testify/assert"
)

func TestOpenAPIValidation(t *testing.T) {
    tester, err := openapi.NewOpenAPITester("${specPath}")
    assert.NoError(t, err)
    defer tester.Close()
    
    // Validate specification
    result := tester.ValidateSpec()
    assert.True(t, result.Passed, "OpenAPI specification should be valid")
    
    // Check for circular references
    circularResult := tester.DetectCircularReferences()
    assert.True(t, circularResult.Passed, "No circular references should be found")
    
    ${checkBreaking ? `// Check for breaking changes
    breakingResult := tester.CheckBreakingChanges("${previousCommit || 'HEAD~1'}")
    assert.True(t, breakingResult.Passed, "No breaking changes should be detected")` : ''}
    
    t.Logf("Validation completed: %s", result.Message)
}`;
      
      // Write the test file
      const testFilePath = 'openapi_validation_test.go';
      writeFileSync(testFilePath, testCode);
      
      // Try to run the validation test
      try {
        const output = execSync(`go test -v ${testFilePath}`, { 
          encoding: 'utf8',
          timeout: 60000 
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `OpenAPI validation completed:\n\n\`\`\`\n${output}\n\`\`\`\n\nGenerated test file: ${testFilePath}`,
            },
          ],
        };
      } catch (testError: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Generated validation test file: ${testFilePath}\n\n\`\`\`go\n${testCode}\n\`\`\`\n\nNote: Run 'go test -v ${testFilePath}' to execute the validation.\n\nTest execution failed: ${testError.stdout || testError.message}`,
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error validating OpenAPI specification: ${error}`,
          },
        ],
      };
    }
  }

  private async setupProject(params: z.infer<typeof SetupProjectSchema>) {
    const { projectName, modulePath, includeExamples } = params;
    
    try {
      // Initialize Go module
      execSync(`go mod init ${modulePath}`, { cwd: process.cwd() });
      
      // Add Gowright dependency
      execSync(`go get github/gowright/framework`, { cwd: process.cwd() });
      
      // Create basic project structure
      const mainGo = `package main

import (
    "fmt"
    "time"
    
    "github/gowright/framework/pkg/gowright"
)

func main() {
    // Create framework with default configuration
    framework := gowright.NewWithDefaults()
    defer framework.Close()
    
    // Initialize the framework
    if err := framework.Initialize(); err != nil {
        panic(err)
    }
    
    fmt.Println("${projectName} - Gowright framework initialized successfully!")
}`;

      writeFileSync('main.go', mainGo);
      
      // Create basic test file
      const basicTest = `package main

import (
    "testing"
    "time"
    
    "github/gowright/framework/pkg/gowright"
    "github.com/stretchr/testify/assert"
)

func TestFrameworkInitialization(t *testing.T) {
    framework := gowright.NewWithDefaults()
    defer framework.Close()
    
    err := framework.Initialize()
    assert.NoError(t, err)
    
    t.Log("Framework initialized successfully")
}`;

      writeFileSync('main_test.go', basicTest);
      
      // Create basic config
      const basicConfig = {
        log_level: "info",
        parallel: true,
        max_retries: 3,
        report_config: {
          local_reports: {
            json: true,
            html: true,
            output_dir: "./test-reports"
          }
        }
      };
      
      writeFileSync('gowright-config.json', JSON.stringify(basicConfig, null, 2));
      
      let output = `Project ${projectName} initialized successfully!\n\nFiles created:\n- main.go\n- main_test.go\n- gowright-config.json\n- go.mod`;
      
      if (includeExamples) {
        // Create examples directory with sample tests
        const context = detectProjectContext();
        const exampleTests = [
          {
            name: 'api_test.go',
            content: this.templates.generateAPITest('APIExample', '/api/health', 'GET', context)
          },
          {
            name: 'ui_test.go', 
            content: this.templates.generateUITest('UIExample', 'https://example.com', 'button#submit', context)
          }
        ];
        
        for (const example of exampleTests) {
          writeFileSync(example.name, example.content);
        }
        
        output += `\n- ${exampleTests.map(e => e.name).join('\n- ')}`;
      }
      
      return {
        content: [
          {
            type: 'text',
            text: output + `\n\nNext steps:\n1. Run 'go mod tidy' to download dependencies\n2. Run 'go test' to execute tests\n3. Run 'go run main.go' to start the application`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error setting up project: ${error}`,
          },
        ],
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new GowrightMCPServer();
server.run().catch(console.error);