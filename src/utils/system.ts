import { execa } from 'execa';
import { platform } from 'os';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Gets the currently installed Node.js version
 * @returns The current Node.js version without the 'v' prefix, or null if not installed
 */
export async function getCurrentNodeVersion(): Promise<string | null> {
  try {
    const { stdout } = await execa('node', ['--version']);
    return stdout.replace('v', '');
  } catch {
    return null;
  }
}

/**
 * Checks if nvm (Node Version Manager) is installed on the system
 * Supports both Windows (nvm-windows) and Unix-based systems
 * @returns true if nvm is installed, false otherwise
 */
export async function hasNVM(): Promise<boolean> {
  try {
    const isWindows = platform() === 'win32';
    const command = isWindows ? 'nvm' : 'bash';
    const args = isWindows ? ['version'] : ['-c', 'command -v nvm'];

    await execa(command, args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a specific Node.js version is installed in nvm
 * @param version - The Node.js version to check (e.g., "20.11.1")
 * @returns true if the version is installed, false otherwise
 */
export async function isNodeVersionInstalled(version: string): Promise<boolean> {
  try {
    const isWindows = platform() === 'win32';

    if (isWindows) {
      const { stdout } = await execa('nvm', ['list']);
      return stdout.includes(version);
    } else {
      await execa('bash', ['-c', `source ~/.nvm/nvm.sh && nvm ls ${version}`], {
        stdio: 'ignore',
        shell: true,
      });
      return true;
    }
  } catch {
    return false;
  }
}

/**
 * Installs a specific Node.js version using nvm
 * @param version - The Node.js version to install (e.g., "20.11.1")
 */
export async function installNodeVersion(version: string): Promise<void> {
  const isWindows = platform() === 'win32';

  if (isWindows) {
    await execa('nvm', ['install', version], { stdio: 'inherit' });
  } else {
    await execa('bash', ['-c', `source ~/.nvm/nvm.sh && nvm install ${version}`], {
      stdio: 'inherit',
      shell: true,
    });
  }
}

/**
 * Switches to a specific Node.js version using nvm
 * @param version - The Node.js version to use (e.g., "20.11.1")
 */
export async function useNodeVersion(version: string): Promise<void> {
  const isWindows = platform() === 'win32';

  if (isWindows) {
    await execa('nvm', ['use', version], { stdio: 'inherit' });
  } else {
    await execa('bash', ['-c', `source ~/.nvm/nvm.sh && nvm use ${version}`], {
      stdio: 'inherit',
      shell: true,
    });
  }
}

/**
 * Creates an .nvmrc file for automatic Node.js version switching
 * @param version - The Node.js version to set in the .nvmrc file
 */
export async function createNvmrc(version: string): Promise<void> {
  writeFileSync('.nvmrc', version);
}

/**
 * Checks if a package manager is installed
 * @param pm - The package manager name (e.g., "npm", "pnpm", "yarn")
 * @returns true if the package manager is installed, false otherwise
 */
export async function hasPackageManager(pm: string): Promise<boolean> {
  try {
    await execa(pm, ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a global package is installed
 * Also checks if the package is available locally in node_modules
 * @param pkg - The package name (e.g., "@angular/cli@19.2.0" or "nx@latest")
 * @returns true if the package is installed globally or locally, false otherwise
 */
export async function hasGlobalPackage(pkg: string): Promise<boolean> {
  const packageName = extractPackageName(pkg);

  try {
    // Map packages to their CLI commands
    const commandMap: Record<string, string> = {
      '@angular/cli': 'ng',
      'angular/cli': 'ng',
      'nx': 'nx',
      '@nestjs/cli': 'nest',
      'nestjs/cli': 'nest',
      '@vue/cli': 'vue',
      'vue/cli': 'vue',
      'typescript': 'tsc',
      'ts-node': 'ts-node',
    };

    const command = commandMap[packageName] || packageName;

    // Try to execute the command
    await execa(command, ['--version'], {
      stdio: 'ignore',
      timeout: 5000,
      preferLocal: true, // Look in node_modules/.bin first
    });

    return true;
  } catch {
    // If global check fails, verify if it exists locally
    return hasLocalPackage(packageName);
  }
}

/**
 * Extracts the package name without the version specifier
 * @param pkg - The full package string (e.g., "@angular/cli@19.2.0")
 * @returns The package name without version (e.g., "@angular/cli")
 * @example
 *   '@angular/cli@19.2.0' -> '@angular/cli'
 *   'nx@latest' -> 'nx'
 */
function extractPackageName(pkg: string): string {
  if (pkg.startsWith('@')) {
    // '@angular/cli@19.2.0' -> ['', 'angular/cli', '19.2.0']
    const parts = pkg.split('@');
    return `@${parts[1]}`; // '@angular/cli'
  } else {
    // 'nx@latest' -> 'nx'
    return pkg.split('@')[0];
  }
}

/**
 * Checks if a package is installed locally in node_modules
 * @param packageName - The package name to check
 * @returns true if the package exists in local node_modules, false otherwise
 */
function hasLocalPackage(packageName: string): boolean {
  const localPath = join(process.cwd(), 'node_modules', packageName);
  return existsSync(localPath);
}

/**
 * Checks if a VSCode extension is installed
 * @param extension - The extension ID (e.g., "angular.ng-template")
 * @returns true if the extension is installed, false otherwise
 */
export async function hasVSCodeExtension(extension: string): Promise<boolean> {
  try {
    const { stdout } = await execa('code', ['--list-extensions']);
    return stdout.includes(extension);
  } catch {
    return false;
  }
}

/**
 * Checks if the VSCode CLI is available in the system
 * @returns true if the 'code' command is available, false otherwise
 */
export async function hasVSCodeCLI(): Promise<boolean> {
  try {
    await execa('code', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Installs nvm interactively with user guidance
 * Provides platform-specific installation instructions for Windows and Unix-based systems
 */
export async function installNVMInteractive(): Promise<void> {
  const isWindows = platform() === 'win32';
  const chalk = (await import('chalk')).default;
  const ora = (await import('ora')).default;
  const inquirer = (await import('inquirer')).default;

  if (isWindows) {
    // Windows - nvm-windows
    console.log(chalk.blue('\n📥 Installing nvm for Windows...\n'));
    console.log(chalk.gray('Please follow these steps:\n'));
    console.log(chalk.gray('1. Download nvm-windows from:'));
    console.log(chalk.yellow('   https://github.com/coreybutler/nvm-windows/releases\n'));
    console.log(chalk.gray('2. Run the installer (nvm-setup.exe)'));
    console.log(chalk.gray('3. Follow the installation wizard'));
    console.log(chalk.gray('4. Restart your terminal\n'));

    const { shouldOpenBrowser } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldOpenBrowser',
        message: 'Open download page in browser?',
        default: true,
      },
    ]);

    if (shouldOpenBrowser) {
      // Open browser on Windows
      await execa('cmd', ['/c', 'start', 'https://github.com/coreybutler/nvm-windows/releases']);
      console.log(chalk.green('\n✓ Opened browser\n'));
    }
  } else {
    // Mac/Linux - nvm
    const spinner = ora('Installing nvm...').start();

    try {
      await execa('bash', [
        '-c',
        'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash'
      ], {
        stdio: 'inherit',
      });

      spinner.succeed('nvm installed successfully');

      console.log(chalk.gray('\n📝 nvm has been installed!'));
      console.log(chalk.gray('To use it, run one of these commands:\n'));
      console.log(chalk.yellow('  source ~/.bashrc'));
      console.log(chalk.yellow('  source ~/.zshrc'));
      console.log(chalk.gray('\nOr simply restart your terminal\n'));
    } catch (error) {
      spinner.fail('Failed to install nvm');
      console.log(chalk.red('\n❌ Automatic installation failed'));
      console.log(chalk.gray('\nManual installation:'));
      console.log(chalk.gray('Visit: https://github.com/nvm-sh/nvm\n'));
    }
  }
}
