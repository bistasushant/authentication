"use client";

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DeleteDialogProps<T> = {
  onDelete: (id: T | null) => void | Promise<void>;
  isLoading?: boolean;
};

export default function useDeleteDialog<T extends string = string>() {
  const [open, setOpenState] = useState(false);
  const [targetId, setTargetId] = useState<T | null>(null);
  const [label, setLabel] = useState("");

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next);
    if (!next) {
      setTargetId(null);
      setLabel("");
    }
  }, []);

  const confirmDelete = useCallback((entityLabel: string, id: T) => {
    setLabel(entityLabel);
    setTargetId(id);
    setOpenState(true);
  }, []);

  function DeleteDialog({ onDelete, isLoading }: DeleteDialogProps<T>) {
    return (
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>
              {label
                ? `This will permanently remove "${label}". This action cannot be undone.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isLoading}
              onClick={async (e) => {
                e.preventDefault();
                await onDelete(targetId);
                setOpen(false);
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return { DeleteDialog, delete: confirmDelete, setOpen };
}