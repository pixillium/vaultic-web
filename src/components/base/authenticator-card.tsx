"use client";

import { useState, useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Authenticator, Group } from "@/lib/db";
import {
  generateOTP,
  getRemainingSeconds,
  formatRemainingTime,
} from "@/lib/utils";
import { MoreVertical, Edit, Trash2, GripHorizontal, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { useAppContext } from "@/lib/context";
import EditAuthenticatorDialog from "./edit-authenticator-dialog";
import ServiceLogo from "./service-logo"
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "../ui/alert-dialog";

interface AuthenticatorCardProps {
  authenticator: Authenticator;
  group?: Group;
}

export default function AuthenticatorCard({
  authenticator,
  group,
}: AuthenticatorCardProps) {
  const { removeAuthenticator } = useAppContext();
  const [code, setCode] = useState("");
  const [remainingTime, setRemainingTime] = useState(30);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: authenticator.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  useEffect(() => {
    // Generate initial code
    setCode(generateOTP(authenticator.secret));
    setRemainingTime(getRemainingSeconds());

    // Set up interval to update code and timer
    intervalRef.current = setInterval(() => {
      const seconds = getRemainingSeconds();
      setRemainingTime(seconds);

      // Regenerate code when timer resets
      if (seconds === 30) {
        setCode(generateOTP(authenticator.secret));
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [authenticator.secret]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success("Authentication code copied to clipboard");
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this authenticator?")) {
      try {
        await removeAuthenticator(authenticator.id);
        toast.success("Authenticator deleted");
      } catch {
        toast.error("Failed to delete authenticator");
      }
    }
  };

  return (
    <>
      <Card ref={setNodeRef} style={style} className="relative group gap-3">
        <div
          {...attributes}
          {...listeners}
          className="absolute w-full flex justify-center group-hover:opacity-100 opacity-0 transition-all bottom-2 left-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing text-muted-foreground"
        >
          <GripHorizontal size={16} />
        </div>
        <CardHeader>
          <div className="flex justify-between items-start">
          	 <ServiceLogo name={authenticator.name} />
            <div>
              <h3 className="font-semibold text-lg">{authenticator.name}</h3>
              <p className="text-sm text-muted-foreground">{authenticator.email ? authenticator.email : "No email"}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {group && (
                <Badge
                  style={{ backgroundColor: group.color }}
                  className="text-white"
                >
                  {group.name}
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        className="text-destructive w-full justify-start !px-2"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Delete Authenticator
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this authenticator?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer">
                          <X className="mr-2 h-4 w-4" /> Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-destructive cursor-pointer"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            className="flex justify-center items-center bg-accent-foreground/5 rounded-lg px-2 py-4 cursor-pointer"
            onClick={handleCopyCode}
          >
            <div className="text-3xl font-mono tracking-wider">
              {code.slice(0, 3)} <span className="text-lime-400">•</span>{" "}
              {code.slice(3)}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <div className="w-full flex items-center gap-2">
            <Progress value={(remainingTime / 30) * 100} className="h-1" />
            <span className="text-sm font-mono w-6">
              {formatRemainingTime(remainingTime)}
            </span>
          </div>
        </CardFooter>
      </Card>

      <EditAuthenticatorDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        authenticator={authenticator}
      />
    </>
  );
}
