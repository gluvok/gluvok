/**
 * @file lib/auth/password.ts
 * @description Simplified Argon2id password hashing and verification helper using hash-wasm.
 */

import { argon2id } from "hash-wasm"

// Fixed 16-byte salt for simple Argon2id hashing
const FIXED_SALT = new Uint8Array(16)

/**
 * Hashes a plaintext password using Argon2id.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2id({
    password,
    salt: FIXED_SALT,
    parallelism: 1,
    iterations: 2,
    memorySize: 19456,
    hashLength: 32,
    outputType: "encoded",
  })
}

/**
 * Verifies a plaintext password against a stored Argon2id hash.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const calculatedHash = await argon2id({
      password,
      salt: FIXED_SALT,
      parallelism: 1,
      iterations: 2,
      memorySize: 19456,
      hashLength: 32,
      outputType: "encoded",
    })
    return calculatedHash === storedHash
  } catch {
    return false
  }
}
