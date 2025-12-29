/**
 * Custom Logger for Medium MCP Server
 *
 * Provides semantic log levels while routing all output to stderr to maintain
 * MCP protocol integrity (stdout is reserved for JSON messages).
 *
 * Log Levels:
 * - TRACE: Extremely detailed diagnostic information (e.g., DOM selectors, navigation steps)
 * - DEBUG: Detailed debugging information (e.g., operation progress, intermediate values)
 * - INFO: Normal operational messages (e.g., "Fetching articles...", "Session loaded")
 * - WARN: Warning conditions (e.g., "Session expired", "Timeout with fallback")
 * - ERROR: Error conditions (e.g., "Failed to save session", exceptions in catch blocks)
 *
 * Test Mode Behavior:
 * - TRACE, DEBUG, INFO: Suppressed during tests (clean output)
 * - WARN, ERROR: Shown during tests (important for debugging failures)
 */

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4
}

/**
 * Logger class that routes all output to stderr with semantic log levels
 */
export class Logger {
  private currentLevel: LogLevel = LogLevel.TRACE;

  /**
   * Check if running in test environment to suppress noisy logs
   */
  private isTestEnvironment(): boolean {
    return (
      process.env.NODE_ENV === 'test' ||
      process.env.JEST_WORKER_ID !== undefined ||
      process.env.PLAYWRIGHT_TEST !== undefined
    );
  }

  /**
   * Get minimum log level for test environment
   * In tests: only show WARN and ERROR
   */
  private getEffectiveLevel(): LogLevel {
    if (this.isTestEnvironment()) {
      return LogLevel.WARN; // Suppress TRACE, DEBUG, INFO in tests
    }
    return this.currentLevel;
  }

  /**
   * Write formatted log message to stderr
   */
  private write(level: LogLevel, prefix: string, message: string, ...args: any[]): void {
    const effectiveLevel = this.getEffectiveLevel();

    // Suppress if below effective level
    if (level < effectiveLevel) {
      return;
    }

    // Format message with arguments
    let formattedMessage = message;
    if (args.length > 0) {
      // Simple string interpolation for additional arguments
      formattedMessage += ' ' + args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
    }

    // Write to stderr (MCP-safe: stdout reserved for JSON protocol)
    process.stderr.write(`${prefix} ${formattedMessage}\n`);
  }

  /**
   * TRACE: Extremely detailed diagnostic information
   * Examples: DOM element selection, cookie details, navigation steps
   * Suppressed in test mode
   */
  trace(message: string, ...args: any[]): void {
    this.write(LogLevel.TRACE, '🔍', message, ...args);
  }

  /**
   * DEBUG: Detailed debugging information
   * Examples: Operation progress, intermediate state, diagnostic blocks
   * Suppressed in test mode
   */
  debug(message: string, ...args: any[]): void {
    this.write(LogLevel.DEBUG, '🐛', message, ...args);
  }

  /**
   * INFO: Normal operational messages
   * Examples: "Fetching articles...", "Session loaded", user guidance
   * Suppressed in test mode
   */
  info(message: string, ...args: any[]): void {
    this.write(LogLevel.INFO, 'ℹ️ ', message, ...args);
  }

  /**
   * WARN: Warning conditions (potential issues, degraded functionality)
   * Examples: "Session expired", "Timeout with fallback", missing optional data
   * Shown in test mode
   */
  warn(message: string, ...args: any[]): void {
    this.write(LogLevel.WARN, '⚠️ ', message, ...args);
  }

  /**
   * ERROR: Error conditions (failures, exceptions)
   * Examples: "Failed to save session", "Browser not initialized", catch blocks
   * Shown in test mode
   */
  error(message: string, ...args: any[]): void {
    this.write(LogLevel.ERROR, '❌', message, ...args);
  }

  /**
   * Set minimum log level (useful for debugging)
   * @param level Minimum log level to display
   */
  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.currentLevel;
  }
}

/**
 * Singleton logger instance
 * Import this in all files that need logging
 */
export const logger = new Logger();
