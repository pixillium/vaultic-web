import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { decryptData, encryptData } from "./crypto";

/** Schema Definitions */
export interface Authenticator {
  id: string;
  name: string;
  email?: string;
  secret: string;
  groupId?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface Group {
  id: string;
  name: string;
  color: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface Email {
  id: string;
  address: string;
  createdAt: number;
}

interface TwoFAManagerDB extends DBSchema {
  authenticators: {
    key: string;
    value: Authenticator;
    indexes: {
      "by-group": string;
      "by-order": number;
    };
  };
  groups: {
    key: string;
    value: Group;
    indexes: {
      "by-order": number;
    };
  };
  emails: {
    key: string;
    value: Email;
  };
  masterKey: {
    key: string;
    value: {
      id: string;
      salt: ArrayBuffer;
      hash: ArrayBuffer;
      initialized: boolean;
    };
  };
}

/** Constants */
const DB_NAME = "vaultic-db";
const DB_VERSION = 1;

/** Utilities */
let dbPromise: Promise<IDBPDatabase<TwoFAManagerDB>> | null = null;

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function encodeEncryptedString(
  data: string,
  password: string
): Promise<string> {
  const encrypted = await encryptData(data, password);
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

async function decodeEncryptedString(
  encoded: string,
  password: string
): Promise<string> {
  const binary = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)).buffer;
  return decryptData(binary, password);
}

/** DB Accessor */
export function getDB(): Promise<IDBPDatabase<TwoFAManagerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<TwoFAManagerDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const authStore = db.createObjectStore("authenticators", {
            keyPath: "id",
          });
          authStore.createIndex("by-group", "groupId");
          authStore.createIndex("by-order", "order");

          const groupStore = db.createObjectStore("groups", { keyPath: "id" });
          groupStore.createIndex("by-order", "order");

