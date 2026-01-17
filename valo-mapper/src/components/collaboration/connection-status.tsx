"use client";

import { useWebSocket } from "@/contexts/websocket-context";
import { UserPresence, WSConnectionStatus } from "@/lib/websocket-types";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Users, Wifi, WifiOff } from "lucide-react";

const STATUS_CONFIG: Record<
  WSConnectionStatus,
  { color: string; text: string; icon: typeof Wifi }
> = {
  connected: {
    color: "bg-green-500",
    text: "Connected",
    icon: Wifi,
  },
  connecting: {
    color: "bg-yellow-500 animate-pulse",
    text: "Connecting...",
    icon: Wifi,
  },
  disconnected: {
    color: "bg-gray-500",
    text: "Disconnected",
    icon: WifiOff,
  },
  error: {
    color: "bg-destructive",
    text: "Connection Error",
    icon: WifiOff,
  },
};

export const ConnectionStatus = () => {
  const { status, users } = useWebSocket();
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 cursor-default">
              <div className={cn("w-2 h-2 rounded-full", config.color)} />
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.text}</p>
          </TooltipContent>
        </Tooltip>

        {status === "connected" && users.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 cursor-default">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {users.length}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <p className="font-medium">Users in lobby:</p>
                {users.map((user) => (
                  <UserBadge key={user.id} user={user} />
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

const UserBadge = ({ user }: { user: UserPresence }) => {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: user.color }}
      />
      <span className="text-sm">{user.username}</span>
    </div>
  );
};

export const UserAvatars = () => {
  const { users } = useWebSocket();

  if (users.length === 0) {
    return null;
  }

  const visibleUsers = users.slice(0, 4);
  const remainingCount = users.length - 4;

  return (
    <TooltipProvider>
      <div className="flex items-center -space-x-2">
        {visibleUsers.map((user) => (
          <Tooltip key={user.id}>
            <TooltipTrigger asChild>
              <div
                className="w-7 h-7 rounded-full border-2 border-background flex items-center justify-center text-xs font-medium text-white cursor-default"
                style={{ backgroundColor: user.color }}
              >
                {user.username.charAt(0).toUpperCase()}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{user.username}</p>
            </TooltipContent>
          </Tooltip>
        ))}

        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-7 h-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium cursor-default">
                +{remainingCount}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                {users.slice(4).map((user) => (
                  <UserBadge key={user.id} user={user} />
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};
