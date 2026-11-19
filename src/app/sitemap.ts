import type { MetadataRoute } from "next";
import { FACTORS } from "@/entities/factor";
import { SITE } from "@/shared/config/site";

/** Built once: the static copy for GitHub Pages has no server. */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/start", "/test", "/factors", "/method", "/pet", "/pet/test", "/privacy", "/disclaimer"];
  return [
    ...pages.map((p) => ({ url: `${SITE.url}${p}`, changeFrequency: "monthly" as const })),
    ...FACTORS.map((f) => ({ url: `${SITE.url}/factors/${f.slug}`, changeFrequency: "monthly" as const })),
  ];
}
