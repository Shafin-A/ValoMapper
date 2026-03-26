export const TEMP_DRAG_ID = "temp-drag-id";

export const SIDEBAR_WIDTH = 320;
export const SCALE_FACTOR = 1.25;
export const MAP_SIZE = 1000;
export const MAX_ZOOM_SCALE = 4;
export const MIN_ZOOM_SCALE = 1;

export const VIRTUAL_WIDTH = 2560;
export const VIRTUAL_HEIGHT = 1440;

export const CONTEXT_MENU_DUPLICATE_OFFSET = 20;

export const FREE_STRATEGY_LIMIT = 3;
export const STRATEGY_CLEANUP_GRACE_PERIOD_DAYS = 14;

export const ALLOWED_IMAGE_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

export const IMAGE_UPLOAD_ACCEPT_ATTR =
  "image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp";

export const ROLE_ICONS: Record<string, string> = {
  Controller: "/roles/controller.png",
  Duelist: "/roles/duelist.png",
  Initiator: "/roles/initiator.png",
  Sentinel: "/roles/sentinel.png",
};

export const PIXELS_PER_METER = 122 / 15;

export const AUTOSAVE_IDLE_THRESHOLD_MS = 3 * 1000;
export const AUTOSAVE_INTERVAL_MS = 1 * 1000;

export const LANDING_MESSAGES = [
  "Design strategies that win rounds",
  "Coordinate executes with pixel-perfect precision",
  "Share tactics that dominate ranked",
] as const;

export const WEAPONS = {
  sidearms: [
    { name: "classic", width: 188 / 5, height: 128 / 5 },
    { name: "shorty", width: 308 / 6, height: 100 / 6 },
    { name: "frenzy", width: 168 / 5, height: 128 / 5 },
    { name: "ghost", width: 300 / 6, height: 100 / 6 },
    { name: "bandit", width: 256 / 6, height: 140 / 6 },
    { name: "sheriff", width: 248 / 5, height: 128 / 5 },
    { name: "knife", width: 100 / 2, height: 32 / 2 },
  ],
  smgs: [
    { name: "stinger", width: 328 / 5, height: 128 / 5 },
    { name: "spectre", width: 352 / 5, height: 128 / 5 },
  ],
  shotguns: [
    { name: "bucky", width: 508 / 7, height: 100 / 7 },
    { name: "judge", width: 412 / 7, height: 128 / 7 },
  ],
  rifles: [
    { name: "bulldog", width: 400 / 7, height: 124 / 7 },
    { name: "guardian", width: 508 / 7, height: 108 / 7 },
    { name: "phantom", width: 508 / 7, height: 120 / 7 },
    { name: "vandal", width: 420 / 7, height: 128 / 7 },
  ],
  snipers: [
    { name: "marshal", width: 508 / 7, height: 92 / 7 },
    { name: "outlaw", width: 512 / 7, height: 108 / 7 },
    { name: "operator", width: 504 / 7, height: 104 / 7 },
  ],
  machineGuns: [
    { name: "ares", width: 484 / 7, height: 100 / 7 },
    { name: "odin", width: 444 / 7, height: 124 / 7 },
  ],
};

export const VISION_CONE_ITEMS = [
  {
    action: "vision_cone_30",
    name: "Vision Cone 30",
    icon: "cone-slice-30",
    tooltip: "30°",
  },
  {
    action: "vision_cone_60",
    name: "Vision Cone 60",
    icon: "cone-slice-60",
    tooltip: "60°",
  },
  {
    action: "vision_cone_90",
    name: "Vision Cone 90",
    icon: "cone-slice-90",
    tooltip: "90°",
  },
];
