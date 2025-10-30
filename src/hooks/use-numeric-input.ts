import type { ChangeEvent, KeyboardEvent } from 'react';

/**
 * Hook for handling numeric input with decimal support
 *
 * Provides keyboard and change handlers for inputs that should only accept numeric values
 * with optional decimal places. Handles edge cases like multiple decimal points, keyboard
 * shortcuts (copy/paste), and navigation keys.
 *
 * @param maxDecimalPlaces - Maximum number of decimal places allowed (default: 2)
 * @returns Object with onKeyDown and onChange handlers
 *
 * @example
 * ```tsx
 * const numericHandlers = useNumericInput(2);
 *
 * <Input
 *   inputMode="decimal"
 *   placeholder="8.0"
 *   {...field}
 *   {...numericHandlers}
 * />
 * ```
 */
export function useNumericInput(maxDecimalPlaces: number = 2) {
  /**
   * Keyboard handler - restricts input to numbers, decimal point, and navigation/edit keys
   */
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, decimal point
    if (
      [46, 8, 9, 27, 13, 110, 190].indexOf(e.keyCode) !== -1 ||
      // Allow: Ctrl/Cmd+A, Ctrl/Cmd+C, Ctrl/Cmd+V, Ctrl/Cmd+X
      (e.keyCode === 65 && (e.ctrlKey === true || e.metaKey === true)) ||
      (e.keyCode === 67 && (e.ctrlKey === true || e.metaKey === true)) ||
      (e.keyCode === 86 && (e.ctrlKey === true || e.metaKey === true)) ||
      (e.keyCode === 88 && (e.ctrlKey === true || e.metaKey === true)) ||
      // Allow: home, end, left, right
      (e.keyCode >= 35 && e.keyCode <= 39)
    ) {
      return;
    }
    // Ensure that it's a number and stop the keypress if not
    if (
      (e.shiftKey || e.keyCode < 48 || e.keyCode > 57) &&
      (e.keyCode < 96 || e.keyCode > 105)
    ) {
      e.preventDefault();
    }
  };

  /**
   * Change handler - sanitizes input value to ensure valid numeric format
   * - Removes non-numeric characters (except decimal point)
   * - Ensures only one decimal point
   * - Limits decimal places to maxDecimalPlaces
   */
  const onChange = (e: ChangeEvent<HTMLInputElement>, fieldOnChange: (value: string) => void) => {
    const value = e.target.value;

    // Allow empty string
    if (value === '') {
      fieldOnChange(value);
      return;
    }

    // Remove any non-numeric characters except decimal point
    const sanitized = value.replace(/[^\d.]/g, '');

    // Ensure only one decimal point
    const parts = sanitized.split('.');
    const cleaned = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : sanitized;

    // Limit to maxDecimalPlaces
    const limited =
      parts.length === 2 && parts[1].length > maxDecimalPlaces
        ? parts[0] + '.' + parts[1].slice(0, maxDecimalPlaces)
        : cleaned;

    fieldOnChange(limited);
  };

  return {
    onKeyDown,
    onChange,
  };
}
