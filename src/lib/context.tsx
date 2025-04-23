"use client";

import type React from "react";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { Authenticator, Group, Email } from "@/lib/db";
import {
  getAllAuthenticators,
  getAllGroups,
  getAllEmails,
  addAuthenticator,
  updateAuthenticator,
  deleteAuthenticator,
  addGroup,
  updateGroup,
  deleteGroup,
  addEmail,
  deleteEmail,
  importData as importDbData,
  exportData as exportDbData,
} from "@/lib/db";
import { encryptData, decryptData } from "@/lib/crypto";

interface AppContextType {
  authenticators: Authenticator[];
  groups: Group[];
  emails: Email[];
  loading: boolean;
  searchQuery: string;
  groupFilter: string;
  masterKey: string | null;
  setSearchQuery: (query: string) => void;
  setGroupFilter: (groupId: string) => void;
  setMasterKey: (key: string) => void;
  addNewAuthenticator: (
    authenticator: Omit<
      Authenticator,
      "id" | "createdAt" | "updatedAt" | "order"
    >
  ) => Promise<void>;
  updateExistingAuthenticator: (
    id: string,
    authenticator: Partial<Omit<Authenticator, "id" | "createdAt">>
  ) => Promise<void>;
  removeAuthenticator: (id: string) => Promise<void>;
  addNewGroup: (
    group: Omit<Group, "id" | "createdAt" | "updatedAt" | "order">
  ) => Promise<void>;
  updateExistingGroup: (
    id: string,
    group: Partial<Omit<Group, "id" | "createdAt">>
  ) => Promise<void>;
  removeGroup: (id: string) => Promise<void>;
  addNewEmail: (address: string) => Promise<void>;
  removeEmail: (id: string) => Promise<void>;
  importData: (jsonData: string) => Promise<void>;
  exportData: () => Promise<string>;
  refreshData: () => Promise<void>;
  emailExists: (address: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [authenticators, setAuthenticators] = useState<Authenticator[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [masterKey, setMasterKey] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      const [authData, groupData, emailData] = await Promise.all([
        getAllAuthenticators(),
        getAllGroups(),
        getAllEmails(),
      ]);

      if (masterKey) {
        // Decrypt the authenticators' data
        const decryptedAuthData = await Promise.all(
          authData.map(async (auth) => {
            try {
              // Convert base64 back to ArrayBuffer and decrypt
              const secretBuffer = Uint8Array.from(atob(auth.secret), (c) =>
                c.charCodeAt(0)
              ).buffer;
              const decryptedSecret = await decryptData(
                secretBuffer,
                masterKey
              );

              let decryptedEmail;
              if (auth.email) {
                const emailBuffer = Uint8Array.from(atob(auth.email), (c) =>
                  c.charCodeAt(0)
                ).buffer;
                decryptedEmail = await decryptData(emailBuffer, masterKey);
              }

              return {
                ...auth,
                secret: decryptedSecret,
                email: decryptedEmail || auth.email,
              };
            } catch (error) {
              console.error("Failed to decrypt authenticator:", error);
              return auth;
            }
          })
        );
        setAuthenticators(decryptedAuthData);
      } else {
        setAuthenticators(authData);
      }

      setGroups(groupData);
      setEmails(emailData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [masterKey]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const addNewAuthenticator = async (
    authenticator: Omit<
      Authenticator,
      "id" | "createdAt" | "updatedAt" | "order"
    >
  ) => {
    if (!masterKey) throw new Error("Master key not set");

    const encryptedSecret = await encryptData(authenticator.secret, masterKey);
    const encryptedEmail = authenticator.email
      ? await encryptData(authenticator.email, masterKey)
      : undefined;

    // Convert ArrayBuffer to base64 string
    const secretString = btoa(
      String.fromCharCode(...new Uint8Array(encryptedSecret))
    );
    const emailString = encryptedEmail
      ? btoa(String.fromCharCode(...new Uint8Array(encryptedEmail)))
      : undefined;

    await addAuthenticator({
      ...authenticator,
      secret: secretString,
      email: emailString,
    });
    await refreshData();
  };

  const updateExistingAuthenticator = async (
    id: string,
    authenticator: Partial<Omit<Authenticator, "id" | "createdAt">>
  ) => {
    if (!masterKey) throw new Error("Master key not set");

    const encryptedData: Partial<Omit<Authenticator, "id" | "createdAt">> = {
      ...authenticator,
    };

    if (authenticator.secret) {
      const encryptedSecret = await encryptData(
        authenticator.secret,
        masterKey
      );
      encryptedData.secret = btoa(
        String.fromCharCode(...new Uint8Array(encryptedSecret))
      );
    }

    if (authenticator.email) {
      const encryptedEmail = await encryptData(authenticator.email, masterKey);
      encryptedData.email = btoa(
        String.fromCharCode(...new Uint8Array(encryptedEmail))
      );
    }

    await updateAuthenticator(id, encryptedData);
    await refreshData();
  };

  const removeAuthenticator = async (id: string) => {
    await deleteAuthenticator(id);
    await refreshData();
  };

  const addNewGroup = async (
    group: Omit<Group, "id" | "createdAt" | "updatedAt" | "order">
  ) => {
    await addGroup(group);
    await refreshData();
  };

  const updateExistingGroup = async (
    id: string,
    group: Partial<Omit<Group, "id" | "createdAt">>
  ) => {
    await updateGroup(id, group);
    await refreshData();
  };

  const removeGroup = async (id: string) => {
    await deleteGroup(id);
    await refreshData();
  };

  const addNewEmail = async (address: string) => {
    await addEmail(address);
    await refreshData();
  };

  const removeEmail = async (id: string) => {
    await deleteEmail(id);
    await refreshData();
  };

  const importData = async (jsonData: string) => {
    await importDbData(jsonData);
    await refreshData();
  };

  const exportData = async () => {
    return exportDbData();
  };

  const emailExists = (address: string) => {
    return emails.some(
      (email) => email.address.toLowerCase() === address.toLowerCase()
    );
  };

  const value = {
    authenticators,
    groups,
    emails,
    loading,
    searchQuery,
    groupFilter,
    setSearchQuery,
    setGroupFilter,
    setMasterKey,
    addNewAuthenticator,
    updateExistingAuthenticator,
    removeAuthenticator,
    addNewGroup,
    updateExistingGroup,
    removeGroup,
    addNewEmail,
    removeEmail,
    importData,
    exportData,
    refreshData,
    emailExists,
  };

  return (
    <AppContext.Provider value={{ ...value, masterKey }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
