import { ProjectContext } from './utils.js';

export interface TestTemplate {
  generateAPITest(testName: string, endpoint: string, method: string, context: ProjectContext): string;
  generateUITest(testName: string, url: string, selector: string, context: ProjectContext): string;
  generateMobileTest(testName: string, platform: string, appPackage: string, selector: string, context: ProjectContext): string;
  generateDatabaseTest(testName: string, query: string, connection: string, context: ProjectContext): string;
  generateIntegrationTest(testName: string, context: ProjectContext): string;
  generateOpenAPITest(testName: string, specPath: string, context: ProjectContext): string;
}

export class GowrightTestTemplates implements TestTemplate {
  generateAPITest(testName: string, endpoint: string, method: string, context: ProjectContext): string {
    const packageName = this.getPackageName(context);
    const imports = this.getImports(context, ['api']);
    
    return `${packageName}

${imports}

func Test${testName}(t *testing.T) {
    // Load configuration
    config, err := gowright.LoadConfig("gowright-config.json")
    if err != nil {
        // Fallback to default API config
        config = &gowright.Config{
            APIConfig: &gowright.APIConfig{
                BaseURL: "https://api.example.com",
                Timeout: 10 * time.Second,
                Headers: map[string]string{
                    "Content-Type": "application/json",
                },
            },
        }
    }
    
    // Create API tester
    apiTester := gowright.NewAPITester(config.APIConfig)
    err = apiTester.Initialize(config.APIConfig)
    assert.NoError(t, err)
    defer apiTester.Cleanup()
    
    // Execute ${method} request
    response, err := apiTester.${this.getMethodName(method)}("${endpoint}", nil)
    assert.NoError(t, err)
    assert.Equal(t, http.StatusOK, response.StatusCode)
    
    // Test with API test builder
    test := gowright.NewAPITestBuilder("${testName}", "${method}", "${endpoint}").
        WithTester(apiTester).
        ExpectStatus(http.StatusOK).
        Build()
    
    result := test.Execute()
    assert.Equal(t, gowright.TestStatusPassed, result.Status)
    
    t.Logf("API test completed: %s", result.Message)
}`;
  }

  generateUITest(testName: string, url: string, selector: string, context: ProjectContext): string {
    const packageName = this.getPackageName(context);
    const imports = this.getImports(context, ['ui']);
    
    return `${packageName}

${imports}

func Test${testName}(t *testing.T) {
    // Load configuration
    config, err := gowright.LoadConfig("gowright-config.json")
    if err != nil {
        // Fallback to default browser config
        config = &gowright.Config{
            BrowserConfig: &gowright.BrowserConfig{
                Headless: true,
                Timeout:  30 * time.Second,
                WindowSize: &gowright.WindowSize{Width: 1920, Height: 1080},
            },
        }
    }
    
    // Create UI tester
    uiTester := gowright.NewRodUITester()
    err = uiTester.Initialize(config.BrowserConfig)
    assert.NoError(t, err)
    defer uiTester.Cleanup()
    
    // Navigate to page
    err = uiTester.Navigate("${url}")
    assert.NoError(t, err)
    
    // Wait for element to be visible
    err = uiTester.WaitForElement("${selector}", 10*time.Second)
    assert.NoError(t, err)
    
    // Interact with element
    err = uiTester.Click("${selector}")
    assert.NoError(t, err)
    
    // Take screenshot for verification
    screenshotPath, err := uiTester.TakeScreenshot("${testName.toLowerCase()}-result.png")
    assert.NoError(t, err)
    assert.NotEmpty(t, screenshotPath)
    
    t.Logf("UI test completed, screenshot saved: %s", screenshotPath)
}`;
  }

