import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Onest, Wix_Madefor_Display, Wix_Madefor_Text } from "next/font/google";
import { LOCALE, LOCALE_REDIRECT, OG_LOCALE } from "@/shared/config/locale";
import { SITE } from "@/shared/config/site";
import "../styles/site.css";

const display = Wix_Madefor_Display({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "700"],
  variable: "--font-wix-display",
  display: "swap",
});

const text = Wix_Madefor_Text({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500"],
  variable: "--font-wix-text",
  display: "swap",
});

// Wix Madefor has no \u04e9, \u04af or \u04a3: Kyrgyz words and the brand are set in Onest.
const kyrgyz = Onest({
  subsets: ["cyrillic"],
  weight: ["400", "500", "700"],
  variable: "--font-onest",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name}: тест долголетия`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: {
    type: "website",
    locale: OG_LOCALE[LOCALE],
    siteName: SITE.name,
    title: `${SITE.name}: тест долголетия`,
    description: SITE.description,
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={LOCALE} className={`overflow-x-clip ${display.variable} ${text.variable} ${kyrgyz.variable}`} suppressHydrationWarning>
      <head>
        {LOCALE === "ru" && process.env.GITHUB_PAGES === "true" && (
          <script dangerouslySetInnerHTML={{ __html: LOCALE_REDIRECT }} />
        )}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className="overflow-x-clip">
        <a className="skip" href="#main">
          К содержанию
        </a>
        {children}
      </body>
    </html>
  );
}
