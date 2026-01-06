import chalk from 'chalk';
import inquirer from 'inquirer';
import { writeFileSync, existsSync } from 'fs';
import yaml from 'yaml';
import ora from 'ora';
import { AngularDetector } from '../core/angular-detector.js';
import { EnvSyncConfig } from '../types/index.types.js';
import { verbose, error, warning, success, gray } from '../utils/logger.js';


interface InitOptions {
  force?: boolean;
}

export async function initCommand(options: InitOptions) {
  console.log(chalk.blue.bold('\n🚀 EnvSync - Initialize Angular Project\n'));

  // Check if envsync.yaml already exists
  if (existsSync('envsync.yaml') && !options.force) {
    warning('envsync.yaml already exists!');
    gray('Use --force to overwrite\n');
    process.exit(1);
  }

  verbose('Starting Angular project detection...');
  const spinner = ora('Detecting Angular project...').start();

  const detector = new AngularDetector();
  const isAngular = await detector.isAngularProject();

  if (!isAngular) {
    spinner.fail('Not an Angular project');
    error('This is not an Angular project');
    gray('Make sure you are in an Angular project directory');
    gray('Or create one with: ng new my-app\n');
    process.exit(1);
  }

  const angularProject = await detector.detectAngularProject();

  if (!angularProject) {
    spinner.fail('Could not detect Angular configuration');
    error('Could not detect Angular configuration');
    process.exit(1);
  }

  spinner.succeed(`Angular ${angularProject.version} detected`);

  // Display detected configuration
  gray('\nDetected configuration:');
  gray(`  Angular: ${angularProject.version}`);
  gray(`  Package Manager: ${angularProject.packageManager}`);
  gray(`  Recommended Node: ${angularProject.nodeVersion}`);
  gray(`  Has Nx: ${angularProject.hasNx ? 'Yes' : 'No'}`);
  gray(`  Angular CLI: ${angularProject.hasCLI ? 'Installed' : 'Not installed'}\n`);

  // Interactive questions
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: process.cwd().split(/[\\/]/).pop(), // Works on Windows and Unix
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

  // Create configuration
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

  // Add Nx if exists
  if (angularProject.hasNx) {
    config.dependencies.global.push('nx@latest');
  }

  // Add VSCode extensions
  if (answers.includeVSCodeExtensions) {
    config.extensions = { 
      vscode: detector.getRecommendedExtensions(angularProject.hasNx) 
    };
  }

  // Post-sync scripts
  const postSyncScripts = [`${answers.packageManager} install`];
  
  // Add husky if exists
  if (existsSync('.husky')) {
    postSyncScripts.push('npx husky install');
  }

  config.scripts = { 'post-sync': postSyncScripts, 'pre-sync': [] };

  // Save YAML file with format that avoids parsing issues
  verbose('Generating envsync.yaml file...');
  const yamlContent = yaml.stringify(config, {
    indent: 2,
    lineWidth: -1,
    // Ensures that strings with : are serialized in quotes
    defaultStringType: 'QUOTE_DOUBLE',
  });
  writeFileSync('envsync.yaml', yamlContent);
  verbose('envsync.yaml file written successfully');

  success('envsync.yaml created successfully!\n');
  gray('Next steps:');
  gray('  1. Review: envsync.yaml');
  gray('  2. Commit: git add envsync.yaml && git commit -m "Add EnvSync config"');
  gray('  3. Share: Team members run "envsync sync"');
  gray('  4. Code: ng serve\n');
}