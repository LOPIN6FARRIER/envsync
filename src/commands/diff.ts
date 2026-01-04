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

export async function diffCommand() {
  console.log(chalk.blue.bold('\n🔍 EnvSync Diff - Environment Comparison\n'));

  // 1. Verificar que existe envsync.yaml
  if (!existsSync('envsync.yaml')) {
    console.log(chalk.red('❌ envsync.yaml not found!'));
    console.log(chalk.gray('Run: envsync init\n'));
    process.exit(1);
  }

  // 2. Leer configuración
  const configFile = readFileSync('envsync.yaml', 'utf8');
  const config: EnvSyncConfig = yaml.parse(configFile);

  console.log(chalk.gray(`Project: ${config.project.name}`));
  console.log(chalk.gray(`Type: ${config.project.type} ${config.project.angularVersion || ''}\n`));

  const differences: Array<{
    component: string;
    expected: string;
    current: string;
    status: 'match' | 'mismatch' | 'missing';
  }> = [];

  // 3. Verificar Node.js
  const currentNode = await getCurrentNodeVersion();
  differences.push({
    component: 'Node.js',
    expected: config.runtime.node,
    current: currentNode || 'Not installed',
    status: currentNode === config.runtime.node ? 'match' : currentNode ? 'mismatch' : 'missing',
  });

  // 4. Verificar NVM
  const nvmInstalled = await hasNVM();
  differences.push({
    component: 'NVM',
    expected: 'Installed',
    current: nvmInstalled ? 'Installed' : 'Not installed',
    status: nvmInstalled ? 'match' : 'missing',
  });

  // 5. Verificar .nvmrc
  const nvmrcExists = existsSync('.nvmrc');
  differences.push({
    component: '.nvmrc file',
    expected: 'Present',
    current: nvmrcExists ? 'Present' : 'Missing',
    status: nvmrcExists ? 'match' : 'missing',
  });

  // 6. Verificar Package Manager
  const [pm] = config.runtime.packageManager.includes('@')
    ? config.runtime.packageManager.split('@')
    : [config.runtime.packageManager];

  const hasPM = await hasPackageManager(pm);
  differences.push({
    component: `Package Manager (${pm})`,
    expected: 'Installed',
    current: hasPM ? 'Installed' : 'Not installed',
    status: hasPM ? 'match' : 'missing',
  });

  // 7. Verificar dependencias globales
  if (config.dependencies?.global) {
    for (const dep of config.dependencies.global) {
      const isInstalled = await hasGlobalPackage(dep);
      differences.push({
        component: `Global: ${dep}`,
        expected: 'Installed',
        current: isInstalled ? 'Installed' : 'Not installed',
        status: isInstalled ? 'match' : 'missing',
      });
    }
  }

  // 8. Verificar extensiones VSCode
  const vscodeAvailable = await hasVSCodeCLI();
  
  if (config.extensions?.vscode && vscodeAvailable) {
    for (const ext of config.extensions.vscode) {
      const isInstalled = await hasVSCodeExtension(ext);
      differences.push({
        component: `VSCode: ${ext}`,
        expected: 'Installed',
        current: isInstalled ? 'Installed' : 'Not installed',
        status: isInstalled ? 'match' : 'missing',
      });
    }
  } else if (config.extensions?.vscode && !vscodeAvailable) {
    differences.push({
      component: 'VSCode CLI',
      expected: 'Available',
      current: 'Not available',
      status: 'missing',
    });
  }

  // 9. Mostrar tabla de diferencias
  const table = new Table({
    head: [
      chalk.bold('Component'),
      chalk.bold('Expected'),
      chalk.bold('Current'),
      chalk.bold('Status'),
    ],
    colWidths: [40, 20, 20, 15],
  });

  let matchCount = 0;
  let mismatchCount = 0;
  let missingCount = 0;

  for (const diff of differences) {
    let statusIcon = '';
    let statusColor = chalk.gray;

    if (diff.status === 'match') {
      statusIcon = '✓ Match';
      statusColor = chalk.green;
      matchCount++;
    } else if (diff.status === 'mismatch') {
      statusIcon = '⚠ Diff';
      statusColor = chalk.yellow;
      mismatchCount++;
    } else {
      statusIcon = '✗ Missing';
      statusColor = chalk.red;
      missingCount++;
    }

    table.push([
      diff.component,
      diff.expected,
      diff.current,
      statusColor(statusIcon),
    ]);
  }

  console.log(table.toString());

  // 10. Resumen
  console.log();
  console.log(chalk.bold('📊 Summary:\n'));
  console.log(chalk.green(`  ✓ Matching: ${matchCount}`));
  if (mismatchCount > 0) {
    console.log(chalk.yellow(`  ⚠ Different: ${mismatchCount}`));
  }
  if (missingCount > 0) {
    console.log(chalk.red(`  ✗ Missing: ${missingCount}`));
  }

  console.log();

  if (mismatchCount > 0 || missingCount > 0) {
    console.log(chalk.blue('💡 To fix differences:'));
    console.log(chalk.gray('   envsync sync\n'));
  } else {
    console.log(chalk.green('✨ Everything matches! No action needed.\n'));
  }
}