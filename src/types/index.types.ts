export interface EnvSyncConfig {
  project: {
    name: string;
    type: 'angular';
    angularVersion?: string;
  };
  runtime: {
    node: string;
    packageManager: string;
  };
  dependencies: {
    global: string[];
  };
  extensions?: {
    vscode: string[];
  };
  scripts?: {
    'post-sync': string[];
  };
}

export interface AngularProject {
  version: string;
  hasCLI: boolean;
  hasNx: boolean;
  packageManager: 'npm' | 'pnpm' | 'yarn';
  nodeVersion: string;
}