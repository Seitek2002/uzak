"use client";

import { Download, Share2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useHydrated, useQuiz, type Attempt } from "@/features/quiz/model/store";
import { LOOKS } from "@/features/quiz/ui/visuals";
import { SITE } from "@/shared/config/site";
import { decimal, delta, deltaParts } from "@/shared/lib/format";
import { summaryOf, type ShareShow, type ShareSummary } from "../model/summary";
import { CARD, drawCard, iconImage, loadFaces, paintFrom, type CardData } from "../lib/draw";

const FILE_NAME = "uzak-omur.png";
/** What the address on the picture and in the post looks like. */
const ADDRESS = SITE.url.replace(/^https?:\/\//, "").replace(/\/$/, "");

const SWITCHES: Array<{ id: keyof ShareShow; label: string }> = [
  { id: "name", label: "Имя" },
  { id: "ages", label: "Возраст прогноза" },
  { id: "steps", label: "Что менять" },
];

export function ResultScreen() {
  const hydrated = useHydrated();
  const last = useQuiz((s) => s.history.at(-1));

  if (!hydrated || !last) {
    return (
      <main id="main" className={hydrated ? "container empty" : "container empty empty--human"}>
        {hydrated ? null : <p className="muted empty__wait">Считаем результат…</p>}
        <h1>Результата пока нет</h1>
        <p className="lead">Он появится сразу после теста.</p>
        <div className="actions">
          <Link href="/test" className="btn">
            Пройти тест
          </Link>
        </div>
      </main>
    );
  }
  return <Result attempt={last} />;
}

/** The texts of the picture; the same words are read to screen readers. */
function cardOf(summary: ShareSummary, show: ShareShow): CardData {
  const { gain, forecast, potential, steps } = summary;
  const name = show.name ? summary.name : undefined;
  const grows = gain > 0;
  return {
    brand: [SITE.first, SITE.second],
    headline: grows
      ? name
        ? `${name} может прожить дольше`
        : "Я могу прожить дольше"
      : name
        ? `${name} живёт по лучшему сценарию`
        : "Я живу по лучшему сценарию",
    figure: grows
      ? deltaParts(gain)
      : show.ages
        ? { num: decimal(forecast), unit: "" }
        : { num: "100%", unit: "" },
    caption: grows ? "если изменить все привычки из отчёта" : show.ages ? "мой ожидаемый возраст" : "привычек уже на лучших вариантах",
    ages:
      show.ages && grows
        ? {
            now: forecast,
            best: potential,
            nowText: decimal(forecast),
            bestText: decimal(potential),
            nowLabel: "если не менять",
            bestLabel: "если изменить",
          }
        : undefined,
    steps:
      show.steps && steps.length > 0
        ? { title: "С чего начать", rows: steps.map((step) => ({ text: step.action, value: delta(step.years) })) }
        : undefined,
    invite: "А сколько можешь прожить ты?",
    address: ADDRESS,
    note: "Оценка по исследованиям, не диагноз",
  };
}

function spoken(card: CardData): string {
  return [
    card.headline,
    `${card.figure.num} ${card.figure.unit} ${card.caption}`.trim(),
    card.ages && `${card.ages.nowLabel}: ${card.ages.nowText}, ${card.ages.bestLabel}: ${card.ages.bestText}`,
    card.steps && `${card.steps.title}: ${card.steps.rows.map((row) => `${row.text} ${row.value}`).join(", ")}`,
  ]
    .filter(Boolean)
    .join(". ");
}

function Result({ attempt }: { attempt: Attempt }) {
  const summary = useMemo(() => summaryOf(attempt), [attempt]);
  const [show, setShow] = useState<ShareShow>({ name: true, ages: true, steps: true });
  const [file, setFile] = useState<File>();
  const [canShare, setCanShare] = useState(false);
  const [note, setNote] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const icons = useRef<HTMLDivElement>(null);
  const card = useMemo(() => cardOf(summary, show), [summary, show]);

  useEffect(() => {
    let active = true;
    setFile(undefined);
    void (async () => {
      const surface = canvas.current;
      const ctx = surface?.getContext("2d");
      if (!surface || !ctx) return;
      const paint = paintFrom(surface);
      await loadFaces(paint, Object.values(card).flatMap((value) => JSON.stringify(value ?? "")).join(" "));
      const glyphs = await Promise.all(
        [...(icons.current?.querySelectorAll("svg") ?? [])].map((svg) => iconImage(svg, paint.markInk)),
      );
      if (!active) return;
      const steps = card.steps && { ...card.steps, rows: card.steps.rows.map((row, i) => ({ ...row, icon: glyphs[i] })) };
      drawCard(ctx, { ...card, steps }, paint);
      // The file is made ahead: Safari allows sharing only straight from the tap.
      surface.toBlob((blob) => {
        if (!active || !blob) return;
        const png = new File([blob], FILE_NAME, { type: "image/png" });
        setFile(png);
        setCanShare(Boolean(navigator.canShare?.({ files: [png] })));
      }, "image/png");
    })();
    return () => {
      active = false;
    };
  }, [card]);

  const save = () => {
    if (!file) return;
    const href = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = href;
    link.download = FILE_NAME;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
    setNote("Картинка сохранена. Выложите её в историю или пост.");
  };

  const share = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], text: `${card.invite} ${SITE.url}` });
    } catch (error) {
      // Closing the share sheet is not a failure.
      if (error instanceof DOMException && error.name === "AbortError") return;
      save();
    }
  };

  return (
    <main id="main" className="result">
      <h1 className="visually-hidden">Ваш результат</h1>
      <canvas
        ref={canvas}
        className="result__card"
        width={CARD.width}
        height={CARD.height}
        role="img"
        aria-label={spoken(card)}
        data-ready={file ? "true" : "false"}
      />
      <div ref={icons} hidden>
        {summary.steps.map((step) => {
          const Glyph = LOOKS[step.slug]?.icon;
          return Glyph ? <Glyph key={step.slug} /> : null;
        })}
      </div>
      <div className="result__panel">
        <div className="result__actions">
          {canShare && (
            <button type="button" className="btn" onClick={share} disabled={!file}>
              <Share2 size={20} aria-hidden="true" />
              Поделиться
            </button>
          )}
          <button type="button" className={canShare ? "link" : "btn"} onClick={save} disabled={!file}>
            <Download size={20} aria-hidden="true" />
            Скачать
          </button>
        </div>
        <div className="result__more">
          <details className="quiz__more">
            <summary>Что показывать</summary>
            <ul className="result__switches">
              {SWITCHES.filter(({ id }) => id !== "name" || summary.name).map(({ id, label }) => (
                <li key={id}>
                  <label>
                    <input type="checkbox" checked={show[id]} onChange={(e) => setShow({ ...show, [id]: e.target.checked })} />
                    {label}
                  </label>
                </li>
              ))}
            </ul>
          </details>
          <Link href="/report" className="link">
            Полный отчёт
          </Link>
        </div>
        <p className="result__note" role="status">
          {note}
        </p>
      </div>
    </main>
  );
}
