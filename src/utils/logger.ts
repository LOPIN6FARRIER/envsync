import chalk from 'chalk';

let verboseMode = false;
let colorMode = true;

/**
 * Enable or disable verbose logging mode
 * @param enabled - Whether to enable verbose mode
 */
export function setVerbose(enabled: boolean) {
  verboseMode = enabled;
}

/**
 * Enable or disable colored output
 * @param enabled - Whether to enable colored output
 */
export function setColorMode(enabled: boolean) {
  colorMode = enabled;
  if (!enabled) {
    chalk.level = 0;
  }
}

/**
 * Check if verbose mode is enabled
 * @returns true if verbose mode is enabled, false otherwise
 */
export function isVerbose(): boolean {
  return verboseMode;
}

/**
 * Log a verbose message (only shown when verbose mode is enabled)
 * @param message - The message to log
 * @param args - Additional arguments to log
 */
export function verbose(message: string, ...args: any[]) {
  if (verboseMode) {
    console.log(chalk.gray('[verbose]'), message, ...args);
  }
}

/**
 * Log a debug message (only shown when verbose mode is enabled)
 * @param message - The message to log
 * @param args - Additional arguments to log
 */
export function debug(message: string, ...args: any[]) {
  if (verboseMode) {
    console.log(chalk.dim('[debug]'), message, ...args);
  }
}

/**
 * Log an info message with a blue info icon
 * @param message - The message to log
 */
export function info(message: string) {
  console.log(chalk.blue('ℹ'), message);
}

/**
 * Log a success message with a green checkmark
 * @param message - The message to log
 */
export function success(message: string) {
  console.log(chalk.green('✓'), message);
}

/**
 * Log a warning message with a yellow warning icon
 * @param message - The message to log
 */
export function warning(message: string) {
  console.log(chalk.yellow('⚠'), message);
}

/**
 * Log an error message with a red error icon
 * @param message - The message to log
 */
export function error(message: string) {
  console.error(chalk.red('✗'), message);
}

/**
 * Log a plain message without icons
 * @param message - The message to log
 * @param args - Additional arguments to log
 */
export function log(message: string, ...args: any[]) {
  console.log(message, ...args);
}

/**
 * Log a gray colored message
 * @param message - The message to log
 * @param args - Additional arguments to log
 */
export function gray(message: string, ...args: any[]) {
  console.log(chalk.gray(message), ...args);
}

/**
 * Log a blue colored message
 * @param message - The message to log
 * @param args - Additional arguments to log
 */
export function blue(message: string, ...args: any[]) {
  console.log(chalk.blue(message), ...args);
}

/**
 * Log a yellow colored message
 * @param message - The message to log
 * @param args - Additional arguments to log
 */
export function yellow(message: string, ...args: any[]) {
  console.log(chalk.yellow(message), ...args);
}

/**
 * Log a green colored message
 * @param message - The message to log
 * @param args - Additional arguments to log
 */
export function green(message: string, ...args: any[]) {
  console.log(chalk.green(message), ...args);
}

/**
 * Log a red colored message
 * @param message - The message to log
 * @param args - Additional arguments to log
 */
export function red(message: string, ...args: any[]) {
  console.log(chalk.red(message), ...args);
}
