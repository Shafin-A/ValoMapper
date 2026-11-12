import { electFullSyncSender } from "@/lib/ws-sync-election";
import type { UserPresence } from "@/lib/websocket-types";

const presence = (id: string): UserPresence => ({
  id,
  username: id,
  color: "#ffffff",
});

describe("electFullSyncSender", () => {
  it("picks the lowest id among users that were already present", () => {
    const users = [presence("c"), presence("new-user"), presence("b")];

    expect(electFullSyncSender(users, ["c", "b"])).toBe("b");
  });

  it("ignores users that just joined", () => {
    expect(electFullSyncSender([presence("aaa"), presence("zzz")], ["zzz"])).toBe(
      "zzz",
    );
  });

  it("falls back to the previous ids when the lists do not overlap", () => {
    expect(electFullSyncSender([presence("x")], ["d", "b"])).toBe("b");
  });

  it("returns null when no client was present before", () => {
    expect(electFullSyncSender([presence("a")], [])).toBeNull();
  });
});
