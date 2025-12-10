"use client";

import { AgentsSidebar } from "@/components/agents-sidebar";
import { MapStage, MapStageHandle } from "@/components/canvas";
import { SiteHeader } from "@/components/layout/site-header";
import { ToolsSidebar } from "@/components/tools-sidebar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useCanvas } from "@/contexts/canvas-context";
import { useSidebarState } from "@/hooks/use-sidebar-state";
import { MAP_SIZE } from "@/lib/consts";
import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "@/lib/consts/misc/consts";
import { AlertCircle, Home, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";

const LobbyEditPage = () => {
  const divRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<MapStageHandle | null>(null);
  const [stageScale, setStageScale] = useState(1);
  const [isScaleReady, setIsScaleReady] = useState(false);

  const sidebarState = useSidebarState();

  const { isLoadingLobby, isErrorLobby, lobbyError } = useCanvas();

  useLayoutEffect(() => {
    const updateScale = () => {
      if (!divRef.current) return;

      const containerWidth = divRef.current.offsetWidth;
      const containerHeight = divRef.current.offsetHeight;

      if (containerWidth === 0 || containerHeight === 0) return;

      const scaleX = containerWidth / VIRTUAL_WIDTH;
      const scaleY = containerHeight / VIRTUAL_HEIGHT;
      const scale = Math.min(scaleX, scaleY);

      setStageScale(scale);
      setIsScaleReady(true);
    };

    const timeoutId = setTimeout(updateScale, 0);

    if (typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver(updateScale);
      setTimeout(() => {
        if (divRef.current) {
          resizeObserver.observe(divRef.current);
        }
      }, 0);
      return () => {
        clearTimeout(timeoutId);
        resizeObserver.disconnect();
      };
    } else {
      window.addEventListener("resize", updateScale);
      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener("resize", updateScale);
      };
    }
  }, []);

  const mapPosition = {
    x: (VIRTUAL_WIDTH - MAP_SIZE) / 2,
    y: (VIRTUAL_HEIGHT - MAP_SIZE) / 2,
  };

  const params = useParams();

  useEffect(() => {
    if (sessionStorage.getItem("showCreatedToast")) {
      toast.success(`Lobby created • Code: ${params.lobbyCode}`, {
        id: `lobby-created-${params.lobbyCode}`,
        action: {
          label: "Copy Link",
          onClick: async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
              toast.success("Link copied!");
            } catch (err) {
              console.error("Failed to copy link:", err);
              toast.error("Failed to copy link to clipboard");
            }
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
        stageRef={stageRef}
      />

      <Suspense fallback={<LobbyLoadingSkeleton />}>
        <div
          className="flex h-[calc(100svh-1px-var(--header-height))] overflow-hidden"
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
                          Unsaved lobbies are automatically removed after 12
                          hours of inactivity.
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
          ) : !isScaleReady ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
                <p className="text-muted-foreground font-medium">
                  Initializing canvas...
                </p>
              </div>
            </div>
          ) : (
            <MapStage
              ref={stageRef}
              width={VIRTUAL_WIDTH * stageScale}
              height={VIRTUAL_HEIGHT * stageScale}
              scale={stageScale}
              mapPosition={mapPosition}
            />
          )}
        </div>
      </Suspense>

      <AgentsSidebar sidebarOpen={sidebarState.rightSidebarOpen} />
    </div>
  );
};

const LobbyLoadingSkeleton = () => {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Loading lobby...</p>
      </div>
    </div>
  );
};

export default LobbyEditPage;
