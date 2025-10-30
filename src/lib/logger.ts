/**
 * Sanitized Logging Utility
 *
 * Provides secure logging that prevents sensitive data exposure in server logs.
 * Filters out tokens, passwords, and other sensitive information from error objects.
 */

import { getErrorMessage } from './api-utils';
import { HarvestAPIError } from './harvest/client';

interface LogContext {
  [key: string]: unknown;
}

/**
 * Safely log errors without exposing sensitive data
 *
 * @param message - Human-readable error message
 * @param error - Error object (will be sanitized)
 * @param context - Optional context data (ensure it doesn't contain sensitive info)
 */
export function logError(
  message: string,
  error: unknown,
  context?: LogContext
): void {
  const sanitized = {
    message: getErrorMessage(error, message),
    statusCode: error instanceof HarvestAPIError ? error.statusCode : undefined,
    context: context,
    timestamp: new Date().toISOString(),
    // Don't log stack traces in production for security
    ...(process.env.NODE_ENV === 'development' && error instanceof Error
      ? { stack: error.stack }
      : {}),
  };

  console.error(JSON.stringify(sanitized, null, 2));
}

/**
 * Log informational messages
 */
export function logInfo(message: string, data?: LogContext): void {
  console.log(
    JSON.stringify({
      level: 'info',
      message,
      data,
      timestamp: new Date().toISOString(),
    }, null, 2)
  );
}

/**
 * Log warning messages
 */
export function logWarning(message: string, data?: LogContext): void {
  console.warn(
    JSON.stringify({
      level: 'warning',
      message,
      data,
      timestamp: new Date().toISOString(),
    }, null, 2)
  );
}
