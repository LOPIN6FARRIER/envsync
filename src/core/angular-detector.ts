import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execa } from 'execa';
import { AngularProject } from '../types/index.types';

/**
 * Detects and analyzes Angular projects
 * Provides information about Angular version, Node requirements, and project structure
 */
export class AngularDetector {

  /**
   * Checks if the current directory is an Angular project
   * @returns true if the directory contains angular.json or has @angular/core as a dependency
   */
  async isAngularProject(): Promise<boolean> {
    const angularJsonPath = join(process.cwd(), 'angular.json');
    const packageJsonPath = join(process.cwd(), 'package.json');

    // Check if angular.json exists
    if (existsSync(angularJsonPath)) {
      return true;
    }

    // Check if package.json has Angular as a dependency
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      return !!(
        packageJson.dependencies?.['@angular/core'] ||
        packageJson.devDependencies?.['@angular/core']
      );
    }

    return false;
  }

  /**
   * Detects and returns complete Angular project information
   * @returns AngularProject object with version, tooling, and configuration details, or null if not an Angular project
   */
  async detectAngularProject(): Promise<AngularProject | null> {
    const isAngular = await this.isAngularProject();
    if (!isAngular) return null;

    const packageJsonPath = join(process.cwd(), 'package.json');

    if (!existsSync(packageJsonPath)) {
      throw new Error('package.json not found');
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

    // Get Angular version
    const angularVersion = this.getAngularVersion(packageJson);

    // Recommend Node version based on Angular version
    const nodeVersion = this.getRecommendedNodeVersion(angularVersion);

    // Detect package manager
    const packageManager = this.detectPackageManager();

    // Detect Nx
    const hasNx = !!(
      packageJson.dependencies?.['nx'] ||
      packageJson.devDependencies?.['nx'] ||
      existsSync(join(process.cwd(), 'nx.json'))
    );

    // Check for global Angular CLI
    const hasCLI = await this.hasAngularCLI();

    return {
      version: angularVersion,
      hasCLI,
      hasNx,
      packageManager,
      nodeVersion,
    };
  }

  /**
   * Extracts the Angular version from package.json
   * @param packageJson - The parsed package.json object
   * @returns The Angular version without prefix characters (^, ~)
   * @throws Error if @angular/core is not found in dependencies
   */
  getAngularVersion(packageJson: any): string {
    const angularCore =
      packageJson.dependencies?.['@angular/core'] ||
      packageJson.devDependencies?.['@angular/core'];

    if (!angularCore) {
      throw new Error('@angular/core not found in dependencies');
    }

    // Clean version: "^17.1.0" -> "17.1.0"
    return angularCore.replace(/[\^~]/g, '');
  }

  /**
   * Recommends the appropriate Node.js version for a given Angular version
   * Based on official Angular documentation: https://angular.io/guide/versions
   * @param angularVersion - The Angular version (e.g., "17.1.0")
   * @returns The recommended Node.js version
   */
  getRecommendedNodeVersion(angularVersion: string): string {
    const majorVersion = parseInt(angularVersion.split('.')[0]);

    const nodeVersionMap: Record<number, string> = {
      18: '20.11.1',  // Angular 18 (latest)
      17: '20.11.1',  // Angular 17
      16: '18.19.0',  // Angular 16
      15: '18.13.0',  // Angular 15
      14: '16.20.0',  // Angular 14
      13: '16.20.0',  // Angular 13
    };

    return nodeVersionMap[majorVersion] || '20.11.1';
  }

  /**
   * Detects the package manager by checking for lockfiles
   * @returns The detected package manager ('npm', 'pnpm', or 'yarn')
   */
  private detectPackageManager(): 'npm' | 'pnpm' | 'yarn' {
    if (existsSync('pnpm-lock.yaml')) return 'pnpm';
    if (existsSync('yarn.lock')) return 'yarn';
    return 'npm';
  }

  /**
   * Checks if Angular CLI is installed globally or locally
   * @returns true if the 'ng' command is available, false otherwise
   */
  private async hasAngularCLI(): Promise<boolean> {
    try {
      await execa('ng', ['version'], { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Returns a list of recommended VSCode extensions for Angular development
   * @param hasNx - Whether the project uses Nx
   * @returns Array of extension IDs
   */
  getRecommendedExtensions(hasNx: boolean = false): string[] {
    const extensions = [
      'angular.ng-template',              // Angular Language Service
      'johnpapa.angular2',                // Angular Snippets
      'esbenp.prettier-vscode',           // Prettier
      'dbaeumer.vscode-eslint',           // ESLint
      'cyrilletuzi.angular-schematics',   // Angular Schematics
    ];

    if (hasNx) {
      extensions.push('nrwl.angular-console'); // Nx Console
    }

    return extensions;
  }

  /**
   * Generates the correct Angular CLI package specifier for installation
   * @param angularVersion - The Angular version
   * @returns Package string for installation (e.g., "@angular/cli@17.1.0")
   */
  getAngularCLIVersion(angularVersion: string): string {
    return `@angular/cli@${angularVersion}`;
  }


}
