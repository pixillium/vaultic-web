"use client";

import { toast } from "sonner";
import { useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "../ui/scroll-area";
import { Button } from "@/components/ui/button";

import { Plus } from "lucide-react";
import GroupCard from "./group-card";

import { useAppContext } from "@/lib/context";
import { DEFAULT_GROUP_COLORS } from "@/lib/utils";

export default function GroupsManagement() {
  const { groups, addNewGroup } = useAppContext();
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedColor, setSelectedColor] = useState(DEFAULT_GROUP_COLORS[0]);

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newGroupName.trim()) {
      toast.error("Group name is required");
      return;
    }

    try {
      await addNewGroup({
        name: newGroupName.trim(),
        color: selectedColor,
      });

      toast.success("Group added successfully");

      setNewGroupName("");
    } catch (error) {
      console.error("Error adding group:", error);
      toast.error("Failed to add group");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Group</CardTitle>
          <CardDescription>
            Create a new group to organize your authenticators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddGroup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter group name"
              />
            </div>

            <div className="space-y-2">
              <Label>Group Color</Label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_GROUP_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full ${
                      selectedColor === color
                        ? "ring-2 ring-offset-2 ring-ring"
                        : ""
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Group
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Groups</h2>

        {groups.length === 0 ? (
          <p className="text-muted-foreground">
            You haven&apos;t created any groups yet.
          </p>
        ) : (
          <ScrollArea className="h-[70px]">
            <div className="space-y-2">
              {groups.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
