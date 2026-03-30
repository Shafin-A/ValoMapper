"use client";

import { CircleQuestionMark, SidebarIcon, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConnectionStatus, UserAvatars } from "@/components/collaboration";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useUser } from "@/hooks/api/use-user";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { useWebSocket } from "@/contexts/websocket-context";
import { usePendingStackInvites } from "@/hooks/api/use-pending-stack-invite";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dispatch, SetStateAction } from "react";
import { HelpTab } from "@/components/help/help-tab";

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
  const { logout } = useFirebaseAuth();
  const { data: user, isLoading } = useUser();
  const pathname = usePathname();
  const { users } = useWebSocket();
  const canCheckPendingInvite =
    !isLoading && Boolean(user) && user?.subscriptionPlan !== "stack";
  const { data: pendingStackInvites } = usePendingStackInvites(
    canCheckPendingInvite,
  );
  const pendingStackInviteCount = pendingStackInvites?.length ?? 0;

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

          <div className="flex items-center gap-2">
            <Link href="/">
              <h1 className="font-bold">
                <span className="bg-linear-to-r from-foreground to-primary bg-clip-text text-transparent">
                  ValoMapper
                </span>
              </h1>
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {users.length > 1 && (
            <>
              <UserAvatars />
              <ConnectionStatus />
            </>
          )}
        </div>

        <div className="flex items-center gap-2 h-full">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="h-8 w-8" variant="ghost" size="icon">
                <CircleQuestionMark />
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-none w-[90vw] sm:max-w-4xl">
              <DialogHeader>
                <DialogTitle>Help</DialogTitle>
                <DialogDescription>
                  Find help for different sections.
                </DialogDescription>
              </DialogHeader>

              <HelpTab />
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-8 w-8" variant="ghost" size="icon">
                <UserRound />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              {isLoading || !user ? (
                <DropdownMenuItem asChild>
                  <Link
                    href={`/login?redirect=${encodeURIComponent(pathname)}`}
                  >
                    Login
                  </Link>
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuLabel>Welcome {user?.name}</DropdownMenuLabel>
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/profile">My Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/strategies">My Strategies</Link>
                    </DropdownMenuItem>
                    {pendingStackInviteCount > 0 && (
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="text-amber-600">
                          Pending Stack Invites ({pendingStackInviteCount})
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>Log out</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

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
