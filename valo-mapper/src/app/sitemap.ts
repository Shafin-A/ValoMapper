import type { MetadataRoute } from "next";

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ??
    "https://valomapper.fly.dev";

  const staticPages = [
    { path: "", lastModified: new Date() },
    { path: "privacy-policy", lastModified: new Date("2025-03-18") },
    { path: "terms-of-service", lastModified: new Date("2025-03-18") },
  ];

  return staticPages.map(({ path, lastModified }) => ({
    url: path ? `${baseUrl}/${path}` : baseUrl,
    lastModified,
  }));
};

export default sitemap;
