/**
 * Main configuration structure for EnvSync
 * Defines the development environment requirements for an Angular project
 */
export interface EnvSyncConfig {
  /**
   * Project information
   */
  project: {
    /** Project name */
    name: string;
    /** Project type (currently only 'angular' is supported) */
    type: 'angular';
    /** Angular version (e.g., "17.1.0") */
    angularVersion?: string;
  };
  /**
   * Runtime environment requirements
   */
  runtime: {
    /** Node.js version required (e.g., "20.11.1") */
    node: string;
    /** Package manager and version (e.g., "pnpm@latest", "npm") */
    packageManager: string;
  };
  /**
   * Dependencies configuration
   */
  dependencies: {
    /** Global packages that should be installed (e.g., "@angular/cli@17.1.0") */
    global: string[];
  };
  /**
   * Optional: IDE extensions configuration
   */
  extensions?: {
    /** VSCode extension IDs to install */
    vscode: string[];
  };
  /**
   * Optional: Lifecycle scripts
   */
  scripts?: {
    /** Scripts to run after sync completes */
    'post-sync': string[];
    /** Scripts to run before sync starts */
    'pre-sync': string[];
  };
}

/**
 * Represents an Angular project with its detected configuration
 */
export interface AngularProject {
  /** Detected Angular version */
  version: string;
  /** Whether Angular CLI is installed globally */
  hasCLI: boolean;
  /** Whether the project uses Nx */
  hasNx: boolean;
  /** Detected package manager */
  packageManager: 'npm' | 'pnpm' | 'yarn';
  /** Recommended Node.js version for this Angular version */
  nodeVersion: string;
}
