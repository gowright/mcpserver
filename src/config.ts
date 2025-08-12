// Configuration management for cross-project usage
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface GowrightConfig {
  log_level?: string;
  parallel?: boolean;
  max_retries?: number;
  api_config?: {
    base_url?: string;
    timeout?: string;
    headers?: Record<string, string>;
  };
  browser_config?: {
    headless?: boolean;
    timeout?: string;
    window_size?: {
      width: number;
      height: number;
    };
  };
  database_config?: {
    connections?: Record<string, {
      driver: string;
      dsn: string;
    }>;
  };
  appium_config?: {
    server_url?: string;
    timeout?: string;
    default_capabilities?: Record<string, any>;
  };
  openapi_config?: {
    spec_path?: string;
    validate_spec?: boolean;
    detect_circular_refs?: boolean;
    check_breaking_changes?: boolean;
    previous_commit?: string;
    fail_on_warnings?: boolean;
  };
  report_config?: {
    local_reports?: {
      json?: boolean;
      html?: boolean;
      output_dir?: string;
    };
  };
}

export class ConfigManager {
  private static instance: ConfigManager;
  private configs: Map<string, GowrightConfig> = new Map();

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  loadConfig(projectPath: string = process.cwd()): GowrightConfig | null {
    // Check cache first
    if (this.configs.has(projectPath)) {
      return this.configs.get(projectPath)!;
    }

    // Look for config files in order of preference
    const configPaths = [
      join(projectPath, 'gowright-config.json'),
      join(projectPath, 'gowright.config.json'),
      join(projectPath, '.gowright.json'),
      join(projectPath, 'gowright.json'),
    ];

    for (const configPath of configPaths) {
      if (existsSync(configPath)) {
        try {
          const configContent = readFileSync(configPath, 'utf8');
          const config = JSON.parse(configContent) as GowrightConfig;
          
          // Cache the config
          this.configs.set(projectPath, config);
          return config;
        } catch (error) {
          console.warn(`Failed to parse config file ${configPath}:`, error);
        }
      }
    }

    return null;
  }

  getDefaultConfig(): GowrightConfig {
    return {
      log_level: "info",
      parallel: true,
      max_retries: 3,
      api_config: {
        base_url: "https://api.example.com",
        timeout: "10s",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Gowright-Test-Client"
        }
      },
      browser_config: {
        headless: true,
        timeout: "30s",
        window_size: {
          width: 1920,
          height: 1080
        }
      },
      database_config: {
        connections: {
          main: {
            driver: "postgres",
            dsn: "postgres://user:pass@localhost/testdb?sslmode=disable"
          }
        }
      },
      appium_config: {
        server_url: "http://localhost:4723",
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
  }

  mergeWithDefaults(config: GowrightConfig | null): GowrightConfig {
    const defaultConfig = this.getDefaultConfig();
    
    if (!config) {
      return defaultConfig;
    }

    // Deep merge configuration
    return this.deepMerge(defaultConfig, config);
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  clearCache(): void {
    this.configs.clear();
  }
}