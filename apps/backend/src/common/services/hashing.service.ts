import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/**
 * HashingService — wraps Argon2 for password and token hashing.
 *
 * Use `hash` before persisting any secret value (password, refresh token nonce).
 * Use `compare` to verify a plaintext value against a stored hash.
 *
 * Never log plaintext values or hashes.
 */
@Injectable()
export class HashingService {
  /**
   * Hash a plaintext string using Argon2id.
   * Safe for passwords AND short tokens (e.g. refresh token nonces).
   */
  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  /**
   * Compare a plaintext string against an Argon2 hash.
   * Returns true if they match, false otherwise.
   * Never throws — catches internal errors and returns false.
   */
  async compare(plain: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}
