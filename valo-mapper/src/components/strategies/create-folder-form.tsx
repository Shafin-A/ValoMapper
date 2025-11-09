"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface CreateFolderFormProps {
  onSubmit: (folderName: string) => void;
  isPending: boolean;
}

export const CreateFolderForm = ({
  onSubmit,
  isPending,
}: CreateFolderFormProps) => {
  const [folderName, setFolderName] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!folderName.trim()) return;
        onSubmit(folderName.trim());
        setFolderName("");
      }}
      className="w-full"
    >
      <Card className="border-none shadow-none p-0">
        <CardContent className="p-0 flex flex-col gap-4">
          <div className="space-y-1">
            <h4 className="leading-none font-medium">Create new folder</h4>
            <p className="text-sm text-muted-foreground">
              Add a name to organize your strategies.
            </p>
          </div>

          <div className="space-y-1">
            <Label
              htmlFor="folderName"
              className="text-sm font-medium text-muted-foreground"
            >
              Folder name
            </Label>
            <Input
              id="folderName"
              type="text"
              name="folderName"
              placeholder="e.g. B Site Rush"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="h-9 text-sm"
              autoFocus
            />
          </div>

          <Button
            type="submit"
            size="sm"
            className="w-full font-medium"
            disabled={!folderName.trim() || isPending}
          >
            {isPending ? "Creating..." : "Create Folder"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
};
