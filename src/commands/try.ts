import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import yaml from 'yaml';
import Table from 'cli-table3';

import {
  getCurrentNodeVersion,
  hasNVM,
  hasPackageManager,
  hasGlobalPackage,
  hasVSCodeExtension,
  hasVSCodeCLI,
} from '../utils/system.js';
import { EnvSyncConfig } from '../types/index.types.js';

export async function tryCommand() {
  console.log(chalk.blue.bold('\n🔍 EnvSync Doctor - Health Check\n'));

  // Verificar que existe envsync.yaml
  if (!existsSync('envsync.yaml')) {
    console.log(chalk.red('❌ envsync.yaml not found!'));
    console.log(chalk.gray('Run: envsync init\n'));
    process.exit(1);
  }

  // Leer configuración
  const configFile = readFileSync('envsync.yaml', 'utf8');
  const config: EnvSyncConfig = yaml.parse(configFile);

  console.log(chalk.gray(`Project: ${config.project.name}`));
  console.log(chalk.gray(`Type: Angular ${config.project.angularVersion || 'N/A'}\n`));

  const issues: string[] = [];
  let healthScore = 100;

  // Crear tabla de resultados
  const table = new Table({
    head: [
      chalk.bold('Check'),
      chalk.bold('Status'),
      chalk.bold('Details'),
    ],
    colWidths: [30, 15, 50],
    style: {
      head: ['cyan'],
    },
  });

  // 1. Check Node.js
  const currentNode = await getCurrentNodeVersion();
  const requiredNode = config.runtime.node;
  const nodeMatch = currentNode === requiredNode;

  table.push([
    'Node.js version',
    nodeMatch ? chalk.green('✓ OK') : chalk.red('✗ FAIL'),
    nodeMatch
      ? currentNode || 'N/A'
      : `${chalk.gray(currentNode)} → ${chalk.yellow(requiredNode)}`,
  ]);

  if (!nodeMatch) {
    issues.push(`Node.js: expected ${requiredNode}, got ${currentNode}`);
    healthScore -= 20;
  }

  // 2. Check nvm
  const nvmInstalled = await hasNVM();
  table.push([
    'NVM (Node Version Manager)',
    nvmInstalled ? chalk.green('✓ OK') : chalk.yellow('⚠ WARN'),
    nvmInstalled ? 'Installed' : 'Not installed (recommended)',
  ]);

  if (!nvmInstalled) {
    issues.push('NVM not installed - recommended for managing Node versions');
    healthScore -= 5;
  }

  // 3. Check .nvmrc
  const hasNvmrc = existsSync('.nvmrc');
  table.push([
    '.nvmrc file',
    hasNvmrc ? chalk.green('✓ OK') : chalk.yellow('⚠ WARN'),
    hasNvmrc ? 'Present' : 'Missing',
  ]);

  if (!hasNvmrc && nvmInstalled) {
    issues.push('.nvmrc file missing - run "envsync sync" to create it');
    healthScore -= 5;
  }

  // 4. Check package manager
  const [pm] = config.runtime.packageManager.includes('@')
    ? config.runtime.packageManager.split('@')
    : [config.runtime.packageManager];
  const hasPM = await hasPackageManager(pm);

  table.push([
    `Package manager (${pm})`,
    hasPM ? chalk.green('✓ OK') : chalk.red('✗ FAIL'),
    hasPM ? 'Installed' : chalk.yellow('Not installed'),
  ]);

  if (!hasPM) {
    issues.push(`Package manager ${pm} not installed`);
    healthScore -= 15;
  }

  // 5. Check global dependencies
  const globals = config.dependencies?.global || [];
  let missingGlobals = 0;
  const globalDetails: string[] = [];

  for (const dep of globals) {
    const [pkg] = dep.split('@');
    const has = await hasGlobalPackage(pkg);

    if (!has) {
      missingGlobals++;
      issues.push(`Missing global dependency: ${dep}`);
      globalDetails.push(`${pkg} ✗`);
    } else {
      globalDetails.push(`${pkg} ✓`);
    }
  }

  if (globals.length > 0) {
    const allInstalled = missingGlobals === 0;
    table.push([
      'Global dependencies',
      allInstalled ? chalk.green('✓ OK') : chalk.yellow('⚠ WARN'),
      allInstalled
        ? `All ${globals.length} installed`
        : chalk.yellow(`${missingGlobals}/${globals.length} missing`),
    ]);

    if (missingGlobals > 0) {
      healthScore -= missingGlobals * 10;
    }
  }

  // 6. Check VSCode
  const vscodeAvailable = await hasVSCodeCLI();
  table.push([
    'VSCode CLI',
    vscodeAvailable ? chalk.green('✓ OK') : chalk.yellow('⚠ INFO'),
    vscodeAvailable ? 'Available' : 'Not available',
  ]);

  // 7. Check VSCode extensions
  const extensions = config.extensions?.vscode || [];
  let missingExtensions = 0;

  if (vscodeAvailable && extensions.length > 0) {
    for (const ext of extensions) {
      const has = await hasVSCodeExtension(ext);
      if (!has) {
        missingExtensions++;
        issues.push(`Missing VSCode extension: ${ext}`);
      }
    }

    const allInstalled = missingExtensions === 0;
    table.push([
      'VSCode extensions',
      allInstalled ? chalk.green('✓ OK') : chalk.yellow('⚠ WARN'),
      allInstalled
        ? `All ${extensions.length} installed`
        : chalk.yellow(`${missingExtensions}/${extensions.length} missing`),
    ]);

    if (missingExtensions > 0) {
      healthScore -= missingExtensions * 3;
    }
  } else if (!vscodeAvailable && extensions.length > 0) {
    table.push([
      'VSCode extensions',
      chalk.gray('⊘ SKIP'),
      'Cannot check (VSCode CLI not available)',
    ]);
  }

  // 8. Check node_modules
  const hasNodeModules = existsSync('node_modules');
  table.push([
    'Dependencies installed',
    hasNodeModules ? chalk.green('✓ OK') : chalk.yellow('⚠ WARN'),
    hasNodeModules ? 'node_modules present' : 'Run npm install',
  ]);

  if (!hasNodeModules) {
    issues.push('Dependencies not installed - run "npm install"');
    healthScore -= 10;
  }

  // 9. Check package.json
  const hasPackageJson = existsSync('package.json');
  table.push([
    'package.json',
    hasPackageJson ? chalk.green('✓ OK') : chalk.red('✗ FAIL'),
    hasPackageJson ? 'Present' : 'Missing',
  ]);

  if (!hasPackageJson) {
    issues.push('package.json missing');
    healthScore -= 20;
  }

  // 10. Check angular.json
  const hasAngularJson = existsSync('angular.json');
  table.push([
    'angular.json',
    hasAngularJson ? chalk.green('✓ OK') : chalk.red('✗ FAIL'),
    hasAngularJson ? 'Present' : 'Missing',
  ]);

  if (!hasAngularJson) {
    issues.push('angular.json missing');
    healthScore -= 15;
  }

  // Mostrar tabla
  console.log(table.toString());

  // Health Score
  healthScore = Math.max(0, healthScore);
  const scoreColor =
    healthScore >= 90
      ? chalk.green
      : healthScore >= 70
      ? chalk.yellow
      : chalk.red;

  console.log(`\n📊 Health Score: ${scoreColor.bold(healthScore + '/100')}`);

  // Emoji según score
  const emoji =
    healthScore >= 90
      ? '🎉'
      : healthScore >= 70
      ? '⚠️'
      : '❌';

  console.log(`${emoji} Environment Status: ${scoreColor.bold(
    healthScore >= 90 ? 'Excellent' : healthScore >= 70 ? 'Good' : 'Needs Attention'
  )}\n`);

  // Mostrar issues
  if (issues.length > 0) {
    console.log(chalk.yellow('Issues found:\n'));
    issues.forEach((issue, i) => {
      console.log(chalk.gray(`  ${i + 1}. ${issue}`));
    });
    console.log();
    console.log(chalk.blue('💡 Recommendation:'));
    console.log(chalk.gray('   Run: envsync sync\n'));
  } else {
    console.log(chalk.green('✨ Everything looks perfect!\n'));
    console.log(chalk.gray('You\'re ready to develop:\n'));
    console.log(chalk.gray('   ng serve\n'));
  }

  // Exit code según health score
  process.exit(healthScore >= 70 ? 0 : 1);
}