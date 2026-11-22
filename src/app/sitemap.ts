import type { MetadataRoute } from "next";
import { FACTORS } from "@/entities/factor";
import { LOCALE, LOCALES } from "@/shared/config/locale";
import { SITE } from "@/shared/config/site";

/** Built once: the static copy for GitHub Pages has no server. */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/start", "/test", "/factors", "/method", "/pet", "/pet/test", "/privacy", "/disclaimer"];
  const paths = [...pages, ...FACTORS.map((f) => `/factors/${f.slug}`)];
  // The translations exist only in the static copy, where every page is a folder.
  const translated = process.env.GITHUB_PAGES === "true";
  const slash = translated ? "/" : "";
  const root = LOCALE === "ru" ? SITE.url : SITE.url.slice(0, -LOCALE.length - 1);
  const inLanguage = (code: string, p: string) => `${root}${code === "ru" ? "" : `/${code}`}${p}${slash}`;
  return paths.map((p) => ({
    url: `${SITE.url}${p}${slash}`,
    changeFrequency: "monthly" as const,
    ...(translated && { alternates: { languages: Object.fromEntries(LOCALES.map(({ code }) => [code, inLanguage(code, p)])) } }),
  }));
}
