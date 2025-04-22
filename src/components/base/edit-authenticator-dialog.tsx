"use client";

import type React from "react";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

import type { Authenticator } from "@/lib/db";
import { validateSecret } from "@/lib/utils";
import { useAppContext } from "@/lib/context";

import { toast } from "sonner";
interface EditAuthenticatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authenticator: Authenticator;
}

export default function EditAuthenticatorDialog({
  open,
  onOpenChange,
  authenticator,
}: EditAuthenticatorDialogProps) {
  const {
    groups,
    emails,
    updateExistingAuthenticator,
    addNewEmail,
    emailExists,
  } = useAppContext();
  const [name, setName] = useState(authenticator.name);
  const [email, setEmail] = useState(authenticator.email || "");
  const [secret, setSecret] = useState(authenticator.secret);
  const [groupId, setGroupId] = useState<string | undefined>(
    authenticator.groupId
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secretError, setSecretError] = useState("");
  const [saveEmail, setSaveEmail] = useState(false);
  const [isNewEmail, setIsNewEmail] = useState(false);

  const checkIfNewEmail = useCallback(
    (value: string) => {
      setIsNewEmail(value.trim() !== "" && !emailExists(value.trim()));
    },
    [emailExists]
  );

  useEffect(() => {
    if (open) {
      // Reset form values when dialog opens
      setName(authenticator.name);
      setEmail(authenticator.email || "");
      setSecret(authenticator.secret);
      setGroupId(authenticator.groupId);
      setSecretError("");
      setSaveEmail(false);
      checkIfNewEmail(authenticator.email || "");
    }
  }, [open, authenticator, checkIfNewEmail]);

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
      setSecretError("Invalid secret key format");
      return;
    }

    setIsSubmitting(true);

    try {
      // Save email if checkbox is checked and it's a new email
      if (saveEmail && email.trim() && isNewEmail) {
        await addNewEmail(email.trim());
      }

      await updateExistingAuthenticator(authenticator.id, {
        name: name.trim(),
        email: email.trim() || undefined,
        secret: secret.trim(),
        groupId: groupId || undefined,
      });

      toast.success("Authenticator updated successfully");

      onOpenChange(false);
    } catch (error) {
      console.error("Error updating authenticator:", error);
      toast.error("Failed to update authenticator");
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Authenticator</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Google, GitHub, etc."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Email (optional)</Label>
            <div className="flex flex-col gap-2">
              <Input
                id="edit-email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="associated email"
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
                  id="edit-save-email"
                  checked={saveEmail}
                  onCheckedChange={(checked) => setSaveEmail(!!checked)}
                />
                <Label
                  htmlFor="edit-save-email"
                  className="text-sm font-normal"
                >
                  Save this email for future use
                </Label>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-secret">Secret Key</Label>
            <Input
              id="edit-secret"
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
            <Label htmlFor="edit-group">Group (optional)</Label>
            <Select
              onValueChange={(value) => setGroupId(value)}
              value={groupId || ""}
            >
              <SelectTrigger id="edit-group" className="w-full">
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
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
