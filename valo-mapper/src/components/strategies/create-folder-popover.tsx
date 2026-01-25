"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useCreateFolder } from "@/hooks/api/use-create-folder";
import { CreateFolderForm } from "./create-folder-form";
import { Plus } from "lucide-react";

interface CreateFolderPopoverProps {
  parentFolderId: number | null;
  onSuccess?: () => void;
}

export const CreateFolderPopover = ({
  parentFolderId,
  onSuccess,
}: CreateFolderPopoverProps) => {
  const [open, setOpen] = useState(false);
  const { mutate: createFolder, isPending } = useCreateFolder();

  const handleSubmit = (folderName: string) => {
    createFolder(
      { name: folderName, parentFolderId },
      {
        onSuccess: () => {
          setOpen(false);
          onSuccess?.();
        },
      },
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button>
          <Plus />
          New Folder
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80">
        <CreateFolderForm onSubmit={handleSubmit} isPending={isPending} />
      </PopoverContent>
    </Popover>
  );
};
