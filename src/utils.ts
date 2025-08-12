import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface ProjectContext {
  isGoProject: boolean;
  hasGowrightConfig: boolean;
  modulePath?: string;
  projectRoot: string;
}

export function detectProjectContext(workingDir: string = process.cwd()): ProjectContext {
  const goModPath = join(workingDir, 'go.mod');
  const gowrightConfigPath = join(workingDir, 'gowright-config.json');
  
  let modulePath: string | undefined;
  
  if (existsSync(goModPath)) {
    try {
      const goModContent = readFileSync(goModPath, 'utf8');
      const moduleMatch = goModContent.match(/^module\s+(.+)$/m);
      if (moduleMatch) {
        modulePath = moduleMatch[1].trim();
      }
    } catch (error) {
      // Ignore errors reading go.mod
    }
  }
  
  return {
    isGoProject: existsSync(goModPath),
    hasGowrightConfig: existsSync(gowrightConfigPath),
    modulePath,
    projectRoot: workingDir
  };
}

export function generateImportPath(modulePath?: string): string {
  if (modulePath) {
    return modulePath;
  }
  return 'github.com/example/project'; // fallback
}

export function sanitizeTestName(name: string): string {
  // Ensure test name starts with capital letter and contains only valid Go identifier characters
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/[^a-zA-Z0-9_]/g, '');
}

export function validateGoEnvironment(): { valid: boolean; error?: string } {
  try {
    const { execSync } = require('child_process');
    execSync('go version', { stdio: 'ignore' });
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: 'Go is not installed or not in PATH. Please install Go 1.22 or later.' 
    };
  }
}

export function getGowrightVersion(): string {
  try {
    const { execSync } = require('child_process');
    const output = execSync('go list -m github.com/gowright/framework', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    const versionMatch = output.match(/v[\d.]+/);
    return versionMatch ? versionMatch[0] : 'latest';
  } catch (error) {
    return 'latest';
  }
}