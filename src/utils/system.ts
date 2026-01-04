import { execa } from 'execa';
import { platform } from 'os';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Obtiene la versión actual de Node instalada
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
 * Verifica si nvm está instalado
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
 * Verifica si una versión específica de Node está instalada en nvm
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
 * Instala una versión de Node usando nvm
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
 * Cambia a una versión específica de Node usando nvm
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
 * Crea archivo .nvmrc para auto-switching
 */
export async function createNvmrc(version: string): Promise<void> {
  writeFileSync('.nvmrc', version);
}

/**
 * Verifica si un package manager está instalado
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
 * Verifica si un paquete global está instalado
 * También verifica si está disponible localmente en node_modules
 */
export async function hasGlobalPackage(pkg: string): Promise<boolean> {
  // Extraer el nombre base del paquete (sin versión)
  const packageName = extractPackageName(pkg);
  
  try {
    // Mapeo de paquetes a comandos CLI
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

    // Intentar ejecutar el comando
    await execa(command, ['--version'], {
      stdio: 'ignore',
      timeout: 5000,
      preferLocal: true, // Busca en node_modules/.bin primero
    });

    return true;
  } catch {
    // Si falla globalmente, verificar si existe localmente
    return hasLocalPackage(packageName);
  }
}

/**
 * Extrae el nombre del paquete sin la versión
 * Ejemplos:
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
 * Verifica si un paquete está instalado localmente en node_modules
 */
function hasLocalPackage(packageName: string): boolean {
  const localPath = join(process.cwd(), 'node_modules', packageName);
  return existsSync(localPath);
}

/**
 * Verifica si una extensión de VSCode está instalada
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
 * Verifica si VSCode CLI está disponible
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
 * Instala nvm de forma interactiva
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
      // Abrir browser en Windows
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