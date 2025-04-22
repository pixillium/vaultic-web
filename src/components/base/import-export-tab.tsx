"use client";

import type React from "react";

import { useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/lib/context";
import { Upload, Lock } from "lucide-react";
import { encryptData, decryptData, validateDecryptedData } from "@/lib/crypto";
import { mergeImportedData } from "@/lib/db";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
export default function ImportExportTab() {
  const { exportData, refreshData } = useAppContext();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [importPassword, setImportPassword] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportClick = () => {
    setExportPassword("");
    setIsExportDialogOpen(true);
  };

  const handleImportClick = () => {
    setImportPassword("");
    setSelectedFile(null);
    setIsImportDialogOpen(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleExport = async () => {
    if (!exportPassword.trim()) {
      toast.error("Please enter a password");
      return;
    }

    try {
      setIsExporting(true);

      // Get data to export
      const data = await exportData();

      // Encrypt the data
      const encryptedData = await encryptData(data, exportPassword);

      // Create a download link
      const blob = new Blob([encryptedData], {
        type: "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `2fa-manager-export-${
        new Date().toISOString().split("T")[0]
      }.vauc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Data exported successfully");

      setIsExportDialogOpen(false);
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to import");
      return;
    }

    if (!importPassword.trim()) {
      toast.error("Please enter a password");
      return;
    }

    try {
      setIsImporting(true);

      // Read the file
      const fileBuffer = await selectedFile.arrayBuffer();

      // Decrypt the data
      const decryptedData = await decryptData(fileBuffer, importPassword);

      // Parse and validate the decrypted data
      const parsedData = JSON.parse(decryptedData);

      if (!validateDecryptedData(parsedData)) {
        throw new Error("Invalid data format");
      }

      // Merge the imported data with existing data
      await mergeImportedData(parsedData);

      // Refresh the UI
      await refreshData();

      toast.success("Data imported successfully");

      setIsImportDialogOpen(false);
    } catch (error) {
      console.error("Error importing data:", error);
      toast.error("Failed to import data");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Export Data</CardTitle>
          <CardDescription>
            Export your authenticators, groups, and emails for backup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExportClick} className="w-full">
            <Lock className="mr-2 h-4 w-4" />
            Export Encrypted Data
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import Data</CardTitle>
          <CardDescription>
            Import your previously exported data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleImportClick} className="w-full">
            <Upload className="mr-2 h-4 w-4" />
            Import Encrypted Data
          </Button>
        </CardContent>
      </Card>

      {/* Export Password Dialog */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="!max-w-md">
          <DialogHeader>
            <DialogTitle>Export Encrypted Data</DialogTitle>
            <DialogDescription>
              Enter a password to encrypt your data. You&apos;ll need this
              password to import the data later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="export-password">Password</Label>
              <Input
                id="export-password"
                type="password"
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
                placeholder="Enter a secure password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsExportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? "Exporting..." : "Export"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Password Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="!max-w-md">
          <DialogHeader>
            <DialogTitle>Import Encrypted Data</DialogTitle>
            <DialogDescription>
              Select a .vauc file and enter the password used to encrypt it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="import-file">File</Label>
              <Input
                id="import-file"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".vauc"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-password">Password</Label>
              <Input
                id="import-password"
                type="password"
                value={importPassword}
                onChange={(e) => setImportPassword(e.target.value)}
                placeholder="Enter the password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={isImporting || !selectedFile}
            >
              {isImporting ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
