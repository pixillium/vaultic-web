import { openDB, type DBSchema, type IDBPDatabase } from "idb";

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

const DB_NAME = "2fa-manager-db";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<TwoFAManagerDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<TwoFAManagerDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          // Create authenticators store
          const authenticatorsStore = db.createObjectStore("authenticators", {
            keyPath: "id",
          });
          authenticatorsStore.createIndex("by-group", "groupId");
          authenticatorsStore.createIndex("by-order", "order");

          // Create groups store
          const groupsStore = db.createObjectStore("groups", { keyPath: "id" });
          groupsStore.createIndex("by-order", "order");

          // Create emails store
          db.createObjectStore("emails", { keyPath: "id" });
        }

        if (oldVersion < 2) {
          // Add master key store in version 2
          db.createObjectStore("masterKey", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

// Authenticator CRUD operations
export async function getAllAuthenticators(): Promise<Authenticator[]> {
  const db = await getDB();
  return db.getAllFromIndex("authenticators", "by-order");
}

export async function getAuthenticatorsByGroup(
  groupId: string | null
): Promise<Authenticator[]> {
  const db = await getDB();
  if (groupId === null) {
    // Get authenticators with no group
    const all = await db.getAll("authenticators");
    return all.filter((auth) => !auth.groupId);
  }
  return db.getAllFromIndex("authenticators", "by-group", groupId);
}

export async function getAuthenticator(
  id: string
): Promise<Authenticator | undefined> {
  const db = await getDB();
  return db.get("authenticators", id);
}

export async function addAuthenticator(
  authenticator: Omit<Authenticator, "id" | "createdAt" | "updatedAt" | "order">
): Promise<string> {
  const db = await getDB();
  const allAuthenticators = await getAllAuthenticators();

  const newAuthenticator: Authenticator = {
    ...authenticator,
    id: crypto.randomUUID(),
    order: allAuthenticators.length,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await db.add("authenticators", newAuthenticator);
  return newAuthenticator.id;
}

export async function updateAuthenticator(
  id: string,
  authenticator: Partial<Omit<Authenticator, "id" | "createdAt">>
): Promise<void> {
  const db = await getDB();
  const existingAuthenticator = await db.get("authenticators", id);

  if (!existingAuthenticator) {
    throw new Error(`Authenticator with id ${id} not found`);
  }

  const updatedAuthenticator: Authenticator = {
    ...existingAuthenticator,
    ...authenticator,
    updatedAt: Date.now(),
  };

  await db.put("authenticators", updatedAuthenticator);
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

// Group CRUD operations
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
  const allGroups = await getAllGroups();

  const newGroup: Group = {
    ...group,
    id: crypto.randomUUID(),
    order: allGroups.length,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await db.add("groups", newGroup);
  return newGroup.id;
}

export async function updateGroup(
  id: string,
  group: Partial<Omit<Group, "id" | "createdAt">>
): Promise<void> {
  const db = await getDB();
  const existingGroup = await db.get("groups", id);

  if (!existingGroup) {
    throw new Error(`Group with id ${id} not found`);
  }

  const updatedGroup: Group = {
    ...existingGroup,
    ...group,
    updatedAt: Date.now(),
  };

  await db.put("groups", updatedGroup);
}

export async function deleteGroup(id: string): Promise<void> {
  const db = await getDB();

  // First, update all authenticators in this group to have no group
  const authenticatorsInGroup = await getAuthenticatorsByGroup(id);
  const tx = db.transaction("authenticators", "readwrite");

  for (const auth of authenticatorsInGroup) {
    auth.groupId = undefined;
    await tx.store.put(auth);
  }

  await tx.done;

  // Then delete the group
  await db.delete("groups", id);
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

// Email CRUD operations
export async function getAllEmails(): Promise<Email[]> {
  const db = await getDB();
  return db.getAll("emails");
}

export async function addEmail(address: string): Promise<string> {
  const db = await getDB();

  const newEmail: Email = {
    id: crypto.randomUUID(),
    address,
    createdAt: Date.now(),
  };

  await db.add("emails", newEmail);
  return newEmail.id;
}

export async function deleteEmail(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("emails", id);
}

// Import/Export functions
export async function exportData(): Promise<string> {
  const authenticators = await getAllAuthenticators();
  const groups = await getAllGroups();
  const emails = await getAllEmails();

  const exportData = {
    authenticators,
    groups,
    emails,
    exportDate: Date.now(),
  };

  return JSON.stringify(exportData);
}

export async function importData(jsonData: string): Promise<void> {
  try {
    const data = JSON.parse(jsonData);
    const db = await getDB();

    // Clear existing data
    const tx = db.transaction(
      ["authenticators", "groups", "emails"],
      "readwrite"
    );
    await tx.objectStore("authenticators").clear();
    await tx.objectStore("groups").clear();
    await tx.objectStore("emails").clear();
    await tx.done;

    // Import new data
    const authTx = db.transaction("authenticators", "readwrite");
    for (const auth of data.authenticators) {
      await authTx.store.add(auth);
    }
    await authTx.done;

    const groupTx = db.transaction("groups", "readwrite");
    for (const group of data.groups) {
      await groupTx.store.add(group);
    }
    await groupTx.done;

    const emailTx = db.transaction("emails", "readwrite");
    for (const email of data.emails) {
      await emailTx.store.add(email);
    }
    await emailTx.done;
  } catch (error) {
    console.error("Error importing data:", error);
    throw new Error("Invalid import data format");
  }
}

/**
 * Merges imported data with existing data
 */
export async function mergeImportedData(importedData: {
  authenticators: Authenticator[];
  groups: Group[];
  emails: Email[];
}): Promise<void> {
  const db = await getDB();

  // Process authenticators
  const authTx = db.transaction("authenticators", "readwrite");
  try {
    const existingAuthIds = new Set(
      (await authTx.store.getAll()).map((a) => a.id)
    );

    for (const auth of importedData.authenticators) {
      if (!existingAuthIds.has(auth.id)) {
        await authTx.store.add(auth);
      }
    }
    await authTx.done;
  } catch (error) {
    console.error("Error processing authenticators:", error);
    throw error;
  }

  // Process groups
  const groupTx = db.transaction("groups", "readwrite");
  try {
    const existingGroupIds = new Set(
      (await groupTx.store.getAll()).map((g) => g.id)
    );

    for (const group of importedData.groups) {
      if (!existingGroupIds.has(group.id)) {
        await groupTx.store.add(group);
      }
    }
    await groupTx.done;
  } catch (error) {
    console.error("Error processing groups:", error);
    throw error;
  }

  // Process emails
  const emailTx = db.transaction("emails", "readwrite");
  try {
    const existingEmailIds = new Set(
      (await emailTx.store.getAll()).map((e) => e.id)
    );

    for (const email of importedData.emails) {
      if (!existingEmailIds.has(email.id)) {
        await emailTx.store.add(email);
      }
    }
    await emailTx.done;
  } catch (error) {
    console.error("Error processing emails:", error);
    throw error;
  }
}

// Add new functions for master key management
export async function isMasterKeySet(): Promise<boolean> {
  const db = await getDB();
  const masterKeyData = await db.get("masterKey", "master");
  return !!masterKeyData?.initialized;
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

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    key,
    256
  );

  await db.put("masterKey", {
    id: "master",
    salt: salt.buffer,
    hash: derivedBits,
    initialized: true,
  });
}

export async function verifyMasterKey(password: string): Promise<boolean> {
  const db = await getDB();
  const masterKeyData = await db.get("masterKey", "master");

  if (!masterKeyData) return false;

  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);

  const key = await crypto.subtle.importKey(
    "raw",
    passwordData,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: masterKeyData.salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    key,
    256
  );

  // Compare the hashes
  const newHash = new Uint8Array(derivedBits);
  const storedHash = new Uint8Array(masterKeyData.hash);

  if (newHash.length !== storedHash.length) return false;

  return newHash.every((value, index) => value === storedHash[index]);
}
