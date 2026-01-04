import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execa } from 'execa';
import { AngularProject } from '../types/index.types';


export class AngularDetector {
  
  /**
   * Detecta si el directorio actual es un proyecto Angular
   */
  async isAngularProject(): Promise<boolean> {
    const angularJsonPath = join(process.cwd(), 'angular.json');
    const packageJsonPath = join(process.cwd(), 'package.json');

    // Verificar si existe angular.json
    if (existsSync(angularJsonPath)) {
      return true;
    }

    // Verificar si package.json tiene Angular como dependencia
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
   * Obtiene información completa del proyecto Angular
   */
  async detectAngularProject(): Promise<AngularProject | null> {
    const isAngular = await this.isAngularProject();
    if (!isAngular) return null;

    const packageJsonPath = join(process.cwd(), 'package.json');

    if (!existsSync(packageJsonPath)) {
      throw new Error('package.json not found');
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    
    // Obtener versión de Angular
    const angularVersion = this.getAngularVersion(packageJson);
    
    // Recomendar Node según versión de Angular
    const nodeVersion = this.getRecommendedNodeVersion(angularVersion);
    
    // Detectar package manager
    const packageManager = this.detectPackageManager();
    
    // Detectar Nx
    const hasNx = !!(
      packageJson.dependencies?.['nx'] ||
      packageJson.devDependencies?.['nx'] ||
      existsSync(join(process.cwd(), 'nx.json'))
    );
    
    // Verificar Angular CLI global
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
   * Extrae versión de Angular del package.json
   */
  getAngularVersion(packageJson: any): string {
    const angularCore = 
      packageJson.dependencies?.['@angular/core'] ||
      packageJson.devDependencies?.['@angular/core'];

    if (!angularCore) {
      throw new Error('@angular/core not found in dependencies');
    }

    // Limpiar versión: "^17.1.0" -> "17.1.0"
    return angularCore.replace(/[\^~]/g, '');
  }

  /**
   * Recomienda Node según versión de Angular
   * Basado en: https://angular.io/guide/versions
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
   * Detecta package manager por lockfile
   */
  private detectPackageManager(): 'npm' | 'pnpm' | 'yarn' {
    if (existsSync('pnpm-lock.yaml')) return 'pnpm';
    if (existsSync('yarn.lock')) return 'yarn';
    return 'npm';
  }

  /**
   * Verifica si tiene Angular CLI instalado
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
   * Obtiene extensiones VSCode recomendadas
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
   * Genera la versión correcta de Angular CLI
   */
  getAngularCLIVersion(angularVersion: string): string {
    return `@angular/cli@${angularVersion}`;
  }

  
}