import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { toast } from "sonner";
import { apiFetch, apiFetchWithAuth } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { useAcceptStackInvite } from "@/hooks/api/use-accept-stack-invite";
import { useCancelSubscription } from "@/hooks/api/use-cancel-subscription";
import { useCreateCheckoutSession } from "@/hooks/api/use-create-checkout-session";
import { useCreateFolder } from "@/hooks/api/use-create-folder";
import { useCreateStrategy } from "@/hooks/api/use-create-strategy";
import { useCreateUser } from "@/hooks/api/use-create-user";
import { useDeclineStackInvite } from "@/hooks/api/use-decline-stack-invite";
import { useDeleteFolder } from "@/hooks/api/use-delete-folder";
import { useDeleteStrategy } from "@/hooks/api/use-delete-strategy";
import { useDeleteUser } from "@/hooks/api/use-delete-user";
import { useInviteStackMember } from "@/hooks/api/use-invite-stack-member";
import { useLeaveStack } from "@/hooks/api/use-leave-stack";
import { useRemoveStackMember } from "@/hooks/api/use-remove-stack-member";
import { useResumeSubscription } from "@/hooks/api/use-resume-subscription";
import { useUpdateFolder } from "@/hooks/api/use-update-folder";
import { useUpdateStrategy } from "@/hooks/api/use-update-strategy";
import { useUpdateUser } from "@/hooks/api/use-update-user";

jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  apiFetch: jest.fn(),
  apiFetchWithAuth: jest.fn(),
}));

jest.mock("@/hooks/use-firebase-auth");

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockApiFetch = jest.mocked(apiFetch);
const mockApiFetchWithAuth = jest.mocked(apiFetchWithAuth);
const mockUseFirebaseAuth = jest.mocked(useFirebaseAuth);
const mockToastSuccess = jest.mocked(toast.success);
const mockToastError = jest.mocked(toast.error);

const getIdToken = jest.fn().mockResolvedValue("id-token");

const renderMutation = <T,>(useHook: () => T) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "MutationTestWrapper";

  const { result } = renderHook(useHook, { wrapper: Wrapper });

  return { result, invalidateSpy };
};

type MutationResult = {
  mutate: (values: never) => void;
  mutateAsync: (values: never) => Promise<unknown>;
};

type SuccessCase = {
  name: string;
  useHook: () => MutationResult;
  invoke: (result: MutationResult) => Promise<unknown> | void;
  resolvedValue: unknown;
  api: {
    kind: "auth" | "plain";
    url: string;
    options: Record<string, unknown>;
  };
  successToast?: string;
  invalidates?: ReadonlyArray<readonly unknown[]>;
  errorToast?: string;
};

