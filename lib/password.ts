import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { promisify } from "node:util";

// promisify(scrypt) resolves to the 3-argument overload; the options form needs
// the cast Node documents for it.
const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

// 16 MiB transient cost per hash — safe under shared-hosting LVE memory caps,
// and high enough to make offline brute force unpleasant.
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };
const KEYLEN = 64;

/**
 * Kept free of any Next.js import so scripts/seed.ts can hash the first admin
 * password under plain Node, using exactly the same implementation the running
 * app verifies against.
 */

/** `scrypt:<saltHex>:<hashHex>` — salt travels with the hash, so no separate column. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(password, salt, KEYLEN, SCRYPT_PARAMS)) as Buffer;
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  if (expected.length !== KEYLEN) return false;

  const actual = (await scryptAsync(password, Buffer.from(saltHex, "hex"), KEYLEN, SCRYPT_PARAMS)) as Buffer;
  // Constant time: never compare password hashes with `===`.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
