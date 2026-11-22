import { StepType } from "@reactour/tour";
import { TourStepContent } from "./tour-step-content";

type TourTranslator = (key: string) => string;

export const getTourSteps = (t: TourTranslator): StepType[] => [
  {
    selector: '[data-tour="map-canvas"]',
    content: (
      <TourStepContent
        title={t("welcomeTitle")}
        description={t("welcomeDescription")}
      />
    ),
  },
  {
    selector: '[data-tour="agent-brimstone"]',
    content: (
      <TourStepContent
        title={t("agentTitle")}
        description={t("agentDescription")}
        isAutoAdvanceStep
      />
    ),
    action: (node: Element | null) => {
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
  },
  {
    selector: '[data-tour="map-canvas"]',
    content: (
      <TourStepContent
        title={t("placeTitle")}
        description={t("placeDescription")}
      />
    ),
  },
  {
    selector: '[data-tour="map-selector"]',
    content: (
      <TourStepContent title={t("mapTitle")} description={t("mapDescription")} />
    ),
  },
  {
    selector: '[data-tour="map-rotation"]',
    content: (
      <TourStepContent
        title={t("rotationTitle")}
        description={t("rotationDescription")}
      />
    ),
  },
  {
    selector: '[data-tour="phases"]',
    content: (
      <TourStepContent
        title={t("phasesTitle")}
        description={t("phasesDescription")}
      />
    ),
    position: "right",
  },
  {
    selector: '[data-tour="tools-section"]',
    content: (
      <TourStepContent
        title={t("toolsTitle")}
        description={t("toolsDescription")}
      />
    ),
    position: "right",
  },
  {
    selector: '[data-tour="save-strategy"]',
    content: (
      <TourStepContent
        title={t("saveTitle")}
        description={t("saveDescription")}
      />
    ),
    position: "right",
  },
  {
    selector: '[data-tour="icons-section"]',
    content: (
      <TourStepContent
        title={t("iconsTitle")}
        description={t("iconsDescription")}
      />
    ),
    position: "right",
  },
];
