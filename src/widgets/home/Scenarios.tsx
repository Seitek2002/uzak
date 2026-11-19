"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { Parts } from "@/shared/lib/format";
import { Figure } from "@/shared/ui/Figure";

export interface Scenario {
  id: string;
  tab: string;
  before: { label: string; value: Parts };
  after: { label: string; value: Parts };
  change: string;
  text: string;
}

/** One habit, two forecasts. Without script every panel shows in order. */
export function Scenarios({ items, head }: { items: Scenario[]; head: ReactNode }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (active + dir + items.length) % items.length;
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <div className="cols switch">
      <div className="switch__head">
        {head}
        <div className="seg" role="tablist" aria-label="Привычка" onKeyDown={onKey}>
        {items.map((s, i) => (
          <button
            key={s.id}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${s.id}`}
            aria-selected={i === active}
            aria-controls={`panel-${s.id}`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
          >
            {s.tab}
          </button>
        ))}
        </div>
      </div>
      <ScenarioPanels items={items} active={active} />
    </div>
  );
}

function ScenarioPanels({ items, active }: { items: Scenario[]; active: number }) {
  return (
    <div className="switch__panels">
      {items.map((s, i) => (
        <section
          key={s.id}
          role="tabpanel"
          id={`panel-${s.id}`}
          aria-labelledby={`tab-${s.id}`}
          hidden={i !== active}
          className="scenario"
        >
          <div className="scenario__pair">
            <div>
              <Figure parts={s.before.value} />
              <p>{s.before.label}</p>
            </div>
            <div>
              <Figure parts={s.after.value} className="figure figure--after" />
              <p>{s.after.label}</p>
            </div>
          </div>
          <p>
            <b>{s.change}.</b> {s.text}
          </p>
        </section>
      ))}
    </div>
  );
}
