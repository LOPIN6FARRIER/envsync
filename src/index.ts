#!/usr/bin/env node

/**
 * EnvSync CLI - Development Environment Synchronization Tool
 *
 * A CLI tool for synchronizing development environments across Angular teams.
 * Manages Node.js versions, package managers, global dependencies, and VSCode extensions.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initCommand } from './commands/init.js';
import { syncCommand } from './commands/sync.js';
import { diffCommand } from './commands/diff.js';
import { cleanCommand } from './commands/clean.js';
import { updateCommand } from './commands/update.js';
import { tryCommand } from './commands/try.js';
import { setVerbose, setColorMode } from './utils/logger.js';

// Get version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
const version = packageJson.version;

const program = new Command();

program
  .name('envsync')
  .description(chalk.blue('🔄 Sync your Angular development environment'))
  .version(version, '-v, --version', 'Output the current version');

program
  .command('init')
  .description('Initialize EnvSync in your Angular project')
  .option('-f, --force', 'Overwrite existing envsync.yaml')
  .action(initCommand);

program
  .command('sync')
  .description('Sync your environment to match project requirements')
  .option('-y, --yes', 'Skip confirmations')
  .action(syncCommand);

program
  .command('try')
  .aliases(['check', 'doctor', 'status'])
  .description('Check the health of your development environment')
  .action(tryCommand);

program
  .command('diff')
  .description('Show differences between expected and current environment')
  .action(diffCommand);

program
  .command('clean')
  .description('Clean node_modules and lockfiles, then reinstall')
  .option('-y, --yes', 'Skip confirmations')
  .option('-a, --all', 'Also remove build cache and dist folder')
  .action(cleanCommand);

program
  .command('update')
  .description('Update envsync.yaml to match current project versions')
  .option('-y, --yes', 'Skip confirmations and auto-sync')
  .action(updateCommand);

// Global options
program
  .option('--no-color', 'Disable colored output')
  .option('--verbose', 'Enable verbose logging');

// Show help after error and suggestions
program.showHelpAfterError('(add --help for additional information)');
program.showSuggestionAfterError(true);

// Add examples to help
program.addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.gray('# Initialize EnvSync in your project')}
  $ envsync init

  ${chalk.gray('# Check environment status')}
  $ envsync try

  ${chalk.gray('# Sync environment to match requirements')}
  $ envsync sync

  ${chalk.gray('# View differences without syncing')}
  $ envsync diff

  ${chalk.gray('# Clean and reinstall dependencies')}
  $ envsync clean -y

  ${chalk.gray('# Update config to match current versions')}
  $ envsync update

${chalk.bold('Learn more:')}
  ${chalk.cyan('https://github.com/LOPIN6FARRIER/envsync#readme')}
`);

// Global error handling
process.on('unhandledRejection', (reason: any) => {
  console.error(chalk.red('\n❌ Unhandled error:'), reason);
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  console.error(chalk.red('\n❌ Unexpected error:'), error.message);
  if (program.opts().verbose) {
    console.error(error.stack);
  }
  process.exit(1);
});

program.parse();

// Apply global options after parsing
const options = program.opts();
if (options.verbose) {
  setVerbose(true);
}
if (options.color === false) {
  setColorMode(false);
}