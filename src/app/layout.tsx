import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Onest, Wix_Madefor_Display, Wix_Madefor_Text } from "next/font/google";
import { LOCALE, LOCALE_REDIRECT, OG_LOCALE } from "@/shared/config/locale";
import { SITE } from "@/shared/config/site";
import "../styles/site.css";

const display = Wix_Madefor_Display({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
  variable: "--font-wix-display",
  display: "swap",
});

const text = Wix_Madefor_Text({
  subsets: ["latin", "cyrillic"],
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

/*
 * The first layout holds one screen (see site.css). The rest follows after the
 * load, one block per idle task, so every height is soon a real one. A place
 * to go to (back, forward, reload, #anchor) needs them at once. Both listeners
 * stand before the router's.
 */
const LAID_OUT = `(function () {
  var root = document.documentElement;
  var done = false;
  var all = function () { done = true; root.classList.add("laid-out"); };
  var idle = window.requestIdleCallback || function (next) { setTimeout(next, 50); };
  var later = "#main > .section, .library__group, .prose > *, .split-page__aside, .mast";
  var next = function () {
    if (done) return;
    var blocks = document.querySelectorAll(later);
    for (var i = 0; i < blocks.length; i++) {
      if (blocks[i].hasAttribute("data-laid") || getComputedStyle(blocks[i]).contentVisibility !== "auto") continue;
      blocks[i].setAttribute("data-laid", "");
      requestAnimationFrame(function () { idle(next, { timeout: 200 }); });
      return;
    }
    all();
  };
  addEventListener("popstate", all);
  var visit = performance.getEntriesByType("navigation")[0];
  if (location.hash || (visit && visit.type !== "navigate")) return all();
  addEventListener("load", function () { idle(next, { timeout: 1000 }); });
})();`;

/*
 * The stores are read after the scripts load, so the HTML of a report is the
 * empty state. Whether something is saved is known before the first paint:
 * then the waiting line stands in its place (.empty in site.css).
 */
const SAVED = `(function () {
  [["uzak-v1", "saved-human"], ["uzak-pet-v1", "saved-pet"]].forEach(function (store) {
    try {
      if (JSON.parse(localStorage.getItem(store[0])).state.history.length) document.documentElement.classList.add(store[1]);
    } catch (e) {}
  });
})();`;

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
        <script dangerouslySetInnerHTML={{ __html: LAID_OUT }} />
        <script dangerouslySetInnerHTML={{ __html: SAVED }} />
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
