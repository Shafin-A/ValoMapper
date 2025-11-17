"use client";

import { AgentsSidebar } from "@/components/agents-sidebar";
import { MapStage } from "@/components/canvas";
import { SiteHeader } from "@/components/site-header";
import { ToolsSidebar } from "@/components/tools-sidebar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useCanvas } from "@/contexts/canvas-context";
import { useDimensions } from "@/hooks/use-dimensions";
import { usePositionScaling } from "@/hooks/use-position-scaling";
import { useSidebarState } from "@/hooks/use-sidebar-state";
import { MAP_SIZE } from "@/lib/consts";
import { AlertCircle, Home, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

const LobbyEditPage = () => {
  const divRef = useRef<HTMLDivElement>(null);

  const { dimensions, previousDimensions } = useDimensions(divRef);
  const sidebarState = useSidebarState();

  const {
    agentsOnCanvas,
    setAgentsOnCanvas,
    abilitiesOnCanvas,
    setAbilitiesOnCanvas,
    isLoadingLobby,
    isErrorLobby,
    lobbyError,
  } = useCanvas();

  usePositionScaling(
    dimensions,
    previousDimensions,
    agentsOnCanvas,
    setAgentsOnCanvas,
    abilitiesOnCanvas,
    setAbilitiesOnCanvas,
    MAP_SIZE
  );

  const mapPosition = {
    x: (dimensions.width - MAP_SIZE) / 2,
    y: (dimensions.height - MAP_SIZE) / 2,
  };

  const params = useParams();

  useEffect(() => {
    if (sessionStorage.getItem("showCreatedToast")) {
      toast.success(`Lobby created • Code: ${params.lobbyCode}`, {
        id: `lobby-created-${params.lobbyCode}`,
        action: {
          label: "Copy Link",
          onClick: () => {
            navigator.clipboard.writeText(window.location.href);
            toast.success("Link copied!");
          },
        },
      });

      sessionStorage.removeItem("showCreatedToast");
    }
  }, [params.lobbyCode]);

  const isNotFound = lobbyError?.message?.includes("not found");

  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SiteHeader {...sidebarState} />

      <ToolsSidebar
        sidebarOpen={sidebarState.leftSidebarOpen}
        mapPosition={mapPosition}
      />

      <div
        className="flex h-[calc(100svh-1px-var(--header-height))]!"
        ref={divRef}
      >
        {isLoadingLobby ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
              <p className="text-muted-foreground font-medium">
                Loading lobby...
              </p>
            </div>
          </div>
        ) : isErrorLobby ? (
          <div className="w-full h-full flex items-center justify-center px-4">
            <div className="max-w-md space-y-4">
              <div className="flex justify-end">
                <Button variant="outline" size="icon" asChild>
                  <Link href="/">
                    <Home className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>
                  {isNotFound ? "Lobby not found" : "Failed to load lobby"}
                </AlertTitle>
                <AlertDescription>
                  {isNotFound ? (
                    <div className="space-y-2">
                      <p>
                        This lobby doesn&apos;t exist or may have been deleted
                        due to inactivity.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Unsaved lobbies are automatically removed after 12 hours
                        of inactivity.
                      </p>
                    </div>
                  ) : (
                    <p>
                      There was an error loading this lobby. Please try again
                      later.
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            </div>
          </div>
        ) : (
          <MapStage
            width={dimensions.width}
            height={dimensions.height}
            mapPosition={mapPosition}
          />
        )}
      </div>

      <AgentsSidebar sidebarOpen={sidebarState.rightSidebarOpen} />
    </div>
  );
};

export default LobbyEditPage;
