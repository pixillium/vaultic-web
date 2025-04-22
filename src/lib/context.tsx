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

interface AppContextType {
  authenticators: Authenticator[];
  groups: Group[];
  emails: Email[];
  loading: boolean;
  searchQuery: string;
  groupFilter: string;
  setSearchQuery: (query: string) => void;
  setGroupFilter: (groupId: string) => void;
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

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      const [authData, groupData, emailData] = await Promise.all([
        getAllAuthenticators(),
        getAllGroups(),
        getAllEmails(),
      ]);
      setAuthenticators(authData);
      setGroups(groupData);
      setEmails(emailData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const addNewAuthenticator = async (
    authenticator: Omit<
      Authenticator,
      "id" | "createdAt" | "updatedAt" | "order"
    >
  ) => {
    await addAuthenticator(authenticator);
    await refreshData();
  };

  const updateExistingAuthenticator = async (
    id: string,
    authenticator: Partial<Omit<Authenticator, "id" | "createdAt">>
  ) => {
    await updateAuthenticator(id, authenticator);
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

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
