"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCreateFolder } from "@/hooks/api/use-create-folder";
import { CreateFolderForm } from "./create-folder-form";
import { Plus } from "lucide-react";

interface CreateFolderPopoverProps {
  parentFolderId: number | null;
  onSuccess?: () => void;
  disabled?: boolean;
  disabledTooltip?: string;
}

export const CreateFolderPopover = ({
  parentFolderId,
  onSuccess,
  disabled = false,
  disabledTooltip = "Active subscription required to create folders",
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

  if (disabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button disabled>
              <Plus />
              New Folder
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{disabledTooltip}</TooltipContent>
      </Tooltip>
    );
  }

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
