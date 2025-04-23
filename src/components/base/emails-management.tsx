"use client";

import type React from "react";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppContext } from "@/lib/context";
import { Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "../ui/alert-dialog";
import { AlertDialogTrigger } from "../ui/alert-dialog";
import { ScrollArea } from "../ui/scroll-area";

export default function EmailsManagement() {
  const { emails, addNewEmail, removeEmail } = useAppContext();
  const [newEmail, setNewEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEmail.trim()) {
      toast.error("Email address is required");
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      await addNewEmail(newEmail.trim());
      setNewEmail("");
      toast.success("Email added successfully");
    } catch (error) {
      console.error("Error adding email:", error);
      toast.error("Failed to add email");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEmail = async (id: string) => {
    try {
      await removeEmail(id);
      toast.success("Email deleted successfully");
    } catch (error) {
      console.error("Error deleting email:", error);
      toast.error("Failed to delete email");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Addresses</CardTitle>
        <CardDescription>
          Manage your email addresses for easy access when creating
          authenticators
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAddEmail} className="flex gap-2">
          <Input
            type="email"
            placeholder="Add a new email address"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add"}
          </Button>
        </form>

        {emails.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You haven&apos;t added any email addresses yet.
          </p>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {emails.map((email) => (
                <div
                  key={email.id}
                  className="flex items-center justify-between px-4 py-2 border rounded-lg"
                >
                  <span>{email.address}</span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="!max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Email</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this email address?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer">
                          <X className="mr-2 h-4 w-4" /> Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-500 hover:bg-red-600 cursor-pointer"
                          onClick={() => handleDeleteEmail(email.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
