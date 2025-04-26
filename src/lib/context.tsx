"use client";

import type React from "react";
import {
  createContext,
  useContext,
  useState,
  useReducer,
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
  exportData as exportDbData,
  mergeImportedData,
  resetDatabase,
  changeMasterKey as dbChangeMasterKey,
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
  exportData: () => Promise<string>;
  importData: (importedData: {
    authenticators: Authenticator[];
    groups: Group[];
    emails: Email[];
  }) => Promise<void>;
  refreshData: () => Promise<void>;
  resetData: () => Promise<void>;
  emailExists: (address: string) => boolean;
  changeMasterKey: (oldPassword: string, newPassword: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Utility
function base64ToArrayBuffer(base64: string) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Reducer for better per-item updates
type AuthAction =
  | { type: "set_all"; payload: Authenticator[] }
  | {
      type: "decrypt_one";
      payload: { id: string; decrypted: Partial<Authenticator> };
    };

function authenticatorsReducer(
  state: Authenticator[],
  action: AuthAction
): Authenticator[] {
  switch (action.type) {
    case "set_all":
      return action.payload;
    case "decrypt_one":
      return state.map((auth) =>
        auth.id === action.payload.id
          ? { ...auth, ...action.payload.decrypted }
          : auth
      );
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [authenticators, dispatchAuthenticators] = useReducer(
    authenticatorsReducer,
    []
  );
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

      dispatchAuthenticators({ type: "set_all", payload: authData });
      setGroups(groupData);

      if (masterKey) {
        // Start decrypting authenticators individually
        authData.forEach(async (auth) => {
          try {
            const secretBuffer = base64ToArrayBuffer(auth.secret);
            const decryptedSecret = await decryptData(secretBuffer, masterKey);

            let decryptedEmail = auth.email;
            if (auth.email) {
              const emailBuffer = base64ToArrayBuffer(auth.email);
              decryptedEmail = await decryptData(emailBuffer, masterKey);
            }

            dispatchAuthenticators({
              type: "decrypt_one",
              payload: {
                id: auth.id,
                decrypted: {
                  secret: decryptedSecret,
                  email: decryptedEmail,
                },
              },
            });
          } catch (error) {
            console.error(
              `Failed to decrypt authenticator ID ${auth.id}:`,
              error
            );
          }
        });

        // Decrypt emails in bulk after UI shows
        const decryptedEmails = await Promise.all(
          emailData.map(async (email) => {
            try {
              const buffer = base64ToArrayBuffer(email.address);
              const decryptedAddress = await decryptData(buffer, masterKey);
              return { ...email, address: decryptedAddress };
            } catch (error) {
              console.error(`Failed to decrypt email ID ${email.id}:`, error);
              return email;
            }
          })
        );
        setEmails(decryptedEmails);
      } else {
        setEmails(emailData);
      }
    } catch (error) {
      console.error("Error refreshing app data:", error);
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
    const secretString = btoa(
      String.fromCharCode(...new Uint8Array(encryptedSecret))
    );

    const encryptedEmail = authenticator.email
      ? await encryptData(authenticator.email, masterKey)
      : undefined;
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

    const updatedData: Partial<Omit<Authenticator, "id" | "createdAt">> = {
      ...authenticator,
    };

    if (authenticator.secret) {
      const encryptedSecret = await encryptData(
        authenticator.secret,
        masterKey
      );
      updatedData.secret = btoa(
        String.fromCharCode(...new Uint8Array(encryptedSecret))
      );
    }

    if (authenticator.email) {
      const encryptedEmail = await encryptData(authenticator.email, masterKey);
      updatedData.email = btoa(
        String.fromCharCode(...new Uint8Array(encryptedEmail))
      );
    }

    await updateAuthenticator(id, updatedData);
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
    if (!masterKey) throw new Error("Master key not set");
    await addEmail(address, masterKey);
    await refreshData();
  };

  const removeEmail = async (id: string) => {
    await deleteEmail(id);
    await refreshData();
  };

  const exportData = async () => {
    if (!masterKey) throw new Error("Master key not set");
    return exportDbData(masterKey);
  };

  const importData = async (importedData: {
    authenticators: Authenticator[];
    groups: Group[];
    emails: Email[];
  }) => {
    if (!masterKey) throw new Error("Master key not set");
    await mergeImportedData(masterKey, importedData);
    await refreshData();
  };

  const resetData = async () => {
    await resetDatabase();
    setMasterKey(null);
    await refreshData();
  };

  const emailExists = (address: string) => {
    return emails.some(
      (email) => email.address.toLowerCase() === address.toLowerCase()
    );
  };

  const changeMasterKey = async (oldPassword: string, newPassword: string) => {
    await dbChangeMasterKey(oldPassword, newPassword);
    setMasterKey(newPassword);
    await refreshData();
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
    exportData,
    importData,
    refreshData,
    resetData,
    emailExists,
    changeMasterKey,
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
