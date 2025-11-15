import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { capitalize } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface RenameDialogProps {
  currentName: string;
  onRename: (newName: string) => void;
  type: "folder" | "strategy";
}

export const RenameDialog = ({
  currentName,
  onRename,
  type,
}: RenameDialogProps) => {
  const [name, setName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(currentName);
  }, [currentName]);

  // Focus input when dialog content is mounted
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && name !== currentName) {
      onRename(name.trim());
    }
  };

  return (
    <DialogContent
      onInteractOutside={(e) => {
        e.preventDefault();
      }}
    >
      <DialogHeader>
        <DialogTitle>Rename {capitalize(type)}</DialogTitle>
        <DialogDescription>Enter a new name for this {type}.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <Input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`${capitalize(type)} name`}
        />
        <DialogFooter className="mt-4">
          <Button type="submit" disabled={!name.trim() || name === currentName}>
            Rename
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};
