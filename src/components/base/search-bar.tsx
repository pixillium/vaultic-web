"use client";

import type React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { useAppContext } from "@/lib/context";

export default function SearchBar() {
  const { groups, searchQuery, groupFilter, setSearchQuery, setGroupFilter } =
    useAppContext();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleGroupChange = (value: string) => {
    setGroupFilter(value);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full">
      <div className="relative w-full">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search authenticators..."
          className="pl-8 w-full"
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>

      <Select value={groupFilter} onValueChange={handleGroupChange}>
        <SelectTrigger className="w-full sm:w-40 cursor-pointer">
          <SelectValue placeholder="All Groups" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Groups</SelectItem>
          <SelectItem value="none">No Group</SelectItem>
          {groups.map((group) => (
            <SelectItem key={group.id} value={group.id}>
              {group.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
