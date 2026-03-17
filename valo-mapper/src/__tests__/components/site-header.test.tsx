import { render as rtlRender, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SiteHeader } from "@/components/layout/site-header";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";
import { useUser } from "@/hooks/api/use-user";
import { usePendingStackInvites } from "@/hooks/api/use-pending-stack-invite";
import { useWebSocket } from "@/contexts/websocket-context";
import { usePathname } from "next/navigation";
import { User } from "@/lib/types";

// Mock the hooks
jest.mock("@/hooks/use-firebase-auth");
jest.mock("@/hooks/api/use-user");
jest.mock("@/hooks/api/use-pending-stack-invite", () => ({
  usePendingStackInvites: jest.fn(),
}));
jest.mock("@/contexts/websocket-context", () => ({
  useWebSocket: jest.fn(),
}));

const mockUseFirebaseAuth = useFirebaseAuth as jest.MockedFunction<
  typeof useFirebaseAuth
>;
const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;
const mockUsePendingStackInvites =
  usePendingStackInvites as jest.MockedFunction<typeof usePendingStackInvites>;
const mockUseWebSocket = useWebSocket as jest.MockedFunction<
  typeof useWebSocket
>;
const mockUsePathname = jest.mocked(usePathname);

const renderSiteHeader = (props: React.ComponentProps<typeof SiteHeader>) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return rtlRender(<SiteHeader {...props} />, { wrapper });
};

describe("SiteHeader", () => {
  const mockSetLeftSidebarOpen = jest.fn();
  const mockSetRightSidebarOpen = jest.fn();
  const mockLogout = jest.fn();

  const defaultProps = {
    leftSidebarOpen: false,
    setLeftSidebarOpen: mockSetLeftSidebarOpen,
    rightSidebarOpen: false,
    setRightSidebarOpen: mockSetRightSidebarOpen,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue("/");
    mockUseWebSocket.mockReturnValue({
      users: [],
    } as unknown as ReturnType<typeof useWebSocket>);
    mockUsePendingStackInvites.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof usePendingStackInvites>);
    mockUseFirebaseAuth.mockReturnValue({
      user: null,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      logout: mockLogout,
      getIdToken: jest.fn(),
    });
  });

  it("should render ValoMapper title", () => {
    mockUseUser.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    renderSiteHeader(defaultProps);

    expect(screen.getByText("ValoMapper")).toBeInTheDocument();
  });

  it("should have all required header buttons", () => {
    mockUseUser.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    renderSiteHeader(defaultProps);

    const buttons = screen.getAllByRole("button");

    // Should have exactly 4 buttons: left sidebar, help, user dropdown, right sidebar
    expect(buttons).toHaveLength(4);
  });

  it("should render when user is loading", () => {
    mockUseUser.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    renderSiteHeader(defaultProps);

    expect(screen.getByText("ValoMapper")).toBeInTheDocument();
  });

  it("should render when user is not authenticated", () => {
    mockUseUser.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    renderSiteHeader(defaultProps);

    expect(screen.getByText("ValoMapper")).toBeInTheDocument();
  });

  it("should render when user is authenticated", () => {
    const mockUser: User = {
      id: 123,
      name: "Test User",
      email: "test@example.com",
      firebaseUid: "firebase-123",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUseUser.mockReturnValue({
      data: mockUser,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    renderSiteHeader(defaultProps);

    expect(screen.getByText("ValoMapper")).toBeInTheDocument();
  });
});
