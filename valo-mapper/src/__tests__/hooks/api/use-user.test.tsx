import { renderHook, waitFor } from "@testing-library/react";
import { useUser } from "@/hooks/api/use-user";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { User } from "firebase/auth";

jest.mock("@/hooks/use-firebase-auth");

const mockUseFirebaseAuth = useFirebaseAuth as jest.MockedFunction<
  typeof useFirebaseAuth
>;

global.fetch = jest.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 3,
        retryDelay: 10,
      },
    },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "TestQueryClientWrapper";
  return Wrapper;
};

describe("useUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should return loading state when auth is loading", async () => {
    mockUseFirebaseAuth.mockReturnValue({
      user: null,
      loading: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      logout: jest.fn(),
      getIdToken: jest.fn(),
    });

    const { result } = renderHook(() => useUser(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it("should not fetch user data when firebase user is not available", async () => {
    mockUseFirebaseAuth.mockReturnValue({
      user: null,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      logout: jest.fn(),
      getIdToken: jest.fn().mockResolvedValue(null),
    });

    const { result } = renderHook(() => useUser(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should fetch user data when firebase user is available", async () => {
    const mockUser = { uid: "123", email: "test@example.com" } as User;
    const mockUserData = {
      id: "123",
      name: "Test User",
      email: "test@example.com",
    };
    const mockToken = "mock-token";

    mockUseFirebaseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      logout: jest.fn(),
      getIdToken: jest.fn().mockResolvedValue(mockToken),
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockUserData),
    });

    const { result } = renderHook(() => useUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockUserData);
    expect(global.fetch).toHaveBeenCalledWith("/api/users/me", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mockToken}`,
      },
    });
  });

  it("should throw error when no ID token is available", async () => {
    const mockUser = { uid: "123", email: "test@example.com" } as User;

    mockUseFirebaseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      logout: jest.fn(),
      getIdToken: jest.fn().mockResolvedValue(null),
    });

    const { result } = renderHook(() => useUser(), {
      wrapper: createWrapper(),
    });

    await jest.advanceTimersByTimeAsync(10000);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should handle API errors", async () => {
    const mockUser = { uid: "123", email: "test@example.com" } as User;
    const mockToken = "mock-token";

    mockUseFirebaseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      logout: jest.fn(),
      getIdToken: jest.fn().mockResolvedValue(mockToken),
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useUser(), {
      wrapper: createWrapper(),
    });

    await jest.advanceTimersByTimeAsync(10000);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it("should combine auth loading and query loading states", async () => {
    const mockUser = { uid: "123", email: "test@example.com" } as User;
    const mockToken = "mock-token";

    const { rerender } = renderHook(() => useUser(), {
      wrapper: createWrapper(),
    });

    mockUseFirebaseAuth.mockReturnValue({
      user: null,
      loading: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      logout: jest.fn(),
      getIdToken: jest.fn().mockResolvedValue(mockToken),
    });

    rerender();

    const { result } = renderHook(() => useUser(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    mockUseFirebaseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      logout: jest.fn(),
      getIdToken: jest.fn().mockResolvedValue(mockToken),
    });

    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: () => Promise.resolve({ id: "123", name: "Test User" }),
              }),
            100
          )
        )
    );

    const { result: result2 } = renderHook(() => useUser(), {
      wrapper: createWrapper(),
    });

    expect(result2.current.isLoading).toBe(true);
  });
});
