import QueryProvider from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { TourProviderWrapper } from "@/components/providers/tour-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CanvasProvider } from "@/contexts/canvas-context";
import { SettingsProvider } from "@/contexts/settings-context";
import { WebSocketProvider } from "@/contexts/websocket-context";
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

export const metadata: Metadata = {
  title: "ValoMapper",
  description: "Create strategies and executes for VALORANT",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
              <SettingsProvider>
                <TourProviderWrapper>
                  <CanvasProvider>
                    <WebSocketProvider>{children}</WebSocketProvider>
                  </CanvasProvider>
                  <Toaster richColors closeButton />
                </TourProviderWrapper>
              </SettingsProvider>
            </QueryProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
