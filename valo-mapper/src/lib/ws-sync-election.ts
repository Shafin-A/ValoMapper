import type { UserPresence } from "@/lib/websocket-types";

/**
 * Picks one already-present client to broadcast FULL_SYNC on join. All clients
 * see the same user list, so the lowest id is a deterministic election.
 */
export const electFullSyncSender = (
  users: UserPresence[],
  previousUserIds: Iterable<string>,
): string | null => {
  const previousIds = new Set(previousUserIds);

  const existingIds = users
    .map((user) => user.id)
    .filter((id) => previousIds.has(id));

  const candidateIds = existingIds.length > 0 ? existingIds : [...previousIds];

  if (candidateIds.length === 0) {
    return null;
  }

  return candidateIds.reduce((lowest, id) => (id < lowest ? id : lowest));
};
