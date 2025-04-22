"use client";

import type React from "react";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppContext } from "@/lib/context";
import { validateSecret } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

import { toast } from "sonner";

interface AddAuthenticatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddAuthenticatorDialog({
  open,
  onOpenChange,
}: AddAuthenticatorDialogProps) {
  const { groups, emails, addNewAuthenticator, addNewEmail, emailExists } =
    useAppContext();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [secret, setSecret] = useState("");
  const [groupId, setGroupId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secretError, setSecretError] = useState("");
  const [saveEmail, setSaveEmail] = useState(false);
  const [isNewEmail, setIsNewEmail] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!secret.trim()) {
      toast.error("Secret key is required");
      return;
    }

    if (!validateSecret(secret)) {
      toast.error("Invalid secret key format");
      return;
    }

    setIsSubmitting(true);

    try {
      // Save email if checkbox is checked and it's a new email
      if (saveEmail && email.trim() && isNewEmail) {
        await addNewEmail(email.trim());
      }

      await addNewAuthenticator({
        name: name.trim(),
        email: email.trim() || undefined,
        secret: secret.trim(),
        groupId: groupId || undefined,
      });

      toast.success("Authenticator added successfully!");

      // Reset form and close dialog
      setName("");
      setEmail("");
      setSecret("");
      setGroupId(undefined);
      setSecretError("");
      setSaveEmail(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding authenticator:", error);
      toast.error("Failed to add authenticator");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSecretChange = (value: string) => {
    setSecret(value);
    if (secretError && validateSecret(value)) {
      setSecretError("");
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    checkIfNewEmail(value);
  };

  const checkIfNewEmail = (value: string) => {
    setIsNewEmail(value.trim() !== "" && !emailExists(value.trim()));
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setSecret("");
      setGroupId(undefined);
      setSecretError("");
      setSaveEmail(false);
      setIsNewEmail(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Authenticator</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Google, GitHub, etc."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <div className="flex flex-col gap-2">
              <Input
                id="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="Associated email"
                type="email"
              />
              {emails.length > 0 && (
                <Select onValueChange={handleEmailChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select from saved emails" />
                  </SelectTrigger>
                  <SelectContent>
                    {emails.map((emailItem) => (
                      <SelectItem key={emailItem.id} value={emailItem.address}>
                        {emailItem.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {isNewEmail && (
              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="save-email"
                  checked={saveEmail}
                  onCheckedChange={(checked) => setSaveEmail(!!checked)}
                />
                <Label htmlFor="save-email" className="text-sm font-normal">
                  Save this email for future use
                </Label>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="secret">Secret Key</Label>
            <Input
              id="secret"
              value={secret}
              onChange={(e) => handleSecretChange(e.target.value)}
              placeholder="JBSWY3DPEHPK3PXP"
              required
            />
            {secretError && (
              <p className="text-sm text-destructive">{secretError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="group">Group (optional)</Label>
            <Select
              onValueChange={(value) => setGroupId(value)}
              value={groupId || ""}
            >
              <SelectTrigger id="group" className="w-full">
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Group</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Authenticator"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