          db.createObjectStore("emails", { keyPath: "id" });
        }
        if (oldVersion < 2) {
          db.createObjectStore("masterKey", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

/** Authenticator CRUD */
export async function getAllAuthenticators(): Promise<Authenticator[]> {
  const db = await getDB();
  return db.getAllFromIndex("authenticators", "by-order");
}

export async function getAuthenticator(
  id: string
): Promise<Authenticator | undefined> {
  const db = await getDB();
  return db.get("authenticators", id);
}

export async function getAuthenticatorsByGroup(
  groupId: string | null
): Promise<Authenticator[]> {
  const db = await getDB();
  if (groupId === null) {
    const all = await db.getAll("authenticators");
    return all.filter((auth) => !auth.groupId);
  }
  return db.getAllFromIndex("authenticators", "by-group", groupId);
}

export async function addAuthenticator(
  authenticator: Omit<Authenticator, "id" | "createdAt" | "updatedAt" | "order">
): Promise<string> {
  const db = await getDB();
  const count = await db.count("authenticators");

  const newAuthenticator: Authenticator = {
    ...authenticator,
    id: crypto.randomUUID(),
    order: count,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await db.add("authenticators", newAuthenticator);
  return newAuthenticator.id;
}

export async function updateAuthenticator(
  id: string,
  updates: Partial<Omit<Authenticator, "id" | "createdAt">>
): Promise<void> {
  const db = await getDB();
  const existing = await db.get("authenticators", id);
  if (!existing) throw new Error(`Authenticator with id ${id} not found`);

  const updated: Authenticator = {
    ...existing,
    ...updates,
    updatedAt: Date.now(),
  };
  await db.put("authenticators", updated);
}

export async function deleteAuthenticator(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("authenticators", id);
}

export async function reorderAuthenticators(
  orderedIds: string[]
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("authenticators", "readwrite");
  for (let i = 0; i < orderedIds.length; i++) {
    const auth = await tx.store.get(orderedIds[i]);
    if (auth) {
      auth.order = i;
      await tx.store.put(auth);
    }
  }
  await tx.done;
}

/** Group CRUD */
export async function getAllGroups(): Promise<Group[]> {
  const db = await getDB();
  return db.getAllFromIndex("groups", "by-order");
}

export async function getGroup(id: string): Promise<Group | undefined> {
  const db = await getDB();
  return db.get("groups", id);
}

export async function addGroup(
  group: Omit<Group, "id" | "createdAt" | "updatedAt" | "order">
): Promise<string> {
  const db = await getDB();
  const count = await db.count("groups");

  const newGroup: Group = {
    ...group,
    id: crypto.randomUUID(),
    order: count,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await db.add("groups", newGroup);
  return newGroup.id;
}

export async function updateGroup(
  id: string,
  updates: Partial<Omit<Group, "id" | "createdAt">>
): Promise<void> {
  const db = await getDB();
  const existing = await db.get("groups", id);
  if (!existing) throw new Error(`Group with id ${id} not found`);

  const updated: Group = { ...existing, ...updates, updatedAt: Date.now() };
  await db.put("groups", updated);
}

export async function deleteGroup(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["authenticators", "groups"], "readwrite");

  const auths = await tx
    .objectStore("authenticators")
    .index("by-group")
    .getAll(id);
  for (const auth of auths) {
    auth.groupId = undefined;
    await tx.objectStore("authenticators").put(auth);
  }

  await tx.objectStore("groups").delete(id);
  await tx.done;
}

export async function reorderGroups(orderedIds: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("groups", "readwrite");

  for (let i = 0; i < orderedIds.length; i++) {
    const group = await tx.store.get(orderedIds[i]);
    if (group) {
      group.order = i;
      await tx.store.put(group);
    }
  }
  await tx.done;
}

/** Email CRUD */
export async function getAllEmails(): Promise<Email[]> {
  const db = await getDB();
  return db.getAll("emails");
}

export async function addEmail(
  address: string,
  password: string
): Promise<string> {
  const db = await getDB();
  const encryptedAddress = await encodeEncryptedString(address, password);

  const newEmail: Email = {
    id: crypto.randomUUID(),
    address: encryptedAddress,
    createdAt: Date.now(),
  };

  await db.add("emails", newEmail);
  return newEmail.id;
}

export async function deleteEmail(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("emails", id);
}

/** Export / Import */
export async function exportData(password: string): Promise<string> {
  const [authenticators, groups, emails] = await Promise.all([
    getAllAuthenticators(),
    getAllGroups(),
    getAllEmails(),
  ]);

  const decryptedAuthenticators = await Promise.all(
    authenticators.map(async (auth) => ({
      ...auth,
      secret: await decodeEncryptedString(auth.secret, password),
      email: auth.email
        ? await decodeEncryptedString(auth.email, password)
        : undefined,
    }))
  );

  return JSON.stringify({
    authenticators: decryptedAuthenticators,
    groups,
    emails,
    exportDate: Date.now(),
  });
}

export async function mergeImportedData(
  password: string,
  importedData: {
    authenticators: Authenticator[];
    groups: Group[];
    emails: Email[];
  }
): Promise<void> {
  const db = await getDB();

  const authTx = db.transaction("authenticators", "readwrite");
  const groupTx = db.transaction("groups", "readwrite");
  const emailTx = db.transaction("emails", "readwrite");

  const [existingAuthIds, existingGroupIds, existingEmailIds] =
    await Promise.all([
      new Set(await authTx.store.getAllKeys()),
      new Set(await groupTx.store.getAllKeys()),
      new Set(await emailTx.store.getAllKeys()),
    ]);

  for (const auth of importedData.authenticators) {
    if (!existingAuthIds.has(auth.id)) {
      await authTx.store.add({
        ...auth,
        secret: await encodeEncryptedString(auth.secret, password),
        email: auth.email
          ? await encodeEncryptedString(auth.email, password)
          : undefined,
      });
    }
  }

  for (const group of importedData.groups) {
    if (!existingGroupIds.has(group.id)) {
      await groupTx.store.add(group);
    }
  }

  for (const email of importedData.emails) {
    if (!existingEmailIds.has(email.id)) {
      await emailTx.store.add({
        ...email,
        address: await encodeEncryptedString(email.address, password),
      });
    }
  }

  await Promise.all([authTx.done, groupTx.done, emailTx.done]);
}

/** Master Key Management */
export async function isMasterKeySet(): Promise<boolean> {
  const db = await getDB();
  const master = await db.get("masterKey", "master");
  return !!master?.initialized;
}

export async function setMasterKey(password: string): Promise<void> {
  const db = await getDB();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);

  const key = await crypto.subtle.importKey(
    "raw",
    passwordData,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    key,
    256
  );

  passwordData.fill(0); // Zero sensitive buffer

  await db.put("masterKey", {
    id: "master",
    salt: salt.buffer,
    hash,
    initialized: true,
  });
}

export async function verifyMasterKey(password: string): Promise<boolean> {
  const db = await getDB();
  const master = await db.get("masterKey", "master");
  if (!master) return false;

  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);

  const key = await crypto.subtle.importKey(
    "raw",
    passwordData,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derivedHash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: master.salt, iterations: 100000, hash: "SHA-256" },
    key,
    256
  );

  passwordData.fill(0); // Zero sensitive buffer

  return constantTimeEqual(
    new Uint8Array(master.hash),
    new Uint8Array(derivedHash)
  );
}