const successCases: SuccessCase[] = [
  {
    name: "creates a folder",
    useHook: useCreateFolder as never,
    invoke: (result) =>
      result.mutateAsync({
        name: "Lineups",
        parentFolderId: 2,
      } as never),
    resolvedValue: { id: 1, name: "Lineups" },
    api: {
      kind: "auth",
      url: "/api/folders",
      options: {
        method: "POST",
        body: JSON.stringify({ name: "Lineups", parentFolderId: 2 }),
      },
    },
    successToast: 'Folder "Lineups" created',
    invalidates: [queryKeys.folders],
    errorToast: "Something went wrong: boom",
  },
  {
    name: "updates a folder",
    useHook: useUpdateFolder as never,
    invoke: (result) =>
      result.mutate({ folderId: 3, name: "Retakes" } as never),
    resolvedValue: { id: 3, name: "Retakes" },
    api: {
      kind: "auth",
      url: "/api/folders/3",
      options: {
        method: "PATCH",
        body: JSON.stringify({ name: "Retakes" }),
      },
    },
    successToast: 'Folder "Retakes" updated',
    invalidates: [queryKeys.folders],
    errorToast: "Something went wrong: boom",
  },
  {
    name: "deletes a folder",
    useHook: useDeleteFolder as never,
    invoke: (result) => result.mutate({ folderId: 3 } as never),
    resolvedValue: null,
    api: {
      kind: "auth",
      url: "/api/folders/3",
      options: { method: "DELETE" },
    },
    successToast: "Folder deleted",
    invalidates: [queryKeys.folders],
    errorToast: "Something went wrong: boom",
  },
  {
    name: "creates a strategy",
    useHook: useCreateStrategy as never,
    invoke: (result) =>
      result.mutateAsync({
        name: "B Rush",
        lobbyCode: "ABCD",
        folderId: 4,
      } as never),
    resolvedValue: { id: 7, name: "B Rush" },
    api: {
      kind: "auth",
      url: "/api/strategies",
      options: {
        method: "POST",
        body: JSON.stringify({
          name: "B Rush",
          lobbyCode: "ABCD",
          folderId: 4,
        }),
      },
    },
    successToast: 'Strategy "B Rush" created',
    invalidates: [queryKeys.folders],
    errorToast: "Something went wrong: boom",
  },
  {
    name: "updates a strategy name",
    useHook: useUpdateStrategy as never,
    invoke: (result) =>
      result.mutate({ strategyId: 8, name: "Retake" } as never),
    resolvedValue: { id: 8, name: "Retake" },
    api: {
      kind: "auth",
      url: "/api/strategies/8",
      options: {
        method: "PATCH",
        body: JSON.stringify({ name: "Retake" }),
      },
    },
    successToast: 'Strategy "Retake" updated',
    invalidates: [queryKeys.folders],
    errorToast: "Something went wrong: boom",
  },
  {
    name: "deletes a strategy",
    useHook: useDeleteStrategy as never,
    invoke: (result) => result.mutate({ strategyId: 8 } as never),
    resolvedValue: null,
    api: {
      kind: "auth",
      url: "/api/strategies/8",
      options: { method: "DELETE" },
    },
    successToast: "Strategy deleted",
    invalidates: [queryKeys.folders],
    errorToast: "Something went wrong: boom",
  },
  {
    name: "creates a user",
    useHook: useCreateUser as never,
    invoke: (result) =>
      result.mutateAsync({
        idToken: "firebase-token",
        firebaseUid: "uid-1",
        name: "Player",
        email: "player@example.com",
      } as never),
    resolvedValue: { id: 1 },
    api: {
      kind: "plain",
      url: "/api/users",
      options: {
        method: "POST",
        token: "firebase-token",
        body: JSON.stringify({
          firebaseUid: "uid-1",
          name: "Player",
          email: "player@example.com",
        }),
      },
    },
    invalidates: [queryKeys.user],
  },
  {
    name: "updates the current user",
    useHook: useUpdateUser as never,
    invoke: (result) => result.mutateAsync({ name: "New Name" } as never),
    resolvedValue: { id: 1, name: "New Name" },
    api: {
      kind: "auth",
      url: "/api/users/me",
      options: { method: "PUT", body: JSON.stringify({ name: "New Name" }) },
    },
    successToast: "Profile updated",
    errorToast: "Something went wrong: boom",
  },
  {
    name: "deletes the current user",
    useHook: useDeleteUser as never,
    invoke: (result) => result.mutate(undefined as never),
    resolvedValue: null,
    api: {
      kind: "auth",
      url: "/api/users/me",
      options: { method: "DELETE" },
    },
    successToast: "User deleted",
    invalidates: [queryKeys.user],
    errorToast: "Something went wrong: boom",
  },
  {
    name: "cancels a subscription",
    useHook: useCancelSubscription as never,
    invoke: (result) => result.mutateAsync(undefined as never),
    resolvedValue: { subscriptionId: "sub_1", status: "active" },
    api: {
      kind: "auth",
      url: "/api/billing/cancel-subscription",
      options: { method: "POST" },
    },
    successToast: "Subscription will cancel at the end of the billing period",
    errorToast: "Something went wrong: boom",
  },
  {
    name: "resumes a subscription",
    useHook: useResumeSubscription as never,
    invoke: (result) => result.mutateAsync(undefined as never),
    resolvedValue: {
      subscriptionId: "sub_1",
      status: "active",
      cancelAtPeriodEnd: false,
    },
    api: {
      kind: "auth",
      url: "/api/billing/resume-subscription",
      options: { method: "POST" },
    },
    successToast: "Subscription will renew normally",
    errorToast: "Something went wrong: boom",
  },
  {
    name: "invites a stack member",
    useHook: useInviteStackMember as never,
    invoke: (result) => result.mutateAsync(" uid-1 " as never),
    resolvedValue: { id: 1 },
    api: {
      kind: "auth",
      url: "/api/billing/stack/invite",
      options: {
        method: "POST",
        body: JSON.stringify({ firebaseUid: "uid-1" }),
      },
    },
    successToast: "Invite sent",
    invalidates: [queryKeys.stackMembers],
    errorToast: "Something went wrong: boom",
  },
  {
    name: "removes a stack member",
    useHook: useRemoveStackMember as never,
    invoke: (result) => result.mutateAsync(4 as never),
    resolvedValue: null,
    api: {
      kind: "auth",
      url: "/api/billing/stack/members/4",
      options: { method: "DELETE" },
    },
    successToast: "Member removed",
    invalidates: [queryKeys.stackMembers],
    errorToast: "Something went wrong: boom",
  },
  {
    name: "accepts a stack invite",
    useHook: useAcceptStackInvite as never,
    invoke: (result) => result.mutateAsync(5 as never),
    resolvedValue: null,
    api: {
      kind: "auth",
      url: "/api/billing/stack/accept/5",
      options: { method: "POST" },
    },
    successToast: "Invite accepted",
    invalidates: [
      queryKeys.user,
      queryKeys.stackMembers,
      queryKeys.stackPendingInvites,
    ],
    errorToast: "Something went wrong: boom",
  },
  {
    name: "declines a stack invite",
    useHook: useDeclineStackInvite as never,
    invoke: (result) => result.mutateAsync(6 as never),
    resolvedValue: null,
    api: {
      kind: "auth",
      url: "/api/billing/stack/decline/6",
      options: { method: "POST" },
    },
    successToast: "Invite declined",
    invalidates: [
      queryKeys.user,
      queryKeys.stackMembers,
      queryKeys.stackPendingInvites,
    ],
    errorToast: "Something went wrong: boom",
  },
  {
    name: "leaves a stack",
    useHook: useLeaveStack as never,
    invoke: (result) => result.mutateAsync(undefined as never),
    resolvedValue: null,
    api: {
      kind: "auth",
      url: "/api/billing/stack/leave",
      options: { method: "DELETE" },
    },
    successToast: "Left Stack",
    invalidates: [
      queryKeys.user,
      queryKeys.stackMembers,
      queryKeys.stackPendingInvites,
    ],
    errorToast: "Something went wrong: boom",
  },
];

