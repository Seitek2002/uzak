"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV } from "@/shared/config/site";
import { LanguageSwitch } from "@/widgets/language/LanguageSwitch";
import { Wordmark } from "@/shared/ui/Wordmark";

/** A banner that scrolls away over a bar that tucks up on the way down and returns on the way up. */
export function SiteHeader() {
  const pathname = usePathname();
  const [tucked, setTucked] = useState(false);
  const [open, setOpen] = useState(false);
  const last = useRef(0);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        const goingDown = y > last.current + 4;
        const goingUp = y < last.current - 4;
        if (goingDown && y > 240) setTucked(true);
        if (goingUp || y < 120) setTucked(false);
        last.current = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <aside className="banner" aria-label="Коротко о тесте">
        <div className="container banner__inner">
          <p>Бесплатно и без регистрации. Ответы хранятся только в вашем браузере.</p>
          <LanguageSwitch />
        </div>
      </aside>
      <header className={`bar${tucked && !open ? " is-tucked" : ""}`}>
        <div className="container bar__inner">
          <Wordmark />
          <button
            type="button"
            className="link bar__menu"
            aria-expanded={open}
            aria-controls="site-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Закрыть" : "Меню"}
          </button>
          <nav id="site-nav" className={`bar__nav${open ? " is-open" : ""}`} aria-label="Основное меню">
            <ul>
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} aria-current={pathname.startsWith(item.href) ? "page" : undefined}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/start" className="btn btn--compact">
              Пройти тест
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}
