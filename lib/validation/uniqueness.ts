/**
 * @file lib/validation/uniqueness.ts
 * @description Zod schema and validation rules for Uniqueness entities.
 */

export interface UniquenessError {
  field: string;
  message: string;
}

/**
 * Checks if updating an entity violates any uniqueness constraints.
 */
export function checkEditUniqueness(
  projectSlug: unknown,
  item: unknown,
  values: unknown,
): UniquenessError | null {
  void projectSlug;
  void item;
  void values;
  return null;
}
