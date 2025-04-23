"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { isMasterKeySet, setMasterKey, verifyMasterKey } from "@/lib/db";
import { toast } from "sonner";

interface MasterKeyDialogProps {
  onAuthenticated: (key: string) => void;
}

export default function MasterKeyDialog({
  onAuthenticated,
}: MasterKeyDialogProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkMasterKey = async () => {
      const hasKey = await isMasterKeySet();
      setIsFirstTime(!hasKey);
      // setIsOpen(!hasKey);
    };
    checkMasterKey();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isFirstTime) {
        if (password !== confirmPassword) {
          toast.error("Passwords do not match");
          return;
        }
        if (password.length < 8) {
          toast.error("Password must be at least 8 characters long");
          return;
        }
        await setMasterKey(password);
        toast.success("Master key set successfully");
      } else {
        const isValid = await verifyMasterKey(password);
        if (!isValid) {
          toast.error("Invalid master key");
          return;
        }
      }
      onAuthenticated(password);
      setIsOpen(false);
    } catch (error) {
      console.error("Error with master key:", error);
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isFirstTime ? "Set Master Key" : "Enter Master Key"}
          </DialogTitle>
          <DialogDescription>
            {isFirstTime
              ? "Please set a master key to encrypt your sensitive data. This key will be required each time you open the application."
              : "Enter your master key to access your data."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Master Key</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your master key"
              required
            />
          </div>

          {isFirstTime && (
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Master Key</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your master key"
                required
              />
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? "Processing..."
                : isFirstTime
                ? "Set Master Key"
                : "Unlock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