  generateMobileTest(testName: string, platform: string, appPackage: string, selector: string, context: ProjectContext): string {
    const packageName = this.getPackageName(context);
    const imports = this.getImports(context, ['mobile']);
    
    const caps = platform === 'android' ? 
      `PlatformName:      "Android",
        PlatformVersion:   "11",
        DeviceName:        "emulator-5554",
        AppPackage:        "${appPackage}",
        AppActivity:       ".MainActivity",
        AutomationName:    "UiAutomator2",` :
      `PlatformName:      "iOS",
        PlatformVersion:   "15.0",
        DeviceName:        "iPhone 13 Simulator",
        BundleID:          "${appPackage}",
        AutomationName:    "XCUITest",`;

    return `${packageName}

${imports}

func Test${testName}(t *testing.T) {
    // Load configuration
    config, err := gowright.LoadConfig("gowright-config.json")
    if err != nil {
        // Fallback to default Appium config
        config = &gowright.Config{
            AppiumConfig: &gowright.AppiumConfig{
                ServerURL: "http://localhost:4723",
                Timeout:   30 * time.Second,
            },
        }
    }
    
    // Create Appium client
    client := gowright.NewAppiumClient(config.AppiumConfig.ServerURL)
    ctx := context.Background()
    
    // Define ${platform} capabilities
    caps := gowright.AppiumCapabilities{
        ${caps}
        NoReset:           true,
        NewCommandTimeout: 60,
    }
    
    // Create session
    err = client.CreateSession(ctx, caps)
    assert.NoError(t, err)
    defer client.DeleteSession(ctx)
    
    // Find and interact with element
    element, err := client.FindElement(ctx, gowright.ByID, "${selector}")
    assert.NoError(t, err)
    
    err = element.Click(ctx)
    assert.NoError(t, err)
    
    // Take screenshot for verification
    screenshot, err := client.TakeScreenshot(ctx)
    assert.NoError(t, err)
    assert.NotEmpty(t, screenshot)
    
    // Wait for element to be clickable
    clickableElement, err := client.WaitForElementClickable(ctx, gowright.ByID, "${selector}", 10*time.Second)
    assert.NoError(t, err)
    assert.NotNil(t, clickableElement)
    
    t.Logf("Mobile test completed for ${platform} platform")
}`;
  }

  generateDatabaseTest(testName: string, query: string, connection: string, context: ProjectContext): string {
    const packageName = this.getPackageName(context);
    const imports = this.getImports(context, ['database']);
    
    return `${packageName}

${imports}

func Test${testName}(t *testing.T) {
    // Load configuration
    config, err := gowright.LoadConfig("gowright-config.json")
    if err != nil {
        // Fallback to default database config
        config = &gowright.Config{
            DatabaseConfig: &gowright.DatabaseConfig{
                Connections: map[string]*gowright.DBConnection{
                    "${connection}": {
                        Driver: "postgres", // Change to your database driver
                        DSN:    "postgres://user:pass@localhost/testdb?sslmode=disable",
                    },
                },
            },
        }
    }
    
    // Create database tester
    dbTester := gowright.NewDatabaseTester()
    
    err = dbTester.Initialize(config.DatabaseConfig)
    assert.NoError(t, err)
    defer dbTester.Cleanup()
    
    // Execute test query
    result, err := dbTester.Execute("${connection}", "${query}")
    assert.NoError(t, err)
    assert.NotNil(t, result)
    
    // Test with database test builder
    dbTest := &gowright.DatabaseTest{
        Name:       "${testName}",
        Connection: "${connection}",
        Query:      "${query}",
        Expected: &gowright.DatabaseExpectation{
            RowCount: 1, // Adjust based on expected results
        },
    }
    
    testResult := dbTester.ExecuteTest(dbTest)
    assert.Equal(t, gowright.TestStatusPassed, testResult.Status)
    
    t.Logf("Database test completed: %s", testResult.Message)
}`;
  }

