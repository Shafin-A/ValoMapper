"use client";

import { SidebarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dispatch, SetStateAction } from "react";

interface SiteHeaderProps {
  leftSidebarOpen: boolean;
  setLeftSidebarOpen: Dispatch<SetStateAction<boolean>>;
  rightSidebarOpen: boolean;
  setRightSidebarOpen: Dispatch<SetStateAction<boolean>>;
}

export const SiteHeader = ({
  leftSidebarOpen,
  setLeftSidebarOpen,
  rightSidebarOpen,
  setRightSidebarOpen,
}: SiteHeaderProps) => {
  return (
    <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b">
      <div className="flex h-(--header-height) w-full items-center justify-between gap-2 px-2">
        <div className="flex items-center gap-2 h-full">
          <Button
            className="h-8 w-8"
            variant="ghost"
            size="icon"
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
          >
            <SidebarIcon />
          </Button>
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span>ValoMapper</span>
        </div>

        <div className="flex items-center gap-2 h-full">
          <Separator orientation="vertical" className="ml-2 h-4" />
          <Button
            className="h-8 w-8"
            variant="ghost"
            size="icon"
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
          >
            <SidebarIcon className="rotate-180" />
          </Button>
        </div>
      </div>
    </header>
  );
};
