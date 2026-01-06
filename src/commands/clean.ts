import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { existsSync } from 'fs';
import { execa } from 'execa';
import { platform } from 'os';
import { verbose, error, success, gray, yellow,blue} from '../utils/logger.js';

interface CleanOptions {
  yes?: boolean;
  all?: boolean;
}

export async function cleanCommand(options: CleanOptions) {
  blue('\n🧹 EnvSync Clean - Reset Environment\n');

  // 1. Verify that we are in a project
  if (!existsSync('package.json')) {
    error('No package.json found!');
    gray('This command must be run in a project directory.\n');
    process.exit(1);
  }

  verbose('Scanning for files to clean...');

  // 2. Show what will be cleaned
  const itemsToClean: string[] = [];

  if (existsSync('node_modules')) {
    itemsToClean.push('node_modules/');
  }

  if (existsSync('package-lock.json')) {
    itemsToClean.push('package-lock.json');
  }

  if (existsSync('pnpm-lock.yaml')) {
    itemsToClean.push('pnpm-lock.yaml');
  }

  if (existsSync('yarn.lock')) {
    itemsToClean.push('yarn.lock');
  }

  if (options.all) {
    if (existsSync('.angular')) {
      itemsToClean.push('.angular/ (build cache)');
    }
    if (existsSync('dist')) {
      itemsToClean.push('dist/ (build output)');
    }
  }

  if (itemsToClean.length === 0) {
    success('Nothing to clean! Directory is already clean.\n');
    return;
  }

  verbose(`Found ${itemsToClean.length} item(s) to clean`);

  yellow('⚠️  The following will be removed:\n');
  itemsToClean.forEach((item) => {
    gray(`  • ${item}`);
  });
  console.log();

  // 3. Confirm
  if (!options.yes) {
    const { shouldClean } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldClean',
        message: 'Are you sure you want to clean?',
        default: false,
      },
    ]);

    if (!shouldClean) {
      gray('Cancelled.\n');
      return;
    }
  }

  // 4. Clean
  const isWindows = platform() === 'win32';
  const spinner = ora('Cleaning...').start();

  try {
    // Remove node_modules
    if (existsSync('node_modules')) {
      spinner.text = 'Removing node_modules...';
      if (isWindows) {
        await execa('cmd', ['/c', 'rmdir', '/s', '/q', 'node_modules'], {
          stdio: 'ignore',
        });
      } else {
        await execa('rm', ['-rf', 'node_modules'], { stdio: 'ignore' });
      }
    }

    // Remove lockfiles
    const lockfiles = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'];
    for (const lockfile of lockfiles) {
      if (existsSync(lockfile)) {
        spinner.text = `Removing ${lockfile}...`;
        if (isWindows) {
          await execa('cmd', ['/c', 'del', lockfile], { stdio: 'ignore' });
        } else {
          await execa('rm', [lockfile], { stdio: 'ignore' });
        }
      }
    }

    // Remove cache and dist if --all
    if (options.all) {
      if (existsSync('.angular')) {
        spinner.text = 'Removing .angular cache...';
        if (isWindows) {
          await execa('cmd', ['/c', 'rmdir', '/s', '/q', '.angular'], {
            stdio: 'ignore',
          });
        } else {
          await execa('rm', ['-rf', '.angular'], { stdio: 'ignore' });
        }
      }

      if (existsSync('dist')) {
        spinner.text = 'Removing dist...';
        if (isWindows) {
          await execa('cmd', ['/c', 'rmdir', '/s', '/q', 'dist'], {
            stdio: 'ignore',
          });
        } else {
          await execa('rm', ['-rf', 'dist'], { stdio: 'ignore' });
        }
      }
    }

    spinner.succeed('Cleaned successfully!');

    // 5. Ask if wants to reinstall
    console.log();
    if (!options.yes) {
      const { shouldReinstall } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldReinstall',
          message: 'Reinstall dependencies now?',
          default: true,
        },
      ]);

      if (shouldReinstall) {
        await reinstallDependencies();
      } else {
        gray('\nTo reinstall later, run:');
        gray('  npm install\n');
      }
    } else {
      await reinstallDependencies();
    }
  } catch (err: any) {
    spinner.fail('Clean failed');
    error('Error during clean:');
    console.error(err.message);
    process.exit(1);
  }
}

async function reinstallDependencies() {
  console.log(chalk.blue('\n📦 Reinstalling dependencies...\n'));

  const spinner = ora('Running npm install...').start();

  try {
    await execa('npm', ['install'], { stdio: 'inherit' });
    spinner.succeed('Dependencies installed!');

    success('Clean and reinstall complete!\n');
    gray('You can now run:');
    gray('  ng serve\n');
  } catch (err) {
    spinner.fail('Installation failed');
    error('npm install failed');
    gray('Try running manually:');
    gray('  npm install\n');
    process.exit(1);
  }
}