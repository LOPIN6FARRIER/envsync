import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import yaml from 'yaml';
import { EnvSyncConfig } from '../types/index.types.js';
import { AngularDetector } from '../core/angular-detector.js';

interface UpdateOptions {
  yes?: boolean;
}

export async function updateCommand(options: UpdateOptions) {
  console.log(chalk.blue.bold('\n⬆️  EnvSync Update - Update Configuration\n'));

  // 1. Verificar que existe envsync.yaml
  if (!existsSync('envsync.yaml')) {
    console.log(chalk.red('❌ envsync.yaml not found!'));
    console.log(chalk.gray('Run: envsync init\n'));
    process.exit(1);
  }

  // 2. Leer configuración actual
  const configFile = readFileSync('envsync.yaml', 'utf8');
  const currentConfig: EnvSyncConfig = yaml.parse(configFile);

  console.log(chalk.gray('Current configuration:'));
  console.log(chalk.gray(`  Angular: ${currentConfig.project.angularVersion || 'N/A'}`));
  console.log(chalk.gray(`  Node: ${currentConfig.runtime.node}`));
  console.log(chalk.gray(`  Package Manager: ${currentConfig.runtime.packageManager}\n`));

  // 3. Detectar proyecto actual
  const spinner = ora('Detecting current project state...').start();
  const detector = new AngularDetector();

  let angularProject;
  try {
    angularProject = await detector.detectAngularProject();
    
    // Verificar si angularProject es null
    if (!angularProject) {
      spinner.fail('Not an Angular project');
      console.log(chalk.red('\n❌ This is not an Angular project'));
      console.log(chalk.gray('envsync update can only be used in Angular projects.\n'));
      process.exit(1);
    }
    
    spinner.succeed('Project detected');
  } catch (error: any) {
    spinner.fail('Detection failed');
    console.log(chalk.red('\n❌ Could not detect Angular project'));
    console.log(chalk.gray(error.message));
    console.log(chalk.gray('\nMake sure you are in an Angular project directory.\n'));
    process.exit(1);
  }

  // 4. Comparar versiones
  const updates: Array<{
    field: string;
    current: string;
    latest: string;
    shouldUpdate: boolean;
  }> = [];

  // Angular version
  if (angularProject.version !== currentConfig.project.angularVersion) {
    updates.push({
      field: 'Angular version',
      current: currentConfig.project.angularVersion || 'N/A',
      latest: angularProject.version,
      shouldUpdate: true,
    });
  }

  // Node version
  const recommendedNode = detector.getRecommendedNodeVersion(angularProject.version);
  if (recommendedNode !== currentConfig.runtime.node) {
    updates.push({
      field: 'Node.js version',
      current: currentConfig.runtime.node,
      latest: recommendedNode,
      shouldUpdate: true,
    });
  }

  // Package manager
  const currentPM = currentConfig.runtime.packageManager.split('@')[0];
  if (angularProject.packageManager !== currentPM) {
    updates.push({
      field: 'Package manager',
      current: currentConfig.runtime.packageManager,
      latest: angularProject.packageManager,
      shouldUpdate: true,
    });
  }

  // Angular CLI version
  const currentCLI = currentConfig.dependencies?.global?.[0] || 'Not specified';
  const latestCLI = `@angular/cli@${angularProject.version}`;
  if (currentCLI !== latestCLI) {
    updates.push({
      field: 'Angular CLI',
      current: currentCLI,
      latest: latestCLI,
      shouldUpdate: true,
    });
  }

  // 5. Mostrar actualizaciones disponibles
  if (updates.length === 0) {
    console.log(chalk.green('\n✨ Configuration is up to date! No updates needed.\n'));
    return;
  }

  console.log(chalk.yellow('\n📋 Updates available:\n'));
  updates.forEach((update, i) => {
    console.log(chalk.gray(`  ${i + 1}. ${update.field}`));
    console.log(chalk.red(`     Current: ${update.current}`));
    console.log(chalk.green(`     Latest:  ${update.latest}`));
    console.log();
  });

  // 6. Confirmar actualización
  if (!options.yes) {
    const { shouldUpdate } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldUpdate',
        message: 'Update envsync.yaml with these changes?',
        default: true,
      },
    ]);

    if (!shouldUpdate) {
      console.log(chalk.gray('Update cancelled.\n'));
      return;
    }
  }

  // 7. Actualizar configuración
  const spinner2 = ora('Updating envsync.yaml...').start();

  const updatedConfig: EnvSyncConfig = {
    ...currentConfig,
    project: {
      ...currentConfig.project,
      angularVersion: angularProject.version,
    },
    runtime: {
      node: recommendedNode,
      packageManager: angularProject.packageManager,
    },
    dependencies: {
      ...currentConfig.dependencies,
      global: [`@angular/cli@${angularProject.version}`],
    },
  };

  const yamlContent = yaml.stringify(updatedConfig);
  writeFileSync('envsync.yaml', yamlContent, 'utf8');

  spinner2.succeed('envsync.yaml updated!');

  // 8. Preguntar si quiere sincronizar
  console.log();
  if (!options.yes) {
    const { shouldSync } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldSync',
        message: 'Run "envsync sync" to apply changes?',
        default: true,
      },
    ]);

    if (shouldSync) {
      console.log();
      const { syncCommand } = await import('./sync.js');
      await syncCommand({ yes: false });
    } else {
      console.log(chalk.gray('\nTo apply changes later, run:'));
      console.log(chalk.gray('  envsync sync\n'));
    }
  } else {
    console.log();
    const { syncCommand } = await import('./sync.js');
    await syncCommand({ yes: true });
  }
}