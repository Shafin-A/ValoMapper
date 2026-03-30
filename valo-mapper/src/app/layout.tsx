import QueryProvider from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { TourProviderWrapper } from "@/components/providers/tour-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CanvasProvider } from "@/contexts/canvas-context";
import { SettingsProvider } from "@/contexts/settings-context";
import { WebSocketProvider } from "@/contexts/websocket-context";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { FirebaseAuthProvider } from "@/hooks/use-firebase-auth";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://valomapper.fly.dev";

export const metadata: Metadata = {
  title: {
    default: "ValoMapper",
    template: "%s | ValoMapper",
  },
  description: "Create strategies and executes for VALORANT",
  metadataBase: new URL(appUrl),
  openGraph: {
    title: "ValoMapper",
    description: "Create strategies and executes for VALORANT",
    url: appUrl,
    siteName: "ValoMapper",
    type: "website",
    images: [
      {
        url: `${appUrl}/og-image.png`,
        width: 512,
        height: 512,
        alt: "ValoMapper logo",
      },
    ],
  },
  icons: {
    icon: `${appUrl}/og-image.png`,
    shortcut: `${appUrl}/og-image.png`,
    apple: `${appUrl}/og-image.png`,
  },
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <QueryProvider>
              <FirebaseAuthProvider>
                <SettingsProvider>
                  <TourProviderWrapper>
                    <CanvasProvider>
                      <WebSocketProvider>
                        <KeyboardShortcuts />
                        {children}
                      </WebSocketProvider>
                    </CanvasProvider>
                    <Toaster richColors closeButton />
                  </TourProviderWrapper>
                </SettingsProvider>
              </FirebaseAuthProvider>
            </QueryProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
