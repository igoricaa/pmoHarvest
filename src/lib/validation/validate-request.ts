import type { ZodSchema, ZodError } from 'zod';

/**
 * Result type for successful validation
 */
interface ValidationSuccess<T> {
  success: true;
  data: T;
}

/**
 * Result type for failed validation
 */
interface ValidationFailure {
  success: false;
  errors: Record<string, string[]>;
  message: string;
}

/**
 * Union type for validation results
 */
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Validates request data against a Zod schema
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validation result with typed data or errors
 *
 * @example
 * ```typescript
 * const validation = validateRequest(timeEntryCreateSchema, body);
 * if (!validation.success) {
 *   return NextResponse.json(
 *     { error: validation.message, errors: validation.errors },
 *     { status: 400 }
 *   );
 * }
 * // Use validation.data (type-safe!)
 * const timeEntry = await harvestClient.createTimeEntry(validation.data);
 * ```
 */
export function validateRequest<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
  try {
    const validatedData = schema.parse(data);
    return {
      success: true,
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const zodError = error as ZodError;

      // Transform Zod errors into user-friendly format
      const errors: Record<string, string[]> = {};
      for (const issue of zodError.issues) {
        const path = issue.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(issue.message);
      }

      // Create summary message
      const fieldCount = Object.keys(errors).length;
      const message =
        fieldCount === 1
          ? 'Validation failed for 1 field'
          : `Validation failed for ${fieldCount} fields`;

      return {
        success: false,
        errors,
        message,
      };
    }

    // Unexpected error
    return {
      success: false,
      errors: {},
      message: 'Validation failed',
    };
  }
}
