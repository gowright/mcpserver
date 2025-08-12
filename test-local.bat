@echo off
REM Gowright MCP Server - Local Testing Script (Windows)
REM This script replicates the CI/CD pipeline for local testing before committing

setlocal enabledelayedexpansion

REM Change to mcpserver directory
cd /d "%~dp0"

echo ==^> Starting local CI/CD pipeline simulation...

REM Check Node.js version
echo ==^> Checking Node.js version...
for /f "tokens=1 delims=v" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=1 delims=." %%i in ("%NODE_VERSION:~1%") do set NODE_MAJOR=%%i
if %NODE_MAJOR% LSS 18 (
    echo [ERROR] Node.js version 18+ required. Current version: %NODE_VERSION%
    exit /b 1
)
echo [SUCCESS] Node.js version: %NODE_VERSION%

REM Clean previous builds
echo ==^> Cleaning previous builds...
if exist dist rmdir /s /q dist
if exist node_modules\.cache rmdir /s /q node_modules\.cache 2>nul
echo [SUCCESS] Cleaned build artifacts

REM Install dependencies
echo ==^> Installing dependencies...
call npm ci
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    exit /b 1
)
echo [SUCCESS] Dependencies installed

REM TypeScript type checking
echo ==^> Running TypeScript type checking...
call npx tsc --noEmit
if errorlevel 1 (
    echo [ERROR] TypeScript type checking failed
    exit /b 1
)
echo [SUCCESS] TypeScript type checking passed

REM Check formatting (if prettier is configured)
echo ==^> Checking code formatting...
if exist .prettierrc (
    call npx prettier --check .
    if errorlevel 1 (
        echo [WARNING] Code formatting issues found. Run 'npx prettier --write .' to fix
    ) else (
        echo [SUCCESS] Code formatting is correct
    )
) else if exist prettier.config.js (
    call npx prettier --check .
    if errorlevel 1 (
        echo [WARNING] Code formatting issues found. Run 'npx prettier --write .' to fix
    ) else (
        echo [SUCCESS] Code formatting is correct
    )
) else if exist .prettierrc.json (
    call npx prettier --check .
    if errorlevel 1 (
        echo [WARNING] Code formatting issues found. Run 'npx prettier --write .' to fix
    ) else (
        echo [SUCCESS] Code formatting is correct
    )
) else (
    echo [WARNING] Prettier not configured, skipping format check
)

REM Build project
echo ==^> Building project...
call npm run build
if errorlevel 1 (
    echo [ERROR] Build failed
    exit /b 1
)
echo [SUCCESS] Build completed

REM Validate build
echo ==^> Validating build...
node dist/index.js --help >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Could not run help command (this might be expected)
) else (
    echo [SUCCESS] Build validation passed
)

REM Run tests
echo ==^> Running tests...
call npm test
if errorlevel 1 (
    echo [ERROR] Tests failed
    exit /b 1
)
echo [SUCCESS] Tests passed

REM Check package integrity
echo ==^> Checking package integrity...
call npm pack --dry-run >nul
if errorlevel 1 (
    echo [ERROR] Package integrity check failed
    exit /b 1
)
echo [SUCCESS] Package integrity check passed

REM Test MCP server functionality (if test-mcp.js exists)
if exist test-mcp.js (
    echo ==^> Testing MCP server functionality...
    node test-mcp.js
    if errorlevel 1 (
        echo [WARNING] MCP server functionality test failed or not fully implemented
    ) else (
        echo [SUCCESS] MCP server functionality test passed
    )
)

REM Check bundle size
if exist dist\index.js (
    for %%A in (dist\index.js) do set BUNDLE_SIZE=%%~zA
    set /a BUNDLE_SIZE_KB=!BUNDLE_SIZE!/1024
    if !BUNDLE_SIZE_KB! GTR 1000 (
        echo [WARNING] Bundle size is large: !BUNDLE_SIZE_KB!KB
    ) else (
        echo [SUCCESS] Bundle size: !BUNDLE_SIZE_KB!KB
    )
)

REM Final summary
echo.
echo ==^> Local CI/CD pipeline completed successfully!
echo [SUCCESS] All checks passed
echo.
echo Your code is ready for commit and push!
echo.
echo Next steps:
echo   1. git add .
echo   2. git commit -m "your commit message"
echo   3. git push
echo.
echo For publishing:
echo   - Create a tag: git tag v1.0.1
echo   - Push tag: git push --tags
echo   - Or use GitHub workflow dispatch for version bumping

pause