/**
 * Utility functions for error handling and message sanitization
 */

/**
 * Strip HTML tags from a string and decode HTML entities
 * Used to sanitize error messages from Harvest API
 *
 * @example
 * stripHtml('You cannot track time to <strong>Project Name</strong>')
 * // Returns: 'You cannot track time to Project Name'
 */
export function stripHtml(html: string): string {
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, '');

  // Decode common HTML entities
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
  };

  text = text.replace(/&[a-z0-9]+;/gi, match => entities[match] || match);

  return text.trim();
}

/**
 * Extract and format locked period error message from Harvest API
 * Converts verbose HTML error to clean user-friendly message
 *
 * @example
 * formatLockedPeriodError('You cannot track time to <strong>[PRJ-01] PMO Hive</strong>, because hours have been <strong>approved</strong>')
 * // Returns: 'Cannot log time to [PRJ-01] PMO Hive - week is locked (approved)'
 */
export function formatLockedPeriodError(errorMessage: string): string {
  // Strip HTML first
  const cleanMessage = stripHtml(errorMessage);

  // Check if it's a locked/approved period error
  const isLockedError = /cannot track (time|expenses?)/i.test(cleanMessage);
  const isApprovedError = /approved|locked/i.test(cleanMessage);

  if (isLockedError && isApprovedError) {
    // Extract project name (text between quotes or after "to")
    const projectMatch = cleanMessage.match(/to\s+(.+?),?\s+because/i);
    const projectName = projectMatch?.[1] || 'this project';

    // Determine if it's time or expense
    const isExpense = /expenses?/i.test(cleanMessage);
    const action = isExpense ? 'submit expense' : 'log time';

    // Determine lock reason
    const isApproved = /approved/i.test(cleanMessage);
    const reason = isApproved ? 'approved' : 'locked';

    return `Cannot ${action} to ${projectName} - week is ${reason}`;
  }

  // Return cleaned message if not a locked period error
  return cleanMessage;
}
