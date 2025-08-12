# GitHub Actions for Gowright MCP Server

This directory contains GitHub Actions workflows for the Gowright MCP Server.

## Workflows

### CI (`ci.yml`)
Runs on every push and pull request to main/develop branches:
- Tests the build process across Node.js versions 18 and 20
- Validates TypeScript compilation
- Checks package integrity
- Runs tests (when available)

### Publish (`publish.yml`)
Publishes the MCP server to npm:
- **Automatic**: Triggered when a git tag starting with `v` is pushed
- **Manual**: Can be triggered via GitHub Actions UI with version bump selection

## Setup Requirements

### Secrets
Add these secrets to your GitHub repository:

1. **NPM_TOKEN**: Your npm authentication token
   - Go to [npm.com](https://www.npmjs.com) → Account → Access Tokens
   - Create a new "Automation" token
   - Add it as a repository secret

### Publishing Process

#### Automatic (Recommended)
1. Create and push a git tag:
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```
2. The workflow will automatically publish to npm and create a GitHub release

#### Manual
1. Go to GitHub Actions → Publish MCP Server → Run workflow
2. Select the version bump type (patch/minor/major)
3. The workflow will bump the version, publish, and create a release

## Workflow Features

### Build Validation
- Compiles TypeScript to JavaScript
- Makes the output executable
- Validates the built package can run
- Checks package integrity with `npm pack --dry-run`

### Version Management
- Automatically bumps version in package.json
- Creates git tags for releases
- Pushes version changes back to repository

### Release Creation
- Creates GitHub releases with installation instructions
- Includes MCP configuration examples
- Links to the published npm package

## Local Testing

Before pushing tags, you can test the build locally:

```bash
cd mcpserver
npm ci
npm run build
chmod +x dist/index.js
node dist/index.js --help
npm pack --dry-run
```

## Troubleshooting

### Common Issues

1. **NPM_TOKEN not set**: Ensure the secret is added to repository settings
2. **Permission denied**: Check that the token has publish permissions
3. **Version conflicts**: Ensure the version doesn't already exist on npm
4. **Build failures**: Check TypeScript compilation errors locally first

### Manual Recovery

If a workflow fails partway through:

1. Check the failed step in GitHub Actions logs
2. Fix the issue locally
3. For version bumps, you may need to manually revert package.json changes
4. Re-run the workflow or push a new tag