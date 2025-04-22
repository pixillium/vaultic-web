"use client";

import { toast } from "sonner";
import { useState } from "react";
import { Edit, Trash2, Check, X } from "lucide-react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTrigger,
  AlertDialogCancel,
  AlertDialogFooter,
  AlertDialogAction,
} from "../ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import type { Group } from "@/lib/db";
import { useAppContext } from "@/lib/context";
import { DEFAULT_GROUP_COLORS } from "@/lib/utils";

interface GroupCardProps {
  group: Group;
}

export default function GroupCard({ group }: GroupCardProps) {
  const { updateExistingGroup, removeGroup } = useAppContext();
  const [editName, setEditName] = useState(group.name);
  const [editColor, setEditColor] = useState(group.color);

  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error("Group name is required");
      return;
    }

    try {
      await updateExistingGroup(group.id, {
        name: editName.trim(),
        color: editColor,
      });

      toast.success("Group updated successfully");
    } catch (error) {
      console.error("Error updating group:", error);
      toast.error("Failed to update group");
    }
  };

  const handleDelete = async () => {
    try {
      await removeGroup(group.id);
      toast.success("Group deleted successfully");
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error("Failed to delete group");
    }
  };

  return (
    <div className="px-4 py-2 rounded-lg border flex flex-row justify-between items-center">
      <div className="flex items-center gap-2">
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: group.color }}
        />
        <h3 className="font-semibold">{group.name}</h3>
      </div>

      <div className="flex gap-1">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Edit size={16} />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="!max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Edit Group</AlertDialogTitle>
              <AlertDialogDescription>
                Edit the name and color of the group.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Group name"
            />
            <div className="flex flex-wrap gap-2">
              {DEFAULT_GROUP_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-6 h-6 rounded-full ${
                    editColor === color ? "ring-2 ring-offset-1 ring-ring" : ""
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setEditColor(color)}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer">
                <X className="mr-1 h-4 w-4" /> Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-lime-500 hover:bg-lime-600 cursor-pointer"
                onClick={handleSave}
              >
                <Check className="mr-1 h-4 w-4" /> Save
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive"
            >
              <Trash2 size={16} />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="!max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer">
                <X className="mr-1 h-4 w-4" /> Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 hover:bg-red-600 cursor-pointer"
                onClick={handleDelete}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
