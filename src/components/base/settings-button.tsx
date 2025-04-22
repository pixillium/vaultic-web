"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import SettingsDialog from "./settings-dialog";

export default function SettingsButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button
        size="icon"
        variant="outline"
        onClick={() => setIsDialogOpen(true)}
        className="fixed bg-foreground/10 backdrop-blur-sm bottom-4 right-4 z-100"
      >
        <Settings className="h-5 w-5" />
      </Button>

      <SettingsDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  );
}
