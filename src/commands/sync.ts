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
import { verbose, error, warning, success, info, gray, blue, yellow } from "../utils/logger.js";

interface SyncOptions {
  yes?: boolean;
}

export async function syncCommand(options: SyncOptions) {
  console.log(chalk.blue.bold("\n🔄 EnvSync - Syncing Angular Environment\n"));

  if (!existsSync("envsync.yaml")) {
    error("envsync.yaml not found!");
    gray("Run: envsync init\n");
    process.exit(1);
  }

  verbose("Reading envsync.yaml configuration file");
  const configFile = readFileSync("envsync.yaml", "utf8");
  const config: EnvSyncConfig = yaml.parse(configFile);
  verbose(`Loaded config for project: ${config.project.name}`);

  gray(`Project: ${config.project.name}`);
  gray(`Angular: ${config.project.angularVersion || "N/A"}\n`);

  let hasErrors = false;
  const issues: string[] = [];

  // Helper function to normalize script values
  const normalizeScript = (script: any): string => {
    if (typeof script === "string") {
      return script;
    }
    if (typeof script === "object" && script !== null) {
      // YAML parsed "echo 'text: value'" as { 'echo \'text': 'value\'' }
      const entries = Object.entries(script);
      if (entries.length === 1) {
        const [key, value] = entries[0];
        return `${key}: ${value}`;
      }
    }
    return String(script);
  };

  try {
    if (config.scripts?.["pre-sync"] && config.scripts["pre-sync"].length > 0) {
      yellow("⚠️  pre-sync scripts will be executed as raw shell commands\n");
      blue("\n⚙️  Running pre-sync scripts...\n");

      for (const rawScript of config.scripts["pre-sync"]) {
        const script = normalizeScript(rawScript);
        const spinner = ora(`Running: ${script}`).start();

        try {
          await execa(script, {
            stdio: "inherit",
            shell: true,
            env: process.env,
            timeout: 1000 * 60 * 5,
          });

          spinner.succeed(`${script} ✓`);
        } catch (error) {
          spinner.fail(`Failed: ${script}`);
          throw error;
        }
      }
    }

    const spinner1 = ora("Checking Node.js version...").start();
    const currentNode = await getCurrentNodeVersion();
    verbose(`Current Node.js version detected: ${currentNode}`);

    if (!currentNode) {
      spinner1.fail("Node.js is not installed");
      error("Node.js not found");
      gray("Please install Node.js from: https://nodejs.org/\n");
      process.exit(1);
    }

    if (currentNode !== config.runtime.node) {
      spinner1.warn(
        `Node.js: ${currentNode} (expected ${config.runtime.node})`
      );

      const nvmInstalled = await hasNVM();

      if (nvmInstalled) {
        console.log(chalk.blue("\n🔧 Fixing Node.js version with nvm...\n"));

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
          } catch (err: any) {
            spinner1a.fail(`Failed to install Node.js ${config.runtime.node}`);
            error("Installation failed");
            gray("Please install manually:");
            gray(`  nvm install ${config.runtime.node}\n`);
            hasErrors = true;
          }
        }

        const spinner1b = ora(
          `Switching to Node.js ${config.runtime.node}...`
        ).start();
        try {
          await useNodeVersion(config.runtime.node);
          spinner1b.succeed(`Node.js ${config.runtime.node} activated ✓`);

          await createNvmrc(config.runtime.node);
          gray(`  ✓ Created .nvmrc file\n`);
        } catch (err: any) {
          spinner1b.fail(`Failed to switch Node.js version`);
          error("Switch failed");
          gray("Please switch manually:");
          gray(`  nvm use ${config.runtime.node}\n`);
          hasErrors = true;
        }
      } else {
        warning("Node.js version mismatch");
        gray("Current version:", currentNode);
        gray("Required version:", config.runtime.node);

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
            gray("\nTo install nvm manually:");
            gray("Windows: https://github.com/coreybutler/nvm-windows");
            gray("Mac/Linux: https://github.com/nvm-sh/nvm\n");
          }
        } else {
          gray("\nTo fix this, install nvm:");
          gray("Windows: https://github.com/coreybutler/nvm-windows");
          gray("Mac/Linux: https://github.com/nvm-sh/nvm\n");
        }

        issues.push(
          `Node.js version mismatch: using ${currentNode}, expected ${config.runtime.node}`
        );
      }
    } else {
      spinner1.succeed(`Node.js: ${currentNode} ✓`);
    }

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

    if (config.extensions?.vscode && config.extensions.vscode.length > 0) {
      const hasVSCode = await hasVSCodeCLI();

      if (!hasVSCode) {
        yellow("\n⚠️  VSCode CLI not found");
        gray("Extensions will be skipped. To enable:");
        gray("  1. Open VSCode");
        gray("  2. Press Ctrl+Shift+P (Cmd+Shift+P on Mac)");
        gray('  3. Type: "Shell Command: Install code command in PATH"\n');
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
    if (
      config.scripts?.["post-sync"] &&
      config.scripts["post-sync"].length > 0
    ) {
      console.log(chalk.blue("\n📦 Running post-sync scripts...\n"));

      for (const rawScript of config.scripts["post-sync"]) {
        const script = normalizeScript(rawScript);
        const spinner5 = ora(`Running: ${script}`).start();

        try {
          const [cmd, ...args] = script.split(" ");

          if (cmd === "npx" && args[0] === "husky") {
            const packageJsonPath = join(process.cwd(), "package.json");
            if (existsSync(packageJsonPath)) {
              const packageJson = JSON.parse(
                readFileSync(packageJsonPath, "utf8")
              );
              const hasHusky =
                packageJson.dependencies?.husky ||
                packageJson.devDependencies?.husky;

              if (!hasHusky) {
                spinner5.info(
                  `${script} (skipped - husky not in package.json)`
                );
                continue;
              }
            }
          }

          await execa(script, {
            stdio: "inherit",
            shell: true,
            env: process.env,
          });

          spinner5.succeed(`${script} ✓`);
        } catch (error) {
          if (script.includes("audit fix")) {
            spinner5.warn(`${script} (had issues, but continuing)`);
          } else {
            spinner5.fail(`Failed: ${script}`);
            hasErrors = true;
          }
        }
      }
    }

    console.log();
    if (hasErrors) {
      warning("Sync completed with some errors\n");
    } else if (issues.length > 0) {
      warning("Sync completed with warnings\n");
      gray("Issues:");
      issues.forEach((issue, i) => {
        gray(`  ${i + 1}. ${issue}`);
      });
      console.log();
    } else {
      success("Environment synced successfully!\n");
      gray("🎉 You're ready to code!\n");
      gray("Start development:");
      gray("  ng serve\n");
    }
  } catch (err: any) {
    error("Sync failed\n");
    console.error(err.message);
    process.exit(1);
  }
}
