import { render, screen } from "@testing-library/react";
import { ProfileContent } from "@/components/profile/profile-content";
import { useUser } from "@/hooks/api/use-user";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { useUpdateUser } from "@/hooks/api/use-update-user";
import { useDeleteUser } from "@/hooks/api/use-delete-user";
import { useCancelSubscription } from "@/hooks/api/use-cancel-subscription";
import { useResumeSubscription } from "@/hooks/api/use-resume-subscription";
import { useStackMembers } from "@/hooks/api/use-stack-members";
import { useInviteStackMember } from "@/hooks/api/use-invite-stack-member";
import { useRemoveStackMember } from "@/hooks/api/use-remove-stack-member";
import { usePendingStackInvites } from "@/hooks/api/use-pending-stack-invite";
import { useAcceptStackInvite } from "@/hooks/api/use-accept-stack-invite";
import { useDeclineStackInvite } from "@/hooks/api/use-decline-stack-invite";
import { useLeaveStack } from "@/hooks/api/use-leave-stack";
import { User } from "@/lib/types";
import { usePathname, useSearchParams } from "next/navigation";

jest.mock("@/components/billing/checkout-plan-dialog", () => ({
  CheckoutPlanDialog: () => (
    <div data-testid="checkout-plan-dialog">checkout plan dialog</div>
  ),
}));

jest.mock("@/hooks/api/use-user");
jest.mock("@/hooks/use-firebase-auth");
jest.mock("@/hooks/api/use-update-user");
jest.mock("@/hooks/api/use-delete-user");
jest.mock("@/hooks/api/use-cancel-subscription");
jest.mock("@/hooks/api/use-resume-subscription");
jest.mock("@/hooks/api/use-stack-members");
jest.mock("@/hooks/api/use-invite-stack-member");
jest.mock("@/hooks/api/use-remove-stack-member");
jest.mock("@/hooks/api/use-pending-stack-invite");
jest.mock("@/hooks/api/use-accept-stack-invite");
jest.mock("@/hooks/api/use-decline-stack-invite");
jest.mock("@/hooks/api/use-leave-stack");

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;
const mockUseFirebaseAuth = useFirebaseAuth as jest.MockedFunction<
  typeof useFirebaseAuth
>;
const mockUseUpdateUser = useUpdateUser as jest.MockedFunction<
  typeof useUpdateUser
>;
const mockUseDeleteUser = useDeleteUser as jest.MockedFunction<
  typeof useDeleteUser
>;
const mockUseCancelSubscription = useCancelSubscription as jest.MockedFunction<
  typeof useCancelSubscription
>;
const mockUseResumeSubscription = useResumeSubscription as jest.MockedFunction<
  typeof useResumeSubscription
>;
const mockUseStackMembers = useStackMembers as jest.MockedFunction<
  typeof useStackMembers
>;
const mockUseInviteStackMember = useInviteStackMember as jest.MockedFunction<
  typeof useInviteStackMember
>;
const mockUseRemoveStackMember = useRemoveStackMember as jest.MockedFunction<
  typeof useRemoveStackMember
>;
const mockUsePendingStackInvites =
  usePendingStackInvites as jest.MockedFunction<typeof usePendingStackInvites>;
const mockUseAcceptStackInvite = useAcceptStackInvite as jest.MockedFunction<
  typeof useAcceptStackInvite
>;
const mockUseDeclineStackInvite = useDeclineStackInvite as jest.MockedFunction<
  typeof useDeclineStackInvite
>;
const mockUseLeaveStack = useLeaveStack as jest.MockedFunction<
  typeof useLeaveStack
>;
const mockUsePathname = jest.mocked(usePathname);
const mockUseSearchParams = jest.mocked(useSearchParams);

const mockUser: User = {
  id: 1,
  firebaseUid: "firebase-uid-1",
  name: "Test User",
  email: "test@example.com",
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-02T00:00:00.000Z"),
  isSubscribed: false,
  personalIsSubscribed: false,
  subscriptionPlan: null,
};

