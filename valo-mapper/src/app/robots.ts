import type { MetadataRoute } from "next";

const robots = (): MetadataRoute.Robots => {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ??
    "https://valomapper.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/*",
          "/profile",
          "/strategies",
          "/matches",
          "/billing",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
};

export default robots;
