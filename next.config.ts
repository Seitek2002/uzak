import type { NextConfig } from "next";

/*
 * GITHUB_PAGES=true builds a static copy into out/ for GitHub Pages; the site
 * then lives in a subfolder (NEXT_PUBLIC_BASE_PATH, for example /uzak), and
 * every page gets its own folder with index.html so plain static hosting works.
 */
const pages = process.env.GITHUB_PAGES === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(pages ? { output: "export" as const, trailingSlash: true, basePath } : {}),
};

export default nextConfig;
