import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PrivacyPolicy } from "@/components/legal/privacy-policy";
import { TermsOfService } from "@/components/legal/terms-of-service";
import { Shortcuts } from "./shortcuts";

export const HelpTab = () => {
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
        ValoMapper is not endorsed by Riot Games and is not affiliated with Riot Games in any way. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc. \n\n",
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
        You can also save lobbies to your account to easily access them later and organize them into folders. Saved lobbies won't be deleted during routine cleanups.\n\n\
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
        valomapper@gmail.com",
    },
  ];

  return (
    <Tabs
      orientation="vertical"
      defaultValue={tabs[0].value}
      className="flex flex-row gap-4"
    >
      <TabsList className="shrink-0 flex flex-col h-auto w-48 p-0 bg-background space-y-1">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="w-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground justify-start px-3 py-1.5"
          >
            {tab.name}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="flex-1 h-[400px] border rounded-md">
        {tabs.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className="mt-0 h-full"
          >
            <ScrollArea className="h-full">
              <div className="p-4">
                <h2 className="text-2xl font-bold text-muted-foreground text-center mb-4">
                  {tab.name}
                </h2>
                <div className="font-medium text-muted-foreground">
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
