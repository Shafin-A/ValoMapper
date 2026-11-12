import QueryProvider from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { NavigationHistoryProvider } from "@/components/providers/navigation-history-provider";
import { TourProviderWrapper } from "@/components/providers/tour-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SettingsProvider } from "@/contexts/settings-context";
import { PenTapToClick } from "@/components/providers/pen-tap-to-click";
import { ServiceWorkerRegistration } from "@/components/providers/service-worker-registration";
import { FirebaseAuthProvider } from "@/hooks/use-firebase-auth";
import type { Metadata, Viewport } from "next";
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

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://valomapper.com";

export const metadata: Metadata = {
  title: {
    default: "ValoMapper | Create strategies and executes for VALORANT",
    template: "%s | ValoMapper",
  },
  applicationName: "ValoMapper",
  description: "Create strategies and executes for VALORANT",
  appleWebApp: {
    capable: true,
    title: "ValoMapper",
    statusBarStyle: "black-translucent",
  },
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
        width: 1200,
        height: 630,
        alt: "ValoMapper — create strategies and executes for VALORANT",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ValoMapper",
    description: "Create strategies and executes for VALORANT",
    images: [`${appUrl}/og-image.png`],
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0a09",
  viewportFit: "cover",
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
          defaultTheme="dark"
          forcedTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <TooltipProvider>
            <QueryProvider>
              <FirebaseAuthProvider>
                <SettingsProvider>
                  <TourProviderWrapper>
                    <NavigationHistoryProvider>
                      <PenTapToClick />
                      <ServiceWorkerRegistration />
                      {children}
                    </NavigationHistoryProvider>
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