  generateIntegrationTest(testName: string, context: ProjectContext): string {
    const packageName = this.getPackageName(context);
    const imports = this.getImports(context, ['integration', 'api', 'database', 'ui']);
    
    return `${packageName}

${imports}

func Test${testName}(t *testing.T) {
    // Load configuration
    config, err := gowright.LoadConfig("gowright-config.json")
    if err != nil {
        t.Skip("No configuration file found, skipping integration test")
    }
    
    // Create integration tester
    integrationTester := gowright.NewIntegrationTester(
        config.APIConfig,
        config.DatabaseConfig,
        config.BrowserConfig,
    )
    
    // Define integration test workflow
    integrationTest := &gowright.IntegrationTest{
        Name: "${testName} Workflow",
        Steps: []gowright.IntegrationStep{
            {
                Type: gowright.StepTypeAPI,
                Action: gowright.APIStepAction{
                    Method:   "POST",
                    Endpoint: "/api/users",
                    Body: map[string]interface{}{
                        "name":  "Test User",
                        "email": "test@example.com",
                    },
                },
                Validation: gowright.APIStepValidation{
                    ExpectedStatusCode: http.StatusCreated,
                },
                Name: "Create User via API",
            },
            {
                Type: gowright.StepTypeDatabase,
                Action: gowright.DatabaseStepAction{
                    Connection: "main",
                    Query:      "SELECT COUNT(*) FROM users WHERE email = ?",
                    Args:       []interface{}{"test@example.com"},
                },
                Validation: gowright.DatabaseStepValidation{
                    ExpectedRowCount: &[]int{1}[0],
                },
                Name: "Verify User in Database",
            },
            {
                Type: gowright.StepTypeUI,
                Action: gowright.UIStepAction{
                    URL:      "https://example.com/users",
                    Selector: ".user-list",
                    Action:   "click",
                },
                Validation: gowright.UIStepValidation{
                    ExpectedElement: ".success-message",
                },
                Name: "Verify User in UI",
            },
        },
    }
    
    result := integrationTester.ExecuteTest(integrationTest)
    assert.Equal(t, gowright.TestStatusPassed, result.Status)
    
    t.Logf("Integration test completed: %s", result.Message)
}`;
  }

  generateOpenAPITest(testName: string, specPath: string, context: ProjectContext): string {
    const packageName = this.getPackageName(context);
    const imports = this.getImports(context, ['openapi']);
    
    return `${packageName}

${imports}

func Test${testName}(t *testing.T) {
    // Create OpenAPI tester
    tester, err := openapi.NewOpenAPITester("${specPath}")
    assert.NoError(t, err)
    defer tester.Close()
    
    // Validate OpenAPI specification
    result := tester.ValidateSpec()
    assert.True(t, result.Passed, "OpenAPI specification should be valid")
    
    // Check for circular references
    circularResult := tester.DetectCircularReferences()
    assert.True(t, circularResult.Passed, "No circular references should be found")
    
    // Check for breaking changes (requires git)
    breakingResult := tester.CheckBreakingChanges("HEAD~1")
    assert.True(t, breakingResult.Passed, "No breaking changes should be detected")
    
    // Print detailed results
    for _, warning := range result.Warnings {
        t.Logf("Warning at %s: %s", warning.Path, warning.Message)
    }
    
    for _, err := range result.Errors {
        t.Errorf("Error at %s: %s", err.Path, err.Message)
    }
    
    t.Logf("OpenAPI validation completed successfully")
}

func Test${testName}Integration(t *testing.T) {
    // Create OpenAPI integration with Gowright
    integration, err := openapi.NewOpenAPIIntegration("${specPath}")
    assert.NoError(t, err)
    
    // Create a full test suite
    suite := integration.CreateFullTestSuite("HEAD~1")
    
    // Execute individual tests
    for _, test := range suite.Tests {
        result := test.Execute()
        assert.Equal(t, gowright.TestStatusPassed, result.Status)
        t.Logf("Test %s: %s", result.Name, result.Status)
    }
    
    t.Logf("OpenAPI integration test suite completed")
}`;
  }

  private getPackageName(context: ProjectContext): string {
    return 'package main';
  }

  private getImports(context: ProjectContext, testTypes: string[]): string {
    const baseImports = [
      'import (',
      '    "context"',
      '    "net/http"',
      '    "testing"',
      '    "time"',
      '',
    ];

    // Add Gowright framework imports
    if (context.modulePath && context.modulePath.includes('gowright/framework')) {
      baseImports.push('    "github.com/gowright/framework/pkg/gowright"');
    } else {
      baseImports.push('    "github.com/gowright/framework/pkg/gowright"');
    }

    // Add specific imports based on test types
    if (testTypes.includes('openapi')) {
      baseImports.push('    "github.com/gowright/framework/pkg/openapi"');
    }

    baseImports.push('    "github.com/stretchr/testify/assert"');
    baseImports.push(')');

    return baseImports.join('\n');
  }

  private getMethodName(method: string): string {
    switch (method.toUpperCase()) {
      case 'GET': return 'Get';
      case 'POST': return 'Post';
      case 'PUT': return 'Put';
      case 'DELETE': return 'Delete';
      case 'PATCH': return 'Patch';
      default: return 'Get';
    }
  }
}