/**
 * Utility functions for encrypting and decrypting data using PBKDF2 and AES-GCM
 */

import { Authenticator, Group, Email } from "@/lib/db";

// Constants for encryption
const SALT_LENGTH = 16; // 128 bits
const IV_LENGTH = 12; // 96 bits
const KEY_LENGTH = 32; // 256 bits
const ITERATIONS = 100000;

/**
 * Derives a key from a password using PBKDF2
 */
async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  // Convert password to a key
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  // Derive a key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: KEY_LENGTH * 8 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts data using AES-GCM with a password
 */
export async function encryptData(
  data: string,
  password: string
): Promise<ArrayBuffer> {
  // Generate a random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Derive a key from the password
  const key = await deriveKey(password, salt);

  // Encrypt the data
  const encryptedContent = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    new TextEncoder().encode(data)
  );

  // Combine salt, IV, and encrypted content into a single buffer
  const result = new Uint8Array(
    SALT_LENGTH + IV_LENGTH + encryptedContent.byteLength
  );
  result.set(salt, 0);
  result.set(iv, SALT_LENGTH);
  result.set(new Uint8Array(encryptedContent), SALT_LENGTH + IV_LENGTH);

  return result.buffer;
}

/**
 * Decrypts data using AES-GCM with a password
 */
export async function decryptData(
  encryptedData: ArrayBuffer,
  password: string
): Promise<string> {
  // Extract salt, IV, and encrypted content
  const encryptedArray = new Uint8Array(encryptedData);
  const salt = encryptedArray.slice(0, SALT_LENGTH);
  const iv = encryptedArray.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const content = encryptedArray.slice(SALT_LENGTH + IV_LENGTH);

  // Derive a key from the password
  const key = await deriveKey(password, salt);

  try {
    // Decrypt the data
    const decryptedContent = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      content
    );

    // Convert the decrypted content to a string
    return new TextDecoder().decode(decryptedContent);
  } catch {
    throw new Error("Decryption failed. Incorrect password or corrupted data.");
  }
}

/**
 * Validates the structure of decrypted data
 */
export function validateDecryptedData(data: {
  authenticators: Authenticator[];
  groups: Group[];
  emails: Email[];
}): boolean {
  try {
    // Check if data is an object with the expected properties
    if (!data || typeof data !== "object") return false;

    // Check for required properties
    if (!Array.isArray(data.authenticators)) return false;
    if (!Array.isArray(data.groups)) return false;
    if (!Array.isArray(data.emails)) return false;

    // Check if authenticators have required fields
    for (const auth of data.authenticators) {
      if (!auth.id || !auth.name || !auth.secret) return false;
    }

    return true;
  } catch {
    return false;
  }
}
