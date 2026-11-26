import { act, renderHook, waitFor } from "@testing-library/react";

import { useUser } from "@/hooks/api/use-user";
import { useFavoriteAgents } from "@/hooks/use-favorite-agents";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import type { User } from "@/lib/types";

jest.mock("@/hooks/use-firebase-auth");
jest.mock("@/hooks/api/use-user");

const mockUseFirebaseAuth = useFirebaseAuth as jest.MockedFunction<
  typeof useFirebaseAuth
>;
const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;

const USER_UID = "user-1";
const userKey = (lobbyCode: string) =>
  `valomapper:favorite-agents:${lobbyCode}:${USER_UID}`;
const guestKey = (lobbyCode: string) =>
  `valomapper:favorite-agents:${lobbyCode}:guest`;

const setAuth = (signedIn: boolean) => {
  mockUseFirebaseAuth.mockReturnValue({
    user: signedIn ? ({ uid: USER_UID } as never) : null,
    loading: false,
    signIn: jest.fn(),
    signUp: jest.fn(),
    logout: jest.fn(),
    getIdToken: jest.fn(),
  });
};

const setProfile = (favoriteAgents: string[] | undefined) => {
  mockUseUser.mockReturnValue({
    data: favoriteAgents
      ? ({ favoriteAgents } as User)
      : undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  } as ReturnType<typeof useUser>);
};

describe("useFavoriteAgents", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    setAuth(true);
    setProfile([]);
  });

  it("seeds a lobby from the profile defaults", async () => {
    setProfile(["Jett", "Sage"]);

    const { result } = renderHook(() => useFavoriteAgents("abcd"));

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(Array.from(result.current.favoriteAgents).sort()).toEqual([
      "Jett",
      "Sage",
    ]);
    await waitFor(() =>
      expect(window.localStorage.getItem(userKey("ABCD"))).not.toBeNull(),
    );
    expect(
      JSON.parse(window.localStorage.getItem(userKey("ABCD")) ?? "[]"),
    ).toEqual(["Jett", "Sage"]);
  });

  it("keeps existing lobby favorites over profile defaults", async () => {
    setProfile(["Jett"]);
    window.localStorage.setItem(userKey("ABCD"), JSON.stringify(["Raze"]));

    const { result } = renderHook(() => useFavoriteAgents("ABCD"));

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(Array.from(result.current.favoriteAgents)).toEqual(["Raze"]);
    expect(
      JSON.parse(window.localStorage.getItem(userKey("ABCD")) ?? "[]"),
    ).toEqual(["Raze"]);
  });

  it("merges a guest list into the account list on login", async () => {
    window.localStorage.setItem(userKey("ABCD"), JSON.stringify(["Sage"]));
    window.localStorage.setItem(guestKey("ABCD"), JSON.stringify(["Jett"]));

    const { result } = renderHook(() => useFavoriteAgents("ABCD"));

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(Array.from(result.current.favoriteAgents).sort()).toEqual([
      "Jett",
      "Sage",
    ]);
    expect(window.localStorage.getItem(guestKey("ABCD"))).toBeNull();
    expect(
      JSON.parse(window.localStorage.getItem(userKey("ABCD")) ?? "[]"),
    ).toEqual(["Jett", "Sage"]);
  });

  it("persists toggles", async () => {
    setProfile(["Jett"]);

    const { result } = renderHook(() => useFavoriteAgents("ABCD"));
    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => result.current.toggleFavorite("Raze"));

    await waitFor(() =>
      expect(
        JSON.parse(window.localStorage.getItem(userKey("ABCD")) ?? "[]"),
      ).toEqual(["Jett", "Raze"]),
    );
  });

  it("keeps guest favorites in the guest storage key", async () => {
    setAuth(false);

    const { result } = renderHook(() => useFavoriteAgents("ABCD"));
    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => result.current.toggleFavorite("Jett"));

    await waitFor(() =>
      expect(
        JSON.parse(window.localStorage.getItem(guestKey("ABCD")) ?? "[]"),
      ).toEqual(["Jett"]),
    );
    expect(window.localStorage.getItem(userKey("ABCD"))).toBeNull();
  });

  it("does nothing without a lobby code", () => {
    const { result } = renderHook(() => useFavoriteAgents());

    expect(result.current.isReady).toBe(false);
    expect(result.current.favoriteAgents.size).toBe(0);
  });
});
