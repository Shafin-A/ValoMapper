import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("strategies");
  const [name, setName] = useState(currentName);
  const title = type === "folder" ? t("renameFolderTitle") : t("renameStrategyTitle");
  const description =
    type === "folder"
      ? t("renameFolderDescription")
      : t("renameStrategyDescription");
  const placeholder =
    type === "folder"
      ? t("renameFolderPlaceholder")
      : t("renameStrategyPlaceholder");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(currentName);
  }, [currentName]);

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
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <Input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
        />
        <DialogFooter className="mt-4">
          <Button type="submit" disabled={!name.trim() || name === currentName}>
            {t("rename")}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};
