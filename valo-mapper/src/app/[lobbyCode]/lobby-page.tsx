"use client";

import { AgentsSidebar } from "@/components/agents-sidebar";
import { MapStage, MapStageHandle } from "@/components/canvas";
import { SiteHeader } from "@/components/layout/site-header";
import { ToolsSidebar } from "@/components/tools-sidebar";
import { TourAutoAdvance } from "@/components/tour/tour-auto-advance";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useCanvas } from "@/contexts/canvas-context";
import { useSidebarState } from "@/hooks/use-sidebar-state";
import { AGENTS, MAP_OPTIONS, MAP_SIZE } from "@/lib/consts";
import { ABILITY_LOOKUP } from "@/lib/consts/configs/agent-icon/consts";
import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from "@/lib/consts/misc/consts";
import { preloadImages, preloadImagesWithTimeout } from "@/lib/image-preload";
import { getAgentImgSrc } from "@/lib/utils";
import { AlertCircle, Home, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";

const ALL_MAP_IMAGE_SOURCES = MAP_OPTIONS.map(
  (mapOption) => `/maps/minimaps/${mapOption.id}.webp`,
);
const ALL_AGENT_IMAGE_SOURCES = AGENTS.map((agent) =>
  getAgentImgSrc(agent.name),
);
const ALL_ABILITY_IMAGE_SOURCES = Array.from(
  new Set(
    Object.values(ABILITY_LOOKUP)
      .map((ability) => ability.src)
      .filter((src): src is string => Boolean(src)),
  ),
);

const LobbyEditPage = () => {
  const divRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<MapStageHandle | null>(null);
  const [stageScale, setStageScale] = useState(1);
  const [isScaleReady, setIsScaleReady] = useState(false);
  const [isAssetWarmupReady, setIsAssetWarmupReady] = useState(false);
  const hasCompletedInitialAssetWarmup = useRef(false);

  const sidebarState = useSidebarState();

  const {
    isLoadingLobby,
    isErrorLobby,
    lobbyError,
    selectedMap,
    agentsOnCanvas,
    abilitiesOnCanvas,
    toolIconsOnCanvas,
  } = useCanvas();

  useEffect(() => {
    if (isLoadingLobby || isErrorLobby) return;
    if (hasCompletedInitialAssetWarmup.current) return;

    let isCancelled = false;

    const markWarmupReady = () => {
      if (isCancelled || hasCompletedInitialAssetWarmup.current) return;
      hasCompletedInitialAssetWarmup.current = true;
      setIsAssetWarmupReady(true);
    };

    let fallbackTimeout = window.setTimeout(markWarmupReady, 3000);

    const preloadCriticalAssets = async () => {
      setIsAssetWarmupReady(false);

      const criticalSources = [
        `/maps/minimaps/${selectedMap.id}.webp`,
        ...agentsOnCanvas.map((agent) => getAgentImgSrc(agent.name)),
        ...abilitiesOnCanvas
          .map((ability) => ABILITY_LOOKUP[ability.name]?.src)
          .filter((src): src is string => Boolean(src)),
        ...toolIconsOnCanvas.map((toolIcon) => `/tools/${toolIcon.name}.webp`),
      ];

      try {
        await preloadImagesWithTimeout(criticalSources, 1200);
      } catch (error) {
        console.error("Initial asset warmup failed", error);
      } finally {
        markWarmupReady();
      }
    };

    void preloadCriticalAssets();

    fallbackTimeout = window.setTimeout(markWarmupReady, 3000);

    return () => {
      isCancelled = true;
      window.clearTimeout(fallbackTimeout);
    };
  }, [
    isLoadingLobby,
    isErrorLobby,
    selectedMap.id,
    agentsOnCanvas,
    abilitiesOnCanvas,
    toolIconsOnCanvas,
  ]);

  useEffect(() => {
    if (!isAssetWarmupReady) return;

    const requestIdleCallback =
      window.requestIdleCallback ||
      ((cb: IdleRequestCallback, opts?: IdleRequestOptions) => {
        const timeout = opts?.timeout ?? 1;
        return window.setTimeout(() => {
          cb({
            didTimeout: false,
            timeRemaining: () => 0,
          });
        }, timeout) as unknown as number;
      });

    const cancelIdleCallback =
      window.cancelIdleCallback || ((id: number) => clearTimeout(id));

    const id = requestIdleCallback(
      () => {
        void preloadImages([
          ...ALL_MAP_IMAGE_SOURCES,
          ...ALL_AGENT_IMAGE_SOURCES,
          ...ALL_ABILITY_IMAGE_SOURCES,
        ]);
      },
      { timeout: 2000 },
    );

    return () => cancelIdleCallback(id);
  }, [isAssetWarmupReady]);

  useLayoutEffect(() => {
    let scaleReady = false;

    const markScaleReady = () => {
      if (scaleReady) return;
      scaleReady = true;
      setIsScaleReady(true);
    };

    const updateScale = () => {
      if (!divRef.current) return;

      const containerWidth = divRef.current.offsetWidth;
      const containerHeight = divRef.current.offsetHeight;

      if (containerWidth === 0 || containerHeight === 0) return;

      const scaleX = containerWidth / VIRTUAL_WIDTH;
      const scaleY = containerHeight / VIRTUAL_HEIGHT;
      const scale = Math.min(scaleX, scaleY);

      setStageScale(scale);
      markScaleReady();
    };

    const timeoutId = window.setTimeout(updateScale, 0);
    const fallbackTimeout = window.setTimeout(() => {
      if (scaleReady) return;
      if (!divRef.current) {
        setStageScale(1);
        markScaleReady();
        return;
      }

      const containerWidth = divRef.current.offsetWidth;
      const containerHeight = divRef.current.offsetHeight;
      if (containerWidth > 0 && containerHeight > 0) {
        updateScale();
      } else {
        setStageScale(1);
        markScaleReady();
      }
    }, 1500);

    if (typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver(updateScale);
      window.setTimeout(() => {
        if (divRef.current) {
          resizeObserver.observe(divRef.current);
        }
      }, 0);
      return () => {
        window.clearTimeout(timeoutId);
        window.clearTimeout(fallbackTimeout);
        resizeObserver.disconnect();
      };
    }

    window.addEventListener("resize", updateScale);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearTimeout(fallbackTimeout);
      window.removeEventListener("resize", updateScale);
    };
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
      <TourAutoAdvance />

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
          ) : !isScaleReady || !isAssetWarmupReady ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
                <p className="text-muted-foreground font-medium">
                  {!isScaleReady
                    ? "Initializing canvas..."
                    : "Preparing map assets..."}
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
