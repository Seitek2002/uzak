"use client";

import { usePathname } from "next/navigation";
import { LOCALE, LOCALE_KEY, LOCALES, ROOT_PATH } from "@/shared/config/locale";

const remember = (code: string) => {
  try {
    window.localStorage.setItem(LOCALE_KEY, code);
  } catch {
    /* the browser language decides next time */
  }
};

/** Plain links: each language is its own copy of the site, outside this router. */
export function LanguageSwitch({ full = false }: { full?: boolean }) {
  const pathname = usePathname() ?? "/";
  const path = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return (
    <ul className={full ? "langs langs--full" : "langs"}>
      {LOCALES.map(({ code, short, name }) => (
        <li key={code}>
          <a
            href={`${ROOT_PATH}${code === "ru" ? "" : `/${code}`}${path}`}
            hrefLang={code}
            lang={code}
            aria-current={code === LOCALE ? "true" : undefined}
            onClick={() => remember(code)}
          >
            {full ? name : short}
          </a>
        </li>
      ))}
    </ul>
  );
}
