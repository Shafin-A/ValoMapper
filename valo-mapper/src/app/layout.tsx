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
import { ValorantTermsProvider } from "@/contexts/valorant-terms-context";
import { getValorantTerms } from "@/lib/i18n/valorant-terms-server";
import { LOCALE_META, type Locale } from "@/i18n/config";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
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

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("metadata");
  const title = t("title");
  const description = t("description");

  return {
    title: {
      default: `ValoMapper | ${title}`,
      template: "%s | ValoMapper",
    },
    applicationName: "ValoMapper",
    description,
    appleWebApp: {
      capable: true,
      title: "ValoMapper",
      statusBarStyle: "black-translucent",
    },
    metadataBase: new URL(appUrl),
    openGraph: {
      title: "ValoMapper",
      description,
      url: appUrl,
      siteName: "ValoMapper",
      type: "website",
      images: [
        {
          url: `${appUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: t("ogAlt"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "ValoMapper",
      description,
      images: [`${appUrl}/og-image.png`],
    },
  };
};

export const viewport: Viewport = {
  themeColor: "#0c0a09",
  viewportFit: "cover",
};

const RootLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const t = await getTranslations("common");
  const valorantTerms = await getValorantTerms(locale);
  const localeMeta = LOCALE_META[locale] ?? LOCALE_META["en-US"];

  return (
    <html lang={locale} dir={localeMeta.dir} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg focus:ring-2 focus:ring-ring"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ValorantTermsProvider terms={valorantTerms}>
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
          </ValorantTermsProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default RootLayout;
