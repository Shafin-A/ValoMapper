"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useUser } from "@/hooks/api/use-user";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { AGENTS } from "@/lib/consts";

const STORAGE_PREFIX = "valomapper:favorite-agents";
const AGENT_NAMES = new Set(AGENTS.map((agent) => agent.name));

const readStoredAgents = (key: string): string[] | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }

    return mergeFavoriteAgents(parsed);
  } catch {
    return null;
  }
};

const writeStoredAgents = (key: string, agents: string[]) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(agents));
  } catch {
    // Storage can be unavailable in private mode or when the quota is full.
  }
};

const removeStoredAgents = (key: string) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
};

const mergeFavoriteAgents = (agents: unknown[]): string[] => {
  const unique = new Set<string>();

  for (const value of agents) {
    if (typeof value !== "string") {
      continue;
    }
    const name = value.trim();
    if (AGENT_NAMES.has(name)) {
      unique.add(name);
    }
  }

  return Array.from(unique).sort();
};

export const useFavoriteAgents = (lobbyCode?: string) => {
  const { user: firebaseUser, loading: authLoading } = useFirebaseAuth();
  const normalizedLobbyCode = lobbyCode?.trim().toUpperCase();
  const { data: profile, isLoading: profileLoading } = useUser(
    Boolean(normalizedLobbyCode),
  );
  const [favoriteAgents, setFavoriteAgents] = useState<Set<string>>(
    () => new Set(),
  );
  const [isReady, setIsReady] = useState(false);

  const isGuest = !firebaseUser;
  const identity = firebaseUser?.uid ?? "guest";
  const storageKey = normalizedLobbyCode
    ? `${STORAGE_PREFIX}:${normalizedLobbyCode}:${identity}`
    : null;
  const guestKey = normalizedLobbyCode
    ? `${STORAGE_PREFIX}:${normalizedLobbyCode}:guest`
    : null;
  const profileAgents = profile?.favoriteAgents;

  useEffect(() => {
    if (!normalizedLobbyCode || !storageKey) {
      setFavoriteAgents(new Set());
      setIsReady(false);
      return;
    }

    if (authLoading) {
      setFavoriteAgents(new Set());
      setIsReady(false);
      return;
    }

    const existing = readStoredAgents(storageKey);

    if (isGuest) {
      setFavoriteAgents(new Set(existing ?? []));
      setIsReady(true);
      return;
    }

    if (profileLoading) {
      const guestAgents = guestKey ? readStoredAgents(guestKey) : null;
      const fallback = existing ?? guestAgents ?? [];
      setFavoriteAgents(new Set(fallback));
      setIsReady(Boolean(existing || guestAgents));
      return;
    }

    const guestAgents = guestKey ? readStoredAgents(guestKey) : null;

    if (existing) {
      const merged = guestAgents
        ? mergeFavoriteAgents([...existing, ...guestAgents])
        : existing;
      if (guestAgents) {
        writeStoredAgents(storageKey, merged);
        removeStoredAgents(guestKey!);
      }
      setFavoriteAgents(new Set(merged));
      setIsReady(true);
      return;
    }

    if (guestAgents) {
      writeStoredAgents(storageKey, guestAgents);
      removeStoredAgents(guestKey!);
      setFavoriteAgents(new Set(guestAgents));
      setIsReady(true);
      return;
    }

    const defaults = mergeFavoriteAgents(profileAgents ?? []);
    writeStoredAgents(storageKey, defaults);
    setFavoriteAgents(new Set(defaults));
    setIsReady(true);
  }, [
    authLoading,
    guestKey,
    isGuest,
    normalizedLobbyCode,
    profileAgents,
    profileLoading,
    storageKey,
  ]);

  useEffect(() => {
    if (!isReady || !storageKey) {
      return;
    }

    writeStoredAgents(storageKey, Array.from(favoriteAgents).sort());
  }, [favoriteAgents, isReady, storageKey]);

  useEffect(() => {
    if (!storageKey) {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKey) {
        setFavoriteAgents(new Set(readStoredAgents(storageKey) ?? []));
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [storageKey]);

  const toggleFavorite = useCallback(
    (agentName: string) => {
      if (!storageKey || !isReady || !AGENT_NAMES.has(agentName)) {
        return;
      }

      setFavoriteAgents((previous) => {
        const next = new Set(previous);
        if (next.has(agentName)) {
          next.delete(agentName);
        } else {
          next.add(agentName);
        }
        return next;
      });
    },
    [isReady, storageKey],
  );

  const favorites = useMemo(
    () => new Set(favoriteAgents),
    [favoriteAgents],
  );

  return {
    favoriteAgents: favorites,
    isReady,
    toggleFavorite,
  };
};