const expectApiCall = (api: SuccessCase["api"]) => {
  if (api.kind === "plain") {
    expect(mockApiFetch).toHaveBeenCalledWith(api.url, api.options);
  } else {
    expect(mockApiFetchWithAuth).toHaveBeenCalledWith(
      api.url,
      getIdToken,
      api.options,
    );
  }
};

describe("mutation hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getIdToken.mockResolvedValue("id-token");
    mockUseFirebaseAuth.mockReturnValue({
      user: { uid: "user-1" },
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      logout: jest.fn(),
      getIdToken,
    } as unknown as ReturnType<typeof useFirebaseAuth>);
  });

  it.each(successCases)("$name", async (testCase) => {
    mockApiFetch.mockResolvedValue(testCase.resolvedValue);
    mockApiFetchWithAuth.mockResolvedValue(testCase.resolvedValue);

    const { result, invalidateSpy } = renderMutation(testCase.useHook);

    await act(async () => {
      await testCase.invoke(result.current as unknown as MutationResult);
    });

    expectApiCall(testCase.api);

    if (testCase.successToast) {
      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith(testCase.successToast);
      });
    }

    testCase.invalidates?.forEach((queryKey) => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey });
    });
  });

  it.each(successCases.filter((testCase) => testCase.errorToast))(
    "$name surfaces the error",
    async (testCase) => {
      mockApiFetch.mockRejectedValue(new Error("boom"));
      mockApiFetchWithAuth.mockRejectedValue(new Error("boom"));

      const { result } = renderMutation(testCase.useHook);

      await act(async () => {
        try {
          await testCase.invoke(result.current as unknown as MutationResult);
        } catch {
          // mutateAsync rejects on failure; the hook still reports the error.
        }
      });

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(testCase.errorToast);
      });
      expect(mockToastSuccess).not.toHaveBeenCalled();
    },
  );

  it("updates a strategy folder explicitly, including clearing it", async () => {
    mockApiFetchWithAuth.mockResolvedValue({ id: 8, name: "Retake" });

    const { result } = renderMutation(useUpdateStrategy);

    await act(async () => {
      result.current.mutate({
        strategyId: 8,
        folderId: null,
        includeFolderId: true,
      });
    });

    await waitFor(() => {
      expect(mockApiFetchWithAuth).toHaveBeenCalledWith(
        "/api/strategies/8",
        getIdToken,
        {
          method: "PATCH",
          body: JSON.stringify({ folderId: null }),
        },
      );
    });
  });

  it("moves a strategy into a folder", async () => {
    mockApiFetchWithAuth.mockResolvedValue({ id: 8, name: "Retake" });

    const { result } = renderMutation(useUpdateStrategy);

    await act(async () => {
      result.current.mutate({
        strategyId: 8,
        folderId: 12,
        includeFolderId: true,
      });
    });

    await waitFor(() => {
      expect(mockApiFetchWithAuth).toHaveBeenCalledWith(
        "/api/strategies/8",
        getIdToken,
        {
          method: "PATCH",
          body: JSON.stringify({ folderId: 12 }),
        },
      );
    });
  });
});

