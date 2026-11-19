import type { MetadataRoute } from "next";
import { SITE } from "@/shared/config/site";

/** Built once: the static copy for GitHub Pages has no server. */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
