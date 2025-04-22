"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { reorderAuthenticators } from "@/lib/db";
import AuthenticatorCard from "./authenticator-card";
import { useAppContext } from "@/lib/context";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthenticatorGrid() {
  const { authenticators, groups, loading, searchQuery, groupFilter } =
    useAppContext();
  const [items, setItems] = useState<typeof authenticators>([]);
  const [mounted, setMounted] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Filter authenticators based on search query and group filter
    const filtered = authenticators.filter((auth) => {
      // Filter by search query
      const matchesSearch =
        searchQuery === "" ||
        auth.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (auth.email &&
          auth.email.toLowerCase().includes(searchQuery.toLowerCase()));

      // Filter by group
      const matchesGroup =
        groupFilter === "all" ||
        (groupFilter === "none" && !auth.groupId) ||
        auth.groupId === groupFilter;

      return matchesSearch && matchesGroup;
    });

    setItems(filtered);
  }, [authenticators, searchQuery, groupFilter]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((currentItems) => {
        const oldIndex = currentItems.findIndex(
          (item) => item.id === active.id
        );
        const newIndex = currentItems.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(currentItems, oldIndex, newIndex);

        // Update the order in the database
        const ids = newItems.map((item) => item.id);
        reorderAuthenticators(ids).catch(console.error);

        return newItems;
      });
    }
  };

  // Show skeleton while mounting to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array(6)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-[180px] w-full rounded-lg" />
          ))}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array(6)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-[180px] w-full rounded-lg" />
          ))}
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-8 py-16 text-center bg-rose-500/10 border-2 border-rose-500 rounded-2xl">
        <h3 className="text-xl font-semibold mb-2">No authenticators found</h3>
        <p className="opacity-50 mb-4">
          {searchQuery || groupFilter !== "all"
            ? "Try adjusting your search or filter criteria"
            : "Add your first authenticator to get started"}
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToParentElement]}
    >
      <SortableContext
        items={items.map((a) => a.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((authenticator) => (
            <AuthenticatorCard
              key={authenticator.id}
              authenticator={authenticator}
              group={groups.find((g) => g.id === authenticator.groupId)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
