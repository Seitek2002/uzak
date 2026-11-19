import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Wix_Madefor_Display, Wix_Madefor_Text } from "next/font/google";
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
    locale: "ru_RU",
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
    <html lang="ru" className={`overflow-x-clip ${display.variable} ${text.variable}`} suppressHydrationWarning>
      <head>
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