const buildUser = (overrides: Partial<User> = {}): User => ({
  ...mockUser,
  ...overrides,
});

describe("ProfileContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUsePathname.mockReturnValue("/profile");
    mockUseSearchParams.mockReturnValue({
      toString: () => "",
    } as unknown as ReturnType<typeof useSearchParams>);

    mockUseUpdateUser.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateUser>);

    mockUseDeleteUser.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteUser>);

    mockUseCancelSubscription.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useCancelSubscription>);

    mockUseResumeSubscription.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useResumeSubscription>);

    mockUseInviteStackMember.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useInviteStackMember>);

    mockUseRemoveStackMember.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useRemoveStackMember>);

    mockUseAcceptStackInvite.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useAcceptStackInvite>);

    mockUseDeclineStackInvite.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useDeclineStackInvite>);

    mockUseLeaveStack.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useLeaveStack>);

    mockUsePendingStackInvites.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof usePendingStackInvites>);

    mockUseStackMembers.mockReturnValue({
      data: {
        owner: {
          userId: 0,
          email: null,
          name: null,
        },
        members: [],
        canManage: false,
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useStackMembers>);

    mockUseFirebaseAuth.mockReturnValue({
      user: { uid: "firebase-uid-1" },
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      logout: jest.fn(),
      getIdToken: jest.fn(),
    } as unknown as ReturnType<typeof useFirebaseAuth>);

    mockUseUser.mockReturnValue({
      data: mockUser,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it("shows not authenticated state when firebase user is missing", () => {
    mockUseFirebaseAuth.mockReturnValue({
      user: null,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      logout: jest.fn(),
      getIdToken: jest.fn(),
    } as unknown as ReturnType<typeof useFirebaseAuth>);

    render(<ProfileContent />);

    expect(screen.getByText("Not Authenticated")).toBeInTheDocument();
    expect(
      screen.getByText("Please log in to view your profile."),
    ).toBeInTheDocument();
  });

  it("shows user data missing state when authenticated user has no profile", () => {
    mockUseUser.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ProfileContent />);

    expect(screen.getByText("User Data Not Found")).toBeInTheDocument();
    expect(
      screen.getByText("Could not load your profile information."),
    ).toBeInTheDocument();
  });

  it("renders profile details for an authenticated user", () => {
    render(<ProfileContent />);

    expect(screen.getByText("My Profile")).toBeInTheDocument();
    expect(
      screen.getByText("View and manage your account information"),
    ).toBeInTheDocument();
    expect(screen.getByText("Edit Profile")).toBeInTheDocument();
  });

  it("renders monthly premium trial state", () => {
    mockUseUser.mockReturnValue({
      data: buildUser({
        isSubscribed: true,
        subscriptionPlan: "monthly",
        premiumTrialDaysLeft: 3,
      }),
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ProfileContent />);

    expect(screen.getByText("Trial (3 days left)")).toBeInTheDocument();
    expect(
      screen.getByText(
        "You are currently on a Premium trial with 3 days remaining.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Cancel Subscription")).toBeInTheDocument();
  });

  it("renders active monthly premium state", () => {
    mockUseUser.mockReturnValue({
      data: buildUser({
        isSubscribed: true,
        subscriptionPlan: "monthly",
        premiumTrialDaysLeft: 0,
      }),
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ProfileContent />);

    expect(screen.getByText("Monthly")).toBeInTheDocument();
    expect(
      screen.getByText("Your Monthly Premium subscription is active."),
    ).toBeInTheDocument();
  });

  it("renders active yearly premium state", () => {
    mockUseUser.mockReturnValue({
      data: buildUser({
        isSubscribed: true,
        subscriptionPlan: "yearly",
      }),
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ProfileContent />);

    expect(screen.getByText("Yearly")).toBeInTheDocument();
    expect(
      screen.getByText("Your Yearly Premium subscription is active."),
    ).toBeInTheDocument();
  });

  it("renders scheduled cancellation state with undo action", () => {
    mockUseUser.mockReturnValue({
      data: buildUser({
        isSubscribed: true,
        subscriptionPlan: "monthly",
        subscriptionEndedAt: "2026-06-15T00:00:00.000Z",
      }),
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ProfileContent />);

    expect(
      screen.getByText("Monthly (Cancels at Period End)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Undo Cancellation")).toBeInTheDocument();
    expect(
      screen.getByText(/Monthly access remains active until/i),
    ).toBeInTheDocument();
  });

  it("renders premium stack owner state", () => {
    mockUseUser.mockReturnValue({
      data: buildUser({
        id: 101,
        isSubscribed: true,
        subscriptionPlan: "stack",
      }),
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUseStackMembers.mockReturnValue({
      data: {
        owner: {
          userId: 101,
          name: "Owner One",
          email: "owner@example.com",
        },
        members: [],
        canManage: true,
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useStackMembers>);

    render(<ProfileContent />);

    expect(screen.getByText("Stack Owner")).toBeInTheDocument();
    expect(
      screen.getByText("You are the stack owner for this Premium Stack plan."),
    ).toBeInTheDocument();
    expect(screen.getByText("Invite by UID")).toBeInTheDocument();
  });

  it("renders premium stack member state", () => {
    mockUseUser.mockReturnValue({
      data: buildUser({
        id: 202,
        isSubscribed: true,
        subscriptionPlan: "stack",
      }),
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUseStackMembers.mockReturnValue({
      data: {
        owner: {
          userId: 303,
          name: "Stack Captain",
          email: "captain@example.com",
        },
        members: [
          {
            id: 1,
            ownerUserId: 303,
            memberUserId: 202,
            status: "active",
            invitedAt: "2026-01-01T00:00:00.000Z",
            joinedAt: "2026-01-02T00:00:00.000Z",
            memberEmail: "member@example.com",
            memberName: "Member One",
          },
        ],
        canManage: false,
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useStackMembers>);

    render(<ProfileContent />);

    expect(screen.getByText("Stack Member")).toBeInTheDocument();
    expect(
      screen.getByText(
        "You are covered under Stack Captain's Premium Stack plan.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Leave Stack")).toBeInTheDocument();
  });

  it("renders stack member with scheduled personal plan cancellation", () => {
    mockUseUser.mockReturnValue({
      data: buildUser({
        id: 444,
        isSubscribed: true,
        subscriptionPlan: "stack",
        personalIsSubscribed: true,
        personalSubscriptionPlan: "yearly",
        personalSubscriptionEndedAt: "2026-12-31T00:00:00.000Z",
      }),
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUseStackMembers.mockReturnValue({
      data: {
        owner: {
          userId: 909,
          name: "Stack Owner",
          email: "owner@example.com",
        },
        members: [
          {
            id: 2,
            ownerUserId: 909,
            memberUserId: 444,
            status: "active",
            invitedAt: "2026-03-01T00:00:00.000Z",
            joinedAt: "2026-03-02T00:00:00.000Z",
          },
        ],
        canManage: false,
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useStackMembers>);

    render(<ProfileContent />);

    expect(
      screen.getByText(
        /You are covered under Stack Owner's Premium Stack plan\./i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Your personal yearly subscription is scheduled to cancel on/i,
      ),
    ).toBeInTheDocument();
  });

  it("renders pending stack invites for non-stack users", () => {
    mockUsePendingStackInvites.mockReturnValue({
      data: [
        {
          id: 88,
          ownerUserId: 700,
          memberUserId: 1,
          status: "pending",
          invitedAt: "2026-02-01T00:00:00.000Z",
          ownerName: "Invite Owner",
        },
      ],
      isLoading: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof usePendingStackInvites>);

    render(<ProfileContent />);

    expect(screen.getByText("Pending Stack Invite")).toBeInTheDocument();
    expect(screen.getByText("Accept Invite")).toBeInTheDocument();
    expect(screen.getByText("Decline")).toBeInTheDocument();
  });
});
