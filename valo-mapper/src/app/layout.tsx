import QueryProvider from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { CanvasProvider } from "@/contexts/canvas-context";
import { SettingsProvider } from "@/contexts/settings-context";
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
          <QueryProvider>
            <SettingsProvider>
              <CanvasProvider>{children}</CanvasProvider>
              <Toaster richColors closeButton />
            </SettingsProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
