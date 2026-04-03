import { StepType } from "@reactour/tour";
import { TourStepContent } from "./tour-step-content";

export const tourSteps: StepType[] = [
  {
    selector: '[data-tour="map-canvas"]',
    content: (
      <TourStepContent
        title="Welcome to ValoMapper!"
        description="This is your strategy canvas where you can create tactical plans for VALORANT."
      />
    ),
  },
  {
    selector: '[data-tour="agent-brimstone"]',
    content: (
      <TourStepContent
        title="Select an Agent"
        description="Click on Brimstone to select the agent. You can then click on the canvas to place him or drag him directly onto the canvas in the next step."
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
        title="Place Agent on Canvas"
        description={`Now place Brimstone by clicking on the canvas or by dragging him from the sidebar and releasing over the map. You can drag agents to reposition them after placing. 
          
Delete an agent by dragging them to the trash can or press E while hovering over them.

When you're ready, click Next to continue.`}
      />
    ),
  },
  {
    selector: '[data-tour="brimstone-abilities-button"]',
    content: (
      <TourStepContent
        title="View Agent Abilities"
        description="Click the ⋮ button on Brimstone to see his abilities."
        isAutoAdvanceStep
      />
    ),
  },
  {
    selector: '[data-tour="brimstone-third-ability"]',
    content: (
      <TourStepContent
        title="Select an Ability"
        description="Click on this ability to select it. You can then click on the canvas to place it or drag it directly onto the map in the next step."
        isAutoAdvanceStep
      />
    ),
  },
  {
    selector: '[data-tour="map-canvas"]',
    content: (
      <TourStepContent
        title="Place Ability on Canvas"
        description={`Now place the ability by clicking on the canvas or by dragging it from the sidebar and releasing over the map. Just like agents, you can drag abilities to reposition them after placing.

Delete an ability by dragging them to the trash can or press E while hovering over them.

When you're ready, click Next to continue.`}
      />
    ),
  },

  {
    selector: '[data-tour="map-selector"]',
    content: (
      <TourStepContent
        title="Map Selection"
        description="Click this button to select from all VALORANT maps to plan your strategies. You can explore the map options after this tour."
      />
    ),
  },
  {
    selector: '[data-tour="map-rotation"]',
    content: (
      <TourStepContent
        title="Map Rotation"
        description="Click this button to rotate the side of the map and choose between attack and defense."
      />
    ),
  },
  {
    selector: '[data-tour="phases"]',
    content: (
      <TourStepContent
        title="Phases"
        description={`Build your strategy step by step using phases. Each phase can have the same agents and abilities placed at different places to represent different steps of your strategy. 
          
          Use keyboard shortcuts A and D to quickly navigate between phases.`}
      />
    ),
    position: "right",
  },
  {
    selector: '[data-tour="tools-section"]',
    content: (
      <TourStepContent
        title="Tools"
        description={`Use these tools to draw lines, add text, shapes and more to your strategy as needed. 
        
Feel free to experiment after this tour!`}
      />
    ),
    position: "right",
  },
  {
    selector: '[data-tour="save-strategy"]',
    content: (
      <TourStepContent
        title="Save Your Strategy"
        description={`Save your strategies so you can come back to them anytime. Keep everything organized with folders. 
        
Creating an account is required to save strategies.`}
      />
    ),
    position: "right",
  },
  {
    selector: '[data-tour="icons-section"]',
    content: (
      <TourStepContent
        title="Icons"
        description={`Add icons such as the Spike or weapons.

Drag icons from the sidebar and drop them onto the map like agents and abilities. 

You can also click on the icon and it will be placed on the map.`}
      />
    ),
    position: "right",
  },
];
