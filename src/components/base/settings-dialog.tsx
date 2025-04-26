"use client";

import { useState } from "react";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import ThemeSettings from "./theme-settings";
import ImportExportTab from "./import-export-tab";
import EmailsManagement from "./emails-management";
import GroupsManagement from "./groups-management";
import ResetSettings from "./reset-settings";
import ChangeMasterKeySettings from "./change-master-key-settings";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({
  open,
  onOpenChange,
}: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState("groups");

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[80vh] flex items-center justify-center">
        <div className="max-w-2xl w-full px-4">
          <DrawerHeader>
            <DrawerTitle>Settings</DrawerTitle>
          </DrawerHeader>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="w-full mb-5">
              <TabsTrigger value="groups">Groups</TabsTrigger>
              <TabsTrigger value="emails">Emails</TabsTrigger>
              <TabsTrigger value="import-export">Sync</TabsTrigger>
              <TabsTrigger value="appearance">Theme</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="reset">Reset</TabsTrigger>
            </TabsList>

            <TabsContent value="groups">
              <GroupsManagement />
            </TabsContent>
            <TabsContent value="emails">
              <EmailsManagement />
            </TabsContent>
            <TabsContent value="import-export">
              <ImportExportTab />
            </TabsContent>
            <TabsContent value="appearance">
              <ThemeSettings />
            </TabsContent>
            <TabsContent value="security">
              <div className="space-y-6">
                <ChangeMasterKeySettings />
              </div>
            </TabsContent>
            <TabsContent value="reset">
              <ResetSettings />
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
