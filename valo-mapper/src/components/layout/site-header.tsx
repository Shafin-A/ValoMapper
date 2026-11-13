"use client";

import { CircleQuestionMark, SidebarIcon, UserRound } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { DiscordIcon } from "@/components/shared/discord-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import {
  ConnectionStatus,
  UserAvatars,
} from "@/components/collaboration/connection-status";
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
import { useWebSocketUsers } from "@/contexts/websocket-presence-context";
import { usePendingStackInvites } from "@/hooks/api/use-pending-stack-invite";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dispatch, SetStateAction } from "react";
import { HelpTab } from "@/components/help/help-tab";
import { DISCORD_INVITE_URL } from "@/lib/consts";

interface SiteHeaderProps {
  setLeftSidebarOpen: Dispatch<SetStateAction<boolean>>;
  setRightSidebarOpen: Dispatch<SetStateAction<boolean>>;
  /** Hide the canvas sidebar toggles on pages without sidebars. */
  showSidebarToggles?: boolean;
}

export const SiteHeader = ({
  setLeftSidebarOpen,
  setRightSidebarOpen,
  showSidebarToggles = true,
}: SiteHeaderProps) => {
  const { logout } = useFirebaseAuth();
  const { data: user, isLoading } = useUser();
  const pathname = usePathname();
  const users = useWebSocketUsers();
  const isRSOUser = Boolean(user?.rsoSubjectId);
  const canCheckPendingInvite =
    !isLoading && Boolean(user) && user?.subscriptionPlan !== "stack";
  const { data: pendingStackInvites } = usePendingStackInvites(
    canCheckPendingInvite,
  );
  const pendingStackInviteCount = pendingStackInvites?.length ?? 0;

  return (
    <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b">
      <div className="flex h-(--header-height) w-full items-center justify-between gap-1 px-2 pt-[env(safe-area-inset-top)] sm:gap-2">
        <div className="flex h-full items-center gap-1 sm:gap-2">
          {showSidebarToggles && (
            <>
              <Button
                className="h-10 w-10 sm:h-8 sm:w-8"
                variant="ghost"
                size="icon"
                aria-label="Toggle left sidebar"
                onClick={() => setLeftSidebarOpen((prev) => !prev)}
              >
                <SidebarIcon />
              </Button>
              <Separator
                orientation="vertical"
                className="mr-2 hidden h-4 sm:block"
              />
            </>
          )}

          <div className="flex items-center gap-2">
            <Link href="/" className="whitespace-nowrap">
              <span className="text-sm font-bold sm:text-base">
                <span className="bg-linear-to-r from-foreground to-primary bg-clip-text text-transparent">
                  ValoMapper
                </span>
              </span>
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

        <div className="flex h-full items-center gap-1 sm:gap-2">
          <Button
            asChild
            variant="ghost"
            className={`h-10 px-2 text-sm font-medium sm:h-8 sm:px-2.5 ${
              pathname?.startsWith("/replay") ? "text-white" : "text-white/70"
            }`}
          >
            <Link
              href="/replay"
              aria-current={
                pathname?.startsWith("/replay") ? "page" : undefined
              }
            >
              Replays
            </Link>
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={DISCORD_INVITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Join the ValoMapper Discord"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  "h-10 w-10 text-white/70 transition-colors hover:text-white sm:h-8 sm:w-8",
                  showSidebarToggles && "hidden sm:inline-flex",
                )}
              >
                <DiscordIcon className="size-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Report bugs or share feedback on Discord
            </TooltipContent>
          </Tooltip>

          <Dialog>
            <DialogTrigger asChild>
              <Button
                className="h-10 w-10 sm:h-8 sm:w-8"
                variant="ghost"
                size="icon"
                aria-label="Open help"
              >
                <CircleQuestionMark />
              </Button>
            </DialogTrigger>

            <DialogContent className="flex h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-none flex-col overflow-hidden p-4 sm:h-[min(640px,90dvh)] sm:w-[90vw] sm:max-w-4xl sm:p-6">
              <DialogHeader className="shrink-0 pr-8 text-left">
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
              <Button
                className="h-10 w-10 sm:h-8 sm:w-8"
                variant="ghost"
                size="icon"
                aria-label="Account menu"
              >
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
                    {isRSOUser && (
                      <DropdownMenuItem asChild>
                        <Link href="/matches">My Matches</Link>
                      </DropdownMenuItem>
                    )}
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

          {showSidebarToggles && (
            <>
              <Separator
                orientation="vertical"
                className="ml-2 hidden h-4 sm:block"
              />
              <Button
                className="h-10 w-10 sm:h-8 sm:w-8"
                variant="ghost"
                size="icon"
                aria-label="Toggle right sidebar"
                onClick={() => setRightSidebarOpen((prev) => !prev)}
              >
                <SidebarIcon className="rotate-180" />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
