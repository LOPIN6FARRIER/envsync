#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { syncCommand } from './commands/sync.js';
import { diffCommand } from './commands/diff.js';
import { cleanCommand } from './commands/clean.js';
import { updateCommand } from './commands/update.js';
import { tryCommand } from './commands/try.js';

const program = new Command();

program
  .name('envsync')
  .description(chalk.blue('🔄 Sync your Angular development environment'))
  .version('0.1.0');

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

program.parse();