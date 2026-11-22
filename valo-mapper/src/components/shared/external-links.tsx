"use client";

import { useState, type ReactNode } from "react";
import { Coffee, Menu } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DiscordIcon } from "@/components/shared/discord-icon";
import { DISCORD_INVITE_URL } from "@/lib/consts";
import { useTranslations } from "next-intl";

interface ExternalLink {
  icon: ReactNode;
  href: string;
  tooltip: string;
  ariaLabel: string;
}

interface ExternalLinksProps {
  links?: ExternalLink[];
  className?: string;
}

export const ExternalLinks = ({
  links,
  className = "",
}: ExternalLinksProps) => {
  const t = useTranslations("common");
  const [isExpanded, setIsExpanded] = useState(false);

  const defaultLinks: ExternalLink[] = [
    {
      icon: <Coffee className="size-6" />,
      href: "https://ko-fi.com/5h4fin",
      tooltip: t("supportOnKofi"),
      ariaLabel: t("supportOnKofi"),
    },
    {
      icon: <DiscordIcon className="size-6" />,
      href: DISCORD_INVITE_URL,
      tooltip: t("joinDiscord"),
      ariaLabel: t("joinDiscord"),
    },
  ];
  const resolvedLinks = links ?? defaultLinks;

  return (
    <div
      className={`fixed bottom-8 right-8 z-50 flex flex-row-reverse gap-4 ${className}`}
    >
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        variant="default"
        size="icon"
        className={`rounded-full shadow-lg transition-transform duration-300 size-12 cursor-pointer ${
          isExpanded ? "translate-y-[-60px]" : ""
        }`}
        aria-label={
          isExpanded ? t("hideExternalLinks") : t("showExternalLinks")
        }
      >
        <Menu className="size-6" />
      </Button>
      {resolvedLinks.map((link, index) => (
        <div
          key={index}
          className={`transition-all duration-300 ${
            isExpanded
              ? "translate-x-0 opacity-100 pointer-events-auto"
              : "translate-x-full opacity-0 pointer-events-none"
          }`}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors block"
                aria-label={link.ariaLabel}
              >
                {link.icon}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">{link.tooltip}</TooltipContent>
          </Tooltip>
        </div>
      ))}
    </div>
  );
};
