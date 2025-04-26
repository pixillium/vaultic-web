/**
 * High-Performance Utility for Secure Data Encryption/Decryption (PBKDF2 + AES-GCM)
 */

import { Authenticator, Group, Email } from "@/lib/db";

const SALT_LENGTH = 16; // 128-bit salt
const IV_LENGTH = 12; // 96-bit IV for AES-GCM
const KEY_LENGTH = 32; // 256-bit AES key
const ITERATIONS = 250_000; // Strengthened iteration count

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Derive a strong cryptographic key from a password using PBKDF2
 */
async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: "SHA-512", // Upgrade to SHA-512 for future resilience
    },
    baseKey,
    { name: "AES-GCM", length: KEY_LENGTH * 8 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt plaintext securely with AES-GCM
 */
export async function encryptData(
  plaintext: string,
  password: string
): Promise<ArrayBuffer> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(password, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );

  const result = new Uint8Array(
    SALT_LENGTH + IV_LENGTH + ciphertext.byteLength
  );
  result.set(salt, 0);
  result.set(iv, SALT_LENGTH);
  result.set(new Uint8Array(ciphertext), SALT_LENGTH + IV_LENGTH);

  return result.buffer;
}

/**
 * Decrypt ciphertext securely with AES-GCM
 */
export async function decryptData(
  encryptedBuffer: ArrayBuffer,
  password: string
): Promise<string> {
  const data = new Uint8Array(encryptedBuffer);
  const salt = data.slice(0, SALT_LENGTH);
  const iv = data.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = data.slice(SALT_LENGTH + IV_LENGTH);

  const key = await deriveKey(password, salt);

  try {
    const plaintextBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    return decoder.decode(plaintextBuffer);
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Decryption failed: invalid password or corrupted data.");
  }
}

/**
 * Validate decrypted structured data
 */
export function validateDecryptedData(payload: {
  authenticators: Authenticator[];
  groups: Group[];
  emails: Email[];
}): boolean {
  if (
    !payload ||
    typeof payload !== "object" ||
    !Array.isArray(payload.authenticators) ||
    !Array.isArray(payload.groups) ||
    !Array.isArray(payload.emails)
  ) {
    return false;
  }

  return payload.authenticators.every(
    (auth) =>
      typeof auth.id === "string" &&
      typeof auth.name === "string" &&
      typeof auth.secret === "string"
  );
}
