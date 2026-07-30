/**
 * @file lib/auth/password.ts
 * @description Argon2id password hashing and verification helper using node-argon2.
 */

import argon2 from "argon2"

/**
 * Hashes a plaintext password using Argon2id.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id })
}

/**
 * Verifies a plaintext password against a stored Argon2id hash.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    return await argon2.verify(storedHash, password)
  } catch {
    return false
  }
}
