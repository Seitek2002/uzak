import Link from "next/link";
import { SITE } from "@/shared/config/site";

export function Wordmark() {
  return (
    <Link href="/" className="wordmark" aria-label={`${SITE.first} ${SITE.second}, на главную`}>
      <b>{SITE.first}</b> <span>{SITE.second}</span>
    </Link>
  );
}
