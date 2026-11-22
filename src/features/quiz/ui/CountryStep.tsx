"use client";

import { useEffect, useState } from "react";
import type { Factor } from "@/entities/factor";
import { COUNTRIES } from "@/shared/data/countries";
import { countryByIp } from "@/shared/lib/country-by-ip";
import { Question, type HeadingRef } from "@/shared/ui/Quiz";
import { useQuiz } from "../model/store";
import { FALLBACK_LOOK, LOOKS } from "./visuals";

type Lookup = "idle" | "looking" | "found" | "failed";

const NOTE: Record<Lookup, string> = {
  idle: "",
  looking: "Определяем страну…",
  found: "Подставили по IP-адресу. Если это не та страна, выберите другую.",
  failed: "Не получилось определить страну, выберите её из списка.",
};

/** The past country is filled from the IP address, the future one repeats the past. */
export function CountryStep({ factor, headingRef, error }: { factor: Factor; headingRef: HeadingRef; error: string }) {
  const isPast = factor.slug === "country-before";
  const value = useQuiz((s) => s.answers[factor.slug] ?? (isPast ? "" : (s.answers["country-before"] ?? "")));
  const answer = useQuiz((s) => s.answer);
  const [lookup, setLookup] = useState<Lookup>("idle");
  const fieldId = `${factor.slug}-field`;
  const helpId = `help-${factor.slug}`;

  useEffect(() => {
    if (!isPast || useQuiz.getState().answers[factor.slug]) return;
    let active = true;
    setLookup("looking");
    void countryByIp().then((iso2) => {
      if (!active) return;
      // The person may have picked a country while we were asking.
      if (useQuiz.getState().answers[factor.slug]) {
        setLookup("idle");
        return;
      }
      const country = iso2 ? COUNTRIES.find((c) => c.iso2 === iso2) : undefined;
      if (country) answer(factor.slug, country.code);
      setLookup(country ? "found" : "failed");
    });
    return () => {
      active = false;
    };
  }, [isPast, factor.slug, answer]);

  return (
    <fieldset>
      <Question look={LOOKS[factor.slug] ?? FALLBACK_LOOK} headingRef={headingRef} title={factor.question} help={factor.help} helpId={helpId} />
      <div className="select">
        <label htmlFor={fieldId}>Страна</label>
        <select
          id={fieldId}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${factor.help ? `${helpId} ` : ""}${fieldId}-note`}
          onChange={(e) => {
            setLookup("idle");
            answer(factor.slug, e.target.value);
          }}
        >
          <option value="" disabled>
            Выберите страну
          </option>
          {factor.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <p className="field-note" id={`${fieldId}-note`} role="status">
        {NOTE[lookup]}
      </p>
      <p className="error" role="alert">
        {error}
      </p>
    </fieldset>
  );
}
