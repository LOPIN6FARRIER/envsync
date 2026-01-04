import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { existsSync, readFileSync } from "fs";
import yaml from "yaml";
import { execa } from "execa";
import {
  getCurrentNodeVersion,
  hasNVM,
  isNodeVersionInstalled,
  installNodeVersion,
  useNodeVersion,
  createNvmrc,
  hasPackageManager,
  hasGlobalPackage,
  hasVSCodeExtension,
  hasVSCodeCLI,
  installNVMInteractive,
} from "../utils/system.js";
import { EnvSyncConfig } from "../types/index.types.js";
import { join } from "path";

interface SyncOptions {
  yes?: boolean;
}

export async function syncCommand(options: SyncOptions) {
  console.log(chalk.blue.bold("\n🔄 EnvSync - Syncing Angular Environment\n"));

  // 1. Verificar que existe envsync.yaml
  if (!existsSync("envsync.yaml")) {
    console.log(chalk.red("❌ envsync.yaml not found!"));
    console.log(chalk.gray("Run: envsync init\n"));
    process.exit(1);
  }

  // 2. Leer configuración
  const configFile = readFileSync("envsync.yaml", "utf8");
  const config: EnvSyncConfig = yaml.parse(configFile);

  console.log(chalk.gray(`Project: ${config.project.name}`));
  console.log(
    chalk.gray(`Angular: ${config.project.angularVersion || "N/A"}\n`)
  );

  let hasErrors = false;
  const issues: string[] = [];

  try {
    // 3. Verificar/Cambiar Node.js
    const spinner1 = ora("Checking Node.js version...").start();
    const currentNode = await getCurrentNodeVersion();

    if (!currentNode) {
      spinner1.fail("Node.js is not installed");
      console.log(chalk.red("\n❌ Node.js not found"));
      console.log(
        chalk.gray("Please install Node.js from: https://nodejs.org/\n")
      );
      process.exit(1);
    }

    if (currentNode !== config.runtime.node) {
      spinner1.warn(
        `Node.js: ${currentNode} (expected ${config.runtime.node})`
      );

      // Verificar si tiene nvm
      const nvmInstalled = await hasNVM();

      if (nvmInstalled) {
        console.log(chalk.blue("\n🔧 Fixing Node.js version with nvm...\n"));

        // Verificar si la versión requerida está instalada
        const versionInstalled = await isNodeVersionInstalled(
          config.runtime.node
        );

        if (!versionInstalled) {
          const spinner1a = ora(
            `Installing Node.js ${config.runtime.node}...`
          ).start();
          try {
            await installNodeVersion(config.runtime.node);
            spinner1a.succeed(`Node.js ${config.runtime.node} installed ✓`);
          } catch (error: any) {
            spinner1a.fail(`Failed to install Node.js ${config.runtime.node}`);
            console.log(chalk.red("\n❌ Installation failed"));
            console.log(chalk.gray("Please install manually:"));
            console.log(chalk.gray(`  nvm install ${config.runtime.node}\n`));
            hasErrors = true;
          }
        }

        // Cambiar a la versión correcta
        const spinner1b = ora(
          `Switching to Node.js ${config.runtime.node}...`
        ).start();
        try {
          await useNodeVersion(config.runtime.node);
          spinner1b.succeed(`Node.js ${config.runtime.node} activated ✓`);

          // Crear .nvmrc para auto-switching futuro
          await createNvmrc(config.runtime.node);
          console.log(chalk.gray(`  ✓ Created .nvmrc file\n`));
        } catch (error: any) {
          spinner1b.fail(`Failed to switch Node.js version`);
          console.log(chalk.red("\n❌ Switch failed"));
          console.log(chalk.gray("Please switch manually:"));
          console.log(chalk.gray(`  nvm use ${config.runtime.node}\n`));
          hasErrors = true;
        }
      } else {
        // No tiene nvm instalado - Ofrecer instalarlo
        console.log(chalk.yellow("\n⚠️  Node.js version mismatch"));
        console.log(chalk.gray("Current version:", currentNode));
        console.log(chalk.gray("Required version:", config.runtime.node));

        if (!options.yes) {
          console.log(
            chalk.blue(
              "\n💡 Recommendation: Install nvm to manage Node versions\n"
            )
          );

          const { shouldInstallNVM } = await inquirer.prompt([
            {
              type: "confirm",
              name: "shouldInstallNVM",
              message: "Would you like to install nvm now?",
              default: true,
            },
          ]);

          if (shouldInstallNVM) {
            await installNVMInteractive();
            console.log(
              chalk.yellow(
                '\n⚠️  Please restart your terminal and run "envsync sync" again\n'
              )
            );
            process.exit(0);
          } else {
            console.log(chalk.gray("\nTo install nvm manually:"));
            console.log(
              chalk.gray("Windows: https://github.com/coreybutler/nvm-windows")
            );
            console.log(
              chalk.gray("Mac/Linux: https://github.com/nvm-sh/nvm\n")
            );
          }
        } else {
          // Modo automático (-y flag)
          console.log(chalk.gray("\nTo fix this, install nvm:"));
          console.log(
            chalk.gray("Windows: https://github.com/coreybutler/nvm-windows")
          );
          console.log(chalk.gray("Mac/Linux: https://github.com/nvm-sh/nvm\n"));
        }

        issues.push(
          `Node.js version mismatch: using ${currentNode}, expected ${config.runtime.node}`
        );
      }
    } else {
      spinner1.succeed(`Node.js: ${currentNode} ✓`);
    }

    // 4. Verificar/Instalar package manager
    const spinner2 = ora("Checking package manager...").start();
    const [pm, pmVersion] = config.runtime.packageManager.includes("@")
      ? config.runtime.packageManager.split("@")
      : [config.runtime.packageManager, "latest"];

    const hasPM = await hasPackageManager(pm);

    if (!hasPM) {
      spinner2.text = `Installing ${pm}...`;
      try {
        await execa("npm", ["install", "-g", config.runtime.packageManager], {
          stdio: "inherit",
        });
        spinner2.succeed(`${pm} installed ✓`);
      } catch (error) {
        spinner2.fail(`Failed to install ${pm}`);
        hasErrors = true;
      }
    } else {
      spinner2.succeed(`Package manager: ${pm} ✓`);
    }

    // 5. Instalar dependencias globales
    if (config.dependencies?.global && config.dependencies.global.length > 0) {
      const spinner3 = ora("Checking global dependencies...").start();

      for (const dep of config.dependencies.global) {
        const [pkgName] = dep.split("@");
        const isInstalled = await hasGlobalPackage(pkgName);

        if (!isInstalled) {
          spinner3.text = `Installing ${dep}...`;
          try {
            await execa("npm", ["install", "-g", dep], {
              stdio: "inherit",
            });
            spinner3.text = `${dep} installed ✓`;
          } catch (error) {
            spinner3.fail(`Failed to install ${dep}`);
            hasErrors = true;
          }
        } else {
          spinner3.text = `${pkgName} ✓`;
        }
      }

      spinner3.succeed("Global dependencies checked ✓");
    }

    // 6. Instalar extensiones VSCode
    if (config.extensions?.vscode && config.extensions.vscode.length > 0) {
      const hasVSCode = await hasVSCodeCLI();

      if (!hasVSCode) {
        console.log(chalk.yellow("\n⚠️  VSCode CLI not found"));
        console.log(chalk.gray("Extensions will be skipped. To enable:"));
        console.log(chalk.gray("  1. Open VSCode"));
        console.log(chalk.gray("  2. Press Ctrl+Shift+P (Cmd+Shift+P on Mac)"));
        console.log(
          chalk.gray(
            '  3. Type: "Shell Command: Install code command in PATH"\n'
          )
        );
      } else {
        const spinner4 = ora("Installing VSCode extensions...").start();

        for (const ext of config.extensions.vscode) {
          const isInstalled = await hasVSCodeExtension(ext);

          if (!isInstalled) {
            spinner4.text = `Installing ${ext}...`;
            try {
              await execa("code", ["--install-extension", ext], {
                stdio: "ignore",
              });
              spinner4.text = `${ext} installed ✓`;
            } catch (error) {
              spinner4.warn(`Could not install ${ext}`);
            }
          } else {
            spinner4.text = `${ext} ✓`;
          }
        }

        spinner4.succeed("VSCode extensions checked ✓");
      }
    }

    // 7. Ejecutar scripts post-sync
    // 7. Ejecutar scripts post-sync
if (
  config.scripts?.["post-sync"] &&
  config.scripts["post-sync"].length > 0
) {
  console.log(chalk.blue("\n📦 Running post-sync scripts...\n"));

  for (const script of config.scripts["post-sync"]) {
    const spinner5 = ora(`Running: ${script}`).start();

    try {
      const [cmd, ...args] = script.split(" ");
      
      // Skip husky si no está en package.json
      if (cmd === "npx" && args[0] === "husky") {
        const packageJsonPath = join(process.cwd(), "package.json");
        if (existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
          const hasHusky = 
            packageJson.dependencies?.husky ||
            packageJson.devDependencies?.husky;
          
          if (!hasHusky) {
            spinner5.info(`${script} (skipped - husky not in package.json)`);
            continue;
          }
        }
      }
      
      await execa(cmd, args, { stdio: "inherit" });
      spinner5.succeed(`${script} ✓`);
    } catch (error) {
      // No marcar como error si es audit fix (es opcional)
      if (script.includes("audit fix")) {
        spinner5.warn(`${script} (had issues, but continuing)`);
      } else {
        spinner5.fail(`Failed: ${script}`);
        hasErrors = true;
      }
    }
  }
}

    // 8. Resumen final
    console.log();
    if (hasErrors) {
      console.log(chalk.yellow("⚠️  Sync completed with some errors\n"));
    } else if (issues.length > 0) {
      console.log(chalk.yellow("⚠️  Sync completed with warnings\n"));
      console.log(chalk.gray("Issues:"));
      issues.forEach((issue, i) => {
        console.log(chalk.gray(`  ${i + 1}. ${issue}`));
      });
      console.log();
    } else {
      console.log(chalk.green("✅ Environment synced successfully!\n"));
      console.log(chalk.gray("🎉 You're ready to code!\n"));
      console.log(chalk.gray("Start development:"));
      console.log(chalk.gray("  ng serve\n"));
    }
  } catch (error: any) {
    console.log(chalk.red("\n❌ Sync failed\n"));
    console.error(error.message);
    process.exit(1);
  }
}
