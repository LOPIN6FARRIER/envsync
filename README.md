# EnvSync CLI

> Development environment synchronization tool for Angular teams

EnvSync is a command-line tool that helps Angular development teams maintain consistent development environments across all team members. It manages Node.js versions, package managers, global dependencies, and VSCode extensions through a simple configuration file.

## Features

- 🚀 **Automatic Detection**: Detects Angular project configuration automatically
- 🔄 **Environment Sync**: Synchronizes Node.js versions, package managers, and dependencies
- 📦 **NVM Integration**: Automatically manages Node.js versions using nvm
- 🔧 **Global Dependencies**: Manages global npm packages like Angular CLI
- 💻 **VSCode Extensions**: Auto-installs recommended VSCode extensions
- ✅ **Health Checks**: Validates environment setup with `envsync try`
- 🔍 **Diff View**: Compare expected vs actual environment configuration
- 🧹 **Clean Command**: Clean and reset project dependencies

## Installation

```bash
npm install -g envsync-cli
```

## Quick Start

### 1. Initialize in your Angular project

```bash
cd your-angular-project
envsync init
```

This creates an `envsync.yaml` file with your project's environment requirements.

### 2. Share with team

Commit the `envsync.yaml` file to version control:

```bash
git add envsync.yaml
git commit -m "Add EnvSync configuration"
git push
```

### 3. Team members sync their environment

Team members clone the repo and run:

```bash
envsync sync
```

EnvSync will automatically:
- Install or switch to the correct Node.js version (via nvm)
- Install the correct package manager
- Install required global dependencies
- Install recommended VSCode extensions
- Run post-sync scripts (like `npm install`)

## Commands

### `envsync init`

Initialize EnvSync in your Angular project. Detects project configuration and creates `envsync.yaml`.

**Options:**
- `-f, --force` - Overwrite existing envsync.yaml

**Example:**
```bash
envsync init
envsync init --force
```

### `envsync sync`

Synchronize your environment to match the project requirements defined in `envsync.yaml`.

**Options:**
- `-y, --yes` - Skip confirmation prompts

**Example:**
```bash
envsync sync
envsync sync -y
```

### `envsync try` (alias: `check`, `doctor`, `status`)

Check the health of your development environment and display a health score.

**Example:**
```bash
envsync try
envsync doctor
```

### `envsync diff`

Show differences between expected and current environment configuration.

**Example:**
```bash
envsync diff
```

### `envsync update`

Update `envsync.yaml` to match your current project versions (useful after upgrading Angular).

**Options:**
- `-y, --yes` - Skip confirmations and auto-sync

**Example:**
```bash
envsync update
envsync update -y
```

### `envsync clean`

Clean node_modules and lockfiles, then optionally reinstall dependencies.

**Options:**
- `-y, --yes` - Skip confirmations
- `-a, --all` - Also remove build cache and dist folder

**Example:**
```bash
envsync clean
envsync clean -y --all
```

## Configuration File

The `envsync.yaml` file defines your project's environment requirements:

```yaml
project:
  name: my-angular-app
  type: angular
  angularVersion: "17.1.0"

runtime:
  node: "20.11.1"
  packageManager: "pnpm@latest"

dependencies:
  global:
    - "@angular/cli@17.1.0"
    - "nx@latest"

extensions:
  vscode:
    - "angular.ng-template"
    - "johnpapa.angular2"
    - "esbenp.prettier-vscode"
    - "dbaeumer.vscode-eslint"
    - "cyrilletuzi.angular-schematics"

scripts:
  pre-sync: []
  post-sync:
    - "pnpm install"
    - "npx husky install"
```

### Configuration Options

#### `project`
- `name`: Project name
- `type`: Project type (currently only `angular` is supported)
- `angularVersion`: Angular version

#### `runtime`
- `node`: Required Node.js version (e.g., `"20.11.1"`)
- `packageManager`: Package manager and version (e.g., `"pnpm@latest"`, `"npm"`, `"yarn"`)

#### `dependencies`
- `global`: Array of global npm packages to install (e.g., `"@angular/cli@17.1.0"`)

#### `extensions` (optional)
- `vscode`: Array of VSCode extension IDs to install

#### `scripts` (optional)
- `pre-sync`: Commands to run before sync starts
- `post-sync`: Commands to run after sync completes

## Requirements

- **Node.js**: Any version (EnvSync will manage the correct version via nvm)
- **nvm**: Recommended for managing Node.js versions
  - Windows: [nvm-windows](https://github.com/coreybutler/nvm-windows)
  - Mac/Linux: [nvm](https://github.com/nvm-sh/nvm)

## Use Cases

### New Team Member Onboarding

```bash
git clone <repo>
cd <repo>
npm install -g envsync-cli
envsync sync
```

EnvSync sets up their complete development environment in one command.

### Upgrading Angular Version

After upgrading Angular in your project:

```bash
envsync update
```

This updates your `envsync.yaml` to match the new versions, and you can commit it so the team can sync.

### Troubleshooting Environment Issues

```bash
envsync doctor
```

Shows what's missing or misconfigured in your environment with a health score.

### Starting Fresh

```bash
envsync clean -y --all
envsync sync
```

Completely resets your project dependencies and rebuilds the environment.

## Global Options

- `--verbose` - Enable verbose logging
- `--no-color` - Disable colored output
- `-v, --version` - Output the current version
- `-h, --help` - Display help information

## Angular Version Support

EnvSync automatically recommends the correct Node.js version based on your Angular version:

| Angular Version | Node.js Version |
|----------------|-----------------|
| 18.x           | 20.11.1         |
| 17.x           | 20.11.1         |
| 16.x           | 18.19.0         |
| 15.x           | 18.13.0         |
| 14.x           | 16.20.0         |
| 13.x           | 16.20.0         |

## How It Works

1. **Detection**: EnvSync detects your Angular project by looking for `angular.json` or `@angular/core` in `package.json`
2. **Analysis**: Analyzes project dependencies, Angular version, and package manager
3. **Configuration**: Generates or reads `envsync.yaml` with environment requirements
4. **Synchronization**: Automatically installs/switches to required tools and versions
5. **Validation**: Verifies the environment is correctly configured

## Troubleshooting

### nvm not found

If EnvSync can't find nvm, install it:

- **Windows**: Download from [nvm-windows releases](https://github.com/coreybutler/nvm-windows/releases)
- **Mac/Linux**: Run `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash`

### VSCode extensions not installing

Make sure the VSCode CLI is installed:

1. Open VSCode
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type "Shell Command: Install 'code' command in PATH"
4. Select it and restart your terminal

### Permission errors

On Unix systems, you may need to use sudo for global package installations, or configure npm to use a different directory:

```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

## Examples

### Basic Angular Project

```bash
# Create new Angular project
ng new my-app
cd my-app

# Initialize EnvSync
envsync init

# View configuration
cat envsync.yaml

# Check environment health
envsync try
```

### Nx Monorepo

EnvSync automatically detects Nx and adds it to global dependencies:

```bash
envsync init
# Detects Nx and adds 'nx@latest' to global dependencies
```

### Custom Package Manager

```bash
# Use pnpm
envsync init
# Select 'pnpm' when prompted
# envsync.yaml will have: packageManager: "pnpm@latest"
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Author

Vinicio

## Links

- [GitHub Repository](https://github.com/LOPIN6FARRIER/envsync)
- [Issue Tracker](https://github.com/LOPIN6FARRIER/envsync/issues)
- [npm Package](https://www.npmjs.com/package/envsync-cli)

## Related Projects

- [nvm](https://github.com/nvm-sh/nvm) - Node Version Manager for Unix
- [nvm-windows](https://github.com/coreybutler/nvm-windows) - Node Version Manager for Windows
- [Angular CLI](https://angular.io/cli) - Angular Command Line Interface

---

Made with ❤️ for Angular teams
