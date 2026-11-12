"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PrivacyPolicy } from "@/components/legal/privacy-policy";
import { TermsOfService } from "@/components/legal/terms-of-service";
import { useIsMobile } from "@/hooks/use-mobile";
import { Shortcuts } from "./shortcuts";

export const HelpTab = () => {
  const isMobile = useIsMobile();

  const tabs = [
    {
      name: "About",
      value: "about",
      type: "text",
      content:
        "ValoMapper is a website that allows you to create and share strategies and executes for VALORANT.\n\n\
        We give you a clean canvas to map out setups, routes, lineups, and site executes without dealing with cluttered screenshots or scattered notes. \n\n\
        It's designed to be simple and practical. Draw your plan, share it, and refer to it in game. \
        You can even create folders to organize your strategies and easily switch between them. \n\n\
        Whether you're coordinating with a team or organizing your own ideas, ValoMapper keeps everything in one place.\n\n\
        ValoMapper isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc. \n\n",
    },
    {
      name: "Keyboard Shortcuts",
      value: "keyboard_shortcuts",
      type: "component",
    },
    {
      name: "Lobbies",
      value: "lobbies",
      type: "text",
      content:
        "Each lobby is a shareable strategy board with its own unique URL.\n\n\
        You can share the URL or code with teammates or friends. Anyone with the lobby link can view and edit the strategies inside.\n\n\
        Lobby canvases sync automatically after every change is made. This keeps your current layout, drawings, and notes preserved across page refreshes. \n\n\
        You can also save lobbies to your account to easily access them later and organize them into folders as strategies. Saved lobbies won't be deleted during routine cleanups.\n\n\
        Free tier users are limited to 1 saved lobby per account with no folder organization. Premium users can have unlimited saved lobbies and folder organization.\n\n\
        Unsaved or 'unclaimed' lobbies (lobbies without an active account owner) are subject to automatic cleanup approximately every 12 hours, so make sure to save any lobbies you want to keep!\n\n",
    },
    {
      name: "Privacy Policy",
      value: "privacy_policy",
      type: "component",
    },
    {
      name: "Terms of Service",
      value: "terms_of_service",
      type: "component",
    },
    {
      name: "Contact",
      value: "contact",
      type: "text",
      content:
        "If you have questions, concerns, or requests please contact us at: \n\n\
        valomappercontact@gmail.com",
    },
  ];

  return (
    <Tabs
      orientation={isMobile ? "horizontal" : "vertical"}
      defaultValue={tabs[0].value}
      className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:gap-4"
    >
      <TabsList className="flex h-auto w-full min-w-0 shrink-0 flex-wrap justify-start gap-1 rounded-lg bg-background p-0 sm:w-48 sm:flex-col sm:justify-start sm:gap-0 sm:space-y-1">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="h-10 flex-none shrink-0 justify-start whitespace-nowrap px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground sm:h-auto sm:w-full sm:flex-1"
          >
            {tab.name}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="min-h-0 min-w-0 flex-1 rounded-md border">
        {tabs.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className="mt-0 h-full min-h-0"
          >
            <ScrollArea className="h-full">
              <div className="p-3 sm:p-4">
                <h2 className="mb-3 text-xl font-bold text-muted-foreground text-center sm:mb-4 sm:text-2xl">
                  {tab.name}
                </h2>
                <div className="font-medium text-muted-foreground wrap-break-word">
                  {tab.type === "text" ? (
                    <div className="whitespace-pre-line">{tab.content}</div>
                  ) : tab.value === "privacy_policy" ? (
                    <PrivacyPolicy />
                  ) : tab.value === "terms_of_service" ? (
                    <TermsOfService />
                  ) : tab.value === "keyboard_shortcuts" ? (
                    <Shortcuts />
                  ) : null}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
};