describe("useCreateCheckoutSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFirebaseAuth.mockReturnValue({
      user: { uid: "user-1" },
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      logout: jest.fn(),
      getIdToken,
    } as unknown as ReturnType<typeof useFirebaseAuth>);
  });

  it("starts a checkout session without a body by default", async () => {
    mockApiFetchWithAuth.mockResolvedValue({
      sessionId: "cs_1",
      url: "https://checkout.example/session",
    });

    const { result } = renderMutation(useCreateCheckoutSession);

    await act(async () => {
      await result.current.mutateAsync({});
    });

    expect(mockApiFetchWithAuth).toHaveBeenCalledWith(
      "/api/billing/checkout-session",
      getIdToken,
      { method: "POST" },
    );
  });

  it("forwards plan, return path, and trial options", async () => {
    mockApiFetchWithAuth.mockResolvedValue({
      sessionId: "cs_2",
      url: "https://checkout.example/trial",
    });

    const { result } = renderMutation(useCreateCheckoutSession);

    await act(async () => {
      await result.current.mutateAsync({
        plan: "monthly",
        returnTo: "/profile",
        startWithTrial: true,
      });
    });

    expect(mockApiFetchWithAuth).toHaveBeenCalledWith(
      "/api/billing/checkout-session",
      getIdToken,
      {
        method: "POST",
        body: JSON.stringify({
          returnTo: "/profile",
          plan: "monthly",
          startWithTrial: true,
        }),
      },
    );
  });

  it("reports checkout failures", async () => {
    mockApiFetchWithAuth.mockRejectedValue(new Error("boom"));

    const { result } = renderMutation(useCreateCheckoutSession);

    await act(async () => {
      try {
        await result.current.mutateAsync({});
      } catch {
        // mutateAsync rejects; the hook reports the error via toast.
      }
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Something went wrong: boom",
      );
    });
  });
});
