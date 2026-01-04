import chalk from 'chalk';
import inquirer from 'inquirer';
import { writeFileSync, existsSync } from 'fs';
import yaml from 'yaml';
import ora from 'ora';
import { AngularDetector } from '../core/angular-detector.js';
import { EnvSyncConfig } from '../types/index.types.js';


interface InitOptions {
  force?: boolean;
}

export async function initCommand(options: InitOptions) {
  console.log(chalk.blue.bold('\n🚀 EnvSync - Initialize Angular Project\n'));

  // Verificar si ya existe envsync.yaml
  if (existsSync('envsync.yaml') && !options.force) {
    console.log(chalk.yellow('⚠️  envsync.yaml already exists!'));
    console.log(chalk.gray('Use --force to overwrite\n'));
    process.exit(1);
  }

  const spinner = ora('Detecting Angular project...').start();
  
  const detector = new AngularDetector();
  const isAngular = await detector.isAngularProject();

  if (!isAngular) {
    spinner.fail('Not an Angular project');
    console.log(chalk.red('\n❌ This is not an Angular project'));
    console.log(chalk.gray('Make sure you are in an Angular project directory'));
    console.log(chalk.gray('Or create one with: ng new my-app\n'));
    process.exit(1);
  }

  const angularProject = await detector.detectAngularProject();
  
  if (!angularProject) {
    spinner.fail('Could not detect Angular configuration');
    process.exit(1);
  }

  spinner.succeed(`Angular ${angularProject.version} detected`);

  // Mostrar configuración detectada
  console.log(chalk.gray('\nDetected configuration:'));
  console.log(chalk.gray(`  Angular: ${angularProject.version}`));
  console.log(chalk.gray(`  Package Manager: ${angularProject.packageManager}`));
  console.log(chalk.gray(`  Recommended Node: ${angularProject.nodeVersion}`));
  console.log(chalk.gray(`  Has Nx: ${angularProject.hasNx ? 'Yes' : 'No'}`));
  console.log(chalk.gray(`  Angular CLI: ${angularProject.hasCLI ? 'Installed' : 'Not installed'}\n`));

  // Preguntas interactivas
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: process.cwd().split(/[\\/]/).pop(), // Funciona en Windows y Unix
    },
    {
      type: 'input',
      name: 'nodeVersion',
      message: 'Node.js version:',
      default: angularProject.nodeVersion,
      validate: (input) => {
        return /^\d+\.\d+\.\d+$/.test(input) || 'Format: X.Y.Z (e.g., 20.11.1)';
      },
    },
    {
      type: 'list',
      name: 'packageManager',
      message: 'Package manager:',
      choices: ['pnpm', 'npm', 'yarn'],
      default: angularProject.packageManager,
    },
    {
      type: 'confirm',
      name: 'includeVSCodeExtensions',
      message: 'Include VSCode extensions?',
      default: true,
    },
  ]);

  // Crear configuración
  const config: EnvSyncConfig = {
    project: {
      name: answers.projectName,
      type: 'angular',
      angularVersion: angularProject.version,
    },
    runtime: {
      node: answers.nodeVersion,
      packageManager: answers.packageManager === 'npm' 
        ? 'npm' 
        : `${answers.packageManager}@latest`,
    },
    dependencies: {
      global: [
        detector.getAngularCLIVersion(angularProject.version),
      ],
    },
  };

  // Agregar Nx si existe
  if (angularProject.hasNx) {
    config.dependencies.global.push('nx@latest');
  }

  // Agregar extensiones VSCode
  if (answers.includeVSCodeExtensions) {
    config.extensions = { 
      vscode: detector.getRecommendedExtensions(angularProject.hasNx) 
    };
  }

  // Scripts post-sync
  const postSyncScripts = [`${answers.packageManager} install`];
  
  // Agregar husky si existe
  if (existsSync('.husky')) {
    postSyncScripts.push('npx husky install');
  }

  config.scripts = { 'post-sync': postSyncScripts };

  // Guardar archivo YAML
  const yamlContent = yaml.stringify(config, { indent: 2, lineWidth: -1 });
  writeFileSync('envsync.yaml', yamlContent);

  console.log(chalk.green('\n✅ envsync.yaml created successfully!\n'));
  console.log(chalk.gray('Next steps:'));
  console.log(chalk.gray('  1. Review: envsync.yaml'));
  console.log(chalk.gray('  2. Commit: git add envsync.yaml && git commit -m "Add EnvSync config"'));
  console.log(chalk.gray('  3. Share: Team members run "envsync sync"'));
  console.log(chalk.gray('  4. Code: ng serve\n'));
}