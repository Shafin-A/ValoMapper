"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PrivacyPolicy } from "@/components/legal/privacy-policy";
import { TermsOfService } from "@/components/legal/terms-of-service";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslations } from "next-intl";
import { Shortcuts } from "./shortcuts";

export const HelpTab = () => {
  const isMobile = useIsMobile();
  const t = useTranslations("help.tabs");

  const tabs = [
    {
      name: t("about"),
      value: "about",
      type: "text",
      content: t("aboutContent"),
    },
    {
      name: t("keyboardShortcuts"),
      value: "keyboard_shortcuts",
      type: "component",
    },
    {
      name: t("lobbies"),
      value: "lobbies",
      type: "text",
      content: t("lobbiesContent"),
    },
    {
      name: t("privacyPolicy"),
      value: "privacy_policy",
      type: "component",
    },
    {
      name: t("termsOfService"),
      value: "terms_of_service",
      type: "component",
    },
    {
      name: t("contact"),
      value: "contact",
      type: "text",
      content: t("contactContent"),
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
