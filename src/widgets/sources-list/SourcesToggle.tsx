"use client";

import { useId, useState } from "react";
import type { Source } from "@/entities/factor";
import { plural } from "@/shared/lib/format";

/** The full bibliography, rendered only once the reader asks for it. */
export function SourcesToggle({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const n = sources.length;
  return (
    <div className="sources-all">
      <button type="button" className="link" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
        {open ? "Скрыть источники" : `Показать все ${n} ${plural(n, ["источник", "источника", "источников"])}`}
      </button>
      <div id={id}>
        {open && (
          <ul className="sources">
            {sources.map((s) => (
              <li key={s.title}>
                {s.authors}{" "}
                <a href={s.href} target="_blank" rel="noopener noreferrer">
                  {s.title}
                  <span className="visually-hidden"> (откроется в новой вкладке)</span>
                </a>
                . {s.where}.
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