export async function changeMasterKey(
  oldPassword: string,
  newPassword: string
): Promise<void> {
  // Verify old password first
  const isValid = await verifyMasterKey(oldPassword);
  if (!isValid) {
    throw new Error("Current password is incorrect");
  }

  // Get all data that needs to be re-encrypted
  const [authenticators, emails] = await Promise.all([
    getAllAuthenticators(),
    getAllEmails(),
  ]);

  // Decrypt all data with old password and re-encrypt with new password
  const reencryptedAuths = await Promise.all(
    authenticators.map(async (auth) => {
      const secretBuffer = base64ToArrayBuffer(auth.secret);
      const decryptedSecret = await decryptData(secretBuffer, oldPassword);
      const newEncryptedSecret = await encryptData(
        decryptedSecret,
        newPassword
      );
      const newSecret = btoa(
        String.fromCharCode(...new Uint8Array(newEncryptedSecret))
      );

      let newEmail = auth.email;
      if (auth.email) {
        const emailBuffer = base64ToArrayBuffer(auth.email);
        const decryptedEmail = await decryptData(emailBuffer, oldPassword);
        const newEncryptedEmail = await encryptData(
          decryptedEmail,
          newPassword
        );
        newEmail = btoa(
          String.fromCharCode(...new Uint8Array(newEncryptedEmail))
        );
      }

      return {
        ...auth,
        secret: newSecret,
        email: newEmail,
      };
    })
  );

  const reencryptedEmails = await Promise.all(
    emails.map(async (email) => {
      const buffer = base64ToArrayBuffer(email.address);
      const decryptedAddress = await decryptData(buffer, oldPassword);
      const newEncryptedAddress = await encryptData(
        decryptedAddress,
        newPassword
      );
      return {
        ...email,
        address: btoa(
          String.fromCharCode(...new Uint8Array(newEncryptedAddress))
        ),
      };
    })
  );

  // Start transaction to update everything
  const db = await getDB();
  const tx = db.transaction(
    ["authenticators", "emails", "masterKey"],
    "readwrite"
  );

  // Update all authenticators
  for (const auth of reencryptedAuths) {
    await tx.objectStore("authenticators").put(auth);
  }

  // Update all emails
  for (const email of reencryptedEmails) {
    await tx.objectStore("emails").put(email);
  }

  // Set new master key
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(newPassword);

  const key = await crypto.subtle.importKey(
    "raw",
    passwordData,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    key,
    256
  );

  passwordData.fill(0); // Zero sensitive buffer

  await tx.objectStore("masterKey").put({
    id: "master",
    salt: salt.buffer,
    hash,
    initialized: true,
  });

  // Commit transaction
  await tx.done;
}

/** Reset Database */
export async function resetDatabase(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ["authenticators", "groups", "emails", "masterKey"],
    "readwrite"
  );

  await Promise.all([
    tx.objectStore("authenticators").clear(),
    tx.objectStore("groups").clear(),
    tx.objectStore("emails").clear(),
    tx.objectStore("masterKey").clear(),
  ]);

  await tx.done;
}
