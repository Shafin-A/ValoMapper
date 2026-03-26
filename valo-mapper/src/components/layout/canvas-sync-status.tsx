import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { SyncStatus } from "@/lib/types";

const statusText = (syncStatus: SyncStatus | undefined) => {
  switch (syncStatus) {
    case "syncing":
      return "Syncing...";
    case "error":
      return "Sync failed";
    case "unsynced":
      return "Unsynced";
    case "synced":
      return "Synced";
    default:
      return "";
  }
};

export const CanvasSyncStatus = ({
  syncStatus,
}: {
  syncStatus?: SyncStatus;
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (
      syncStatus === "syncing" ||
      syncStatus === "error" ||
      syncStatus === "unsynced"
    ) {
      setVisible(true);
      return;
    }

    if (syncStatus === "synced") {
      setVisible(true);
      const timer = window.setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(timer);
    }

    setVisible(false);
  }, [syncStatus]);

  if (!visible) return null;

  const text = statusText(syncStatus);

  return (
    <span className="text-xs text-muted-foreground flex items-center gap-1 transition-opacity">
      {syncStatus === "unsynced" && <AlertCircle className="h-3 w-3" />}
      {syncStatus === "syncing" && <Loader2 className="h-3 w-3 animate-spin" />}
      {syncStatus === "error" && (
        <AlertCircle className="h-3 w-3 text-destructive" />
      )}
      {syncStatus === "synced" && <Check className="h-3 w-3" />}
      <span>{text}</span>
    </span>
  );
};
