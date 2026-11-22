import Link from "next/link";
import { LOCALE } from "@/shared/config/locale";
import { SITE } from "@/shared/config/site";
import { LanguageSwitch } from "@/widgets/language/LanguageSwitch";

const LINKS = [
  { href: "/start", label: "Пройти тест" },
  { href: "/pet", label: "Для питомцев" },
  { href: "/report", label: "Мой отчёт" },
  { href: "/factors", label: "Все факторы" },
  { href: "/method", label: "Как считаем" },
  { href: "/privacy", label: "Конфиденциальность" },
  { href: "/disclaimer", label: "Это не диагноз" },
];

export function SiteFooter() {
  return (
    <footer className="mast">
      <div className="container">
        <p className="mast__name" aria-hidden="true">
          <b>{SITE.first}</b> <span>{SITE.second}</span>
        </p>
        <nav aria-label="Разделы сайта">
          <ul className="mast__links">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <LanguageSwitch full />
        {LOCALE === "ky" && <p className="mast__review">Перевод на кыргызский язык пока не проверен носителем языка.</p>}
        <div className="mast__legal">
          <p>
            Тест оценивает риски по средним данным опубликованных исследований. Он не ставит диагнозов и не заменяет
            врача.
          </p>
          <p>
            © 2026 <span className="brand-name">{SITE.name}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
