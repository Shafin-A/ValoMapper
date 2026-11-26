"use client";

import { Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useValorantTerms } from "@/contexts/valorant-terms-context";
import { AGENTS } from "@/lib/consts";
import {
  getLocalizedAgentName,
  getLocalizedRoleName,
} from "@/lib/i18n/valorant-terms";

interface ProfileFavoriteAgentsSectionProps {
  favoriteAgents: string[];
  isSaving: boolean;
  onSave: (agents: string[]) => void;
}

export const ProfileFavoriteAgentsSection = ({
  favoriteAgents,
  isSaving,
  onSave,
}: ProfileFavoriteAgentsSectionProps) => {
  const t = useTranslations("profile");
  const valorantTerms = useValorantTerms();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(favoriteAgents),
  );
  const [query, setQuery] = useState("");

  useEffect(() => {
    setSelected((previous) => {
      const previousKey = Array.from(previous).sort().join("|");
      const nextKey = [...favoriteAgents].sort().join("|");
      return previousKey === nextKey ? previous : new Set(favoriteAgents);
    });
  }, [favoriteAgents]);

  const normalizedSelected = useMemo(
    () => Array.from(selected).sort(),
    [selected],
  );
  const normalizedInitial = useMemo(
    () => [...favoriteAgents].sort(),
    [favoriteAgents],
  );
  const isDirty = normalizedSelected.join("|") !== normalizedInitial.join("|");

  const filteredAgents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return AGENTS;
    }

    return AGENTS.filter((agent) => {
      const name = getLocalizedAgentName(valorantTerms, agent.name);
      const role = getLocalizedRoleName(valorantTerms, agent.role);
      return [name, agent.name, role].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    });
  }, [query, valorantTerms]);

  const toggleAgent = (agentName: string) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(agentName)) {
        next.delete(agentName);
      } else {
        next.add(agentName);
      }
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">{t("favoriteAgentsTitle")}</h2>
        <p className="text-xs text-muted-foreground">
          {t("favoriteAgentsDescription")}
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("favoriteAgentsSearch")}
          aria-label={t("favoriteAgentsSearch")}
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-64 rounded-md border" type="auto">
        {filteredAgents.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">
            {t("favoriteAgentsEmpty")}
          </p>
        ) : (
          <div className="space-y-1 p-2">
            {filteredAgents.map((agent) => {
              const name = getLocalizedAgentName(valorantTerms, agent.name);
              const role = getLocalizedRoleName(valorantTerms, agent.role);
              return (
                <label
                  key={agent.name}
                  className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-accent"
                >
                  <Checkbox
                    checked={selected.has(agent.name)}
                    onCheckedChange={() => toggleAgent(agent.name)}
                    aria-label={name}
                  />
                  <span className="min-w-0 flex-1 truncate">{name}</span>
                  <span className="text-xs text-muted-foreground">{role}</span>
                </label>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => onSave(normalizedSelected)}
          disabled={!isDirty || isSaving}
        >
          {isSaving && <Loader2 className="animate-spin" />}
          {t("saveFavoriteAgents")}
        </Button>
      </div>
    </div>
  );
};
