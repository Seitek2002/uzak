import Link from "next/link";
import { SiteFooter } from "@/widgets/site-footer/SiteFooter";
import { SiteHeader } from "@/widgets/site-header/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="container empty">
        <h1>Такой страницы нет</h1>
        <p className="lead">Возможно, ссылка устарела. Начните с главной или сразу с теста.</p>
        <div className="actions">
          <Link href="/start" className="btn">
            Пройти тест
          </Link>
          <Link href="/" className="link">
            На главную
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
