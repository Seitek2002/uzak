import Link from "next/link";

/** Not found inside the site: the (site) layout already draws the header, the main landmark and the footer. */
export default function SiteNotFound() {
  return (
    <div className="container empty">
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
    </div>
  );
}
