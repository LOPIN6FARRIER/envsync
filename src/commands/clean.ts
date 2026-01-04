import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { existsSync } from 'fs';
import { execa } from 'execa';
import { platform } from 'os';

interface CleanOptions {
  yes?: boolean;
  all?: boolean;
}

export async function cleanCommand(options: CleanOptions) {
  console.log(chalk.blue.bold('\n🧹 EnvSync Clean - Reset Environment\n'));

  // 1. Verificar que estamos en un proyecto
  if (!existsSync('package.json')) {
    console.log(chalk.red('❌ No package.json found!'));
    console.log(chalk.gray('This command must be run in a project directory.\n'));
    process.exit(1);
  }

  // 2. Mostrar qué se va a limpiar
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
    console.log(chalk.green('✨ Nothing to clean! Directory is already clean.\n'));
    return;
  }

  console.log(chalk.yellow('⚠️  The following will be removed:\n'));
  itemsToClean.forEach((item) => {
    console.log(chalk.gray(`  • ${item}`));
  });
  console.log();

  // 3. Confirmar
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
      console.log(chalk.gray('Cancelled.\n'));
      return;
    }
  }

  // 4. Limpiar
  const isWindows = platform() === 'win32';
  const spinner = ora('Cleaning...').start();

  try {
    // Eliminar node_modules
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

    // Eliminar lockfiles
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

    // Eliminar cache y dist si --all
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

    // 5. Preguntar si quiere reinstalar
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
        console.log(chalk.gray('\nTo reinstall later, run:'));
        console.log(chalk.gray('  npm install\n'));
      }
    } else {
      await reinstallDependencies();
    }
  } catch (error: any) {
    spinner.fail('Clean failed');
    console.log(chalk.red('\n❌ Error during clean:'));
    console.error(error.message);
    process.exit(1);
  }
}

async function reinstallDependencies() {
  console.log(chalk.blue('\n📦 Reinstalling dependencies...\n'));

  const spinner = ora('Running npm install...').start();

  try {
    await execa('npm', ['install'], { stdio: 'inherit' });
    spinner.succeed('Dependencies installed!');

    console.log(chalk.green('\n✅ Clean and reinstall complete!\n'));
    console.log(chalk.gray('You can now run:'));
    console.log(chalk.gray('  ng serve\n'));
  } catch (error) {
    spinner.fail('Installation failed');
    console.log(chalk.red('\n❌ npm install failed'));
    console.log(chalk.gray('Try running manually:'));
    console.log(chalk.gray('  npm install\n'));
    process.exit(1);
  }
}