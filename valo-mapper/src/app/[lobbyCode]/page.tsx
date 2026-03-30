import type { Metadata } from "next";
import LobbyEditPage from "./lobby-page";

type LobbyPageProps = {
  params: Promise<{
    lobbyCode: string;
  }>;
};

export async function generateMetadata({
  params,
}: LobbyPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const lobbyCode = resolvedParams.lobbyCode?.toUpperCase() ?? "unknown";
  const title = `Lobby ${lobbyCode}`;
  const description = `Join VALORANT strategy lobby ${lobbyCode} on ValoMapper to build your map executes.`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://valomapper.com";
  const url = `${appUrl.replace(/\/+$/, "")}/${encodeURIComponent(resolvedParams.lobbyCode)}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "ValoMapper",
      images: [
        {
          url: `${appUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: `Lobby ${lobbyCode} on ValoMapper`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${appUrl}/og-image.png`],
    },
  };
}

const Page = () => {
  return <LobbyEditPage />;
};

export default Page;
