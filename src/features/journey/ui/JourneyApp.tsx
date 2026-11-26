"use client";

import "@/styles/journey.css";
import { ArrowLeft, Gem, Heart, Volume2, VolumeX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type RefObject } from "react";
import { FACTOR_BY_SLUG, groupById, type GroupId } from "@/entities/factor";
import type { Profile } from "@/entities/result";
import { useQuizFlow } from "@/features/quiz/model/flow";
import { STEPS } from "@/features/quiz/model/steps";
import { useQuiz } from "@/features/quiz/model/store";
import { BodyStep } from "@/features/quiz/ui/BodyStep";
import { CountryStep } from "@/features/quiz/ui/CountryStep";
import { AgeStep, NameStep } from "@/features/quiz/ui/QuizApp";
import { FALLBACK_LOOK, LOOKS } from "@/features/quiz/ui/visuals";
import { decimal, delta as signed, nb, plural } from "@/shared/lib/format";
import { Question } from "@/shared/ui/Quiz";
import { Wordmark } from "@/shared/ui/Wordmark";
import { answersBefore, hpOf, reserveOf } from "../model/hp";
import { Cards, type Reveal } from "./Cards";
import { Scene, type Pose } from "./Scene";
import { sfx } from "./sfx";
import { RELICS, type Biome } from "./world";

/** The first question of the trail; the steps before it create the hero. */
const PATH_FROM = STEPS.indexOf("country-next") + 1;
const PATH_LEN = STEPS.length - PATH_FROM;
const WALK_MS = 1100;
const HOLD_MS = 1500;
const HOLD_MS_CALM = 900;
const YEARS: [string, string, string] = ["год", "года", "лет"];

const groupOf = (id: string): GroupId | undefined => FACTOR_BY_SLUG.get(id)?.group ?? (id === "labs" ? "tests" : undefined);
/** The blocks of the trail in order, with the step where each begins and ends. */
const BLOCKS = (() => {
  const blocks: Array<{ group: GroupId; from: number; to: number }> = [];
  STEPS.forEach((id, i) => {
    if (i < PATH_FROM - 2) return;
    const g = groupOf(id);
    if (!g) return;
    const last = blocks.at(-1);
    if (last?.group === g) last.to = i;
    else blocks.push({ group: g, from: i, to: i });
  });
  return blocks;
})();
const STOPS = BLOCKS.slice(1).map((b) => (b.from - PATH_FROM) / PATH_LEN);

const calm = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const years = (n: number) => `${decimal(n)} ${plural(n, YEARS)}`;

type Camp = { kind: "start"; hp: number } | { kind: "block"; group: GroupId; delta: number; n: number; of: number };
interface Finale {
  hp: number;
  start: number;
  reserve: number;
  relics: number;
  of: number;
}

/** "Путь героя": the test as a trail, the answers as cards, the forecast as the hero's health. */
export function JourneyApp() {
  const router = useRouter();
  const sex = useQuiz((s) => s.sex);
  const age = useQuiz((s) => s.age);
  const name = useQuiz((s) => s.name);
  const answers = useQuiz((s) => s.answers);
  const labs = useQuiz((s) => s.labs);
  const sound = useQuiz((s) => s.sound);
  const setSound = useQuiz((s) => s.setSound);
  const setStyle = useQuiz((s) => s.setStyle);
  const answer = useQuiz((s) => s.answer);
  const setSex = useQuiz((s) => s.setSex);
  const setLabs = useQuiz((s) => s.setLabs);

  const [camp, setCamp] = useState<Camp | null>(null);
  const [finale, setFinale] = useState<Finale | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [pose, setPose] = useState<Pose>("stand");
  const [float, setFloat] = useState<{ key: number; delta: number } | null>(null);
  const [said, setSaid] = useState("");
  const [shake, setShake] = useState(0);
  const timers = useRef<number[]>([]);
  const campRef = useRef<Camp | null>(null);
  const campHeading = useRef<HTMLHeadingElement>(null);
  campRef.current = camp;
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const profile: Profile | null = sex && age ? { sex, age } : null;
  const play = (kind: keyof typeof sfx, ...args: [boolean?]) => {
    if (useQuiz.getState().sound) (sfx[kind] as (big?: boolean) => void)(...args);
  };

  const openBlockCamp = (group: GroupId) => {
    const s = useQuiz.getState();
    const block = BLOCKS.find((b) => b.group === group);
    if (!block || !s.sex || !s.age) return;
    const p = { sex: s.sex, age: s.age };
    // The first block also holds the countries: its share starts where the trail does.
    const before = hpOf(p, answersBefore(s.answers, STEPS, Math.max(block.from, PATH_FROM)));
    const after = hpOf(p, answersBefore(s.answers, STEPS, block.to + 1));
    const n = BLOCKS.findIndex((b) => b.group === group) + 1;
    setCamp({ kind: "block", group, delta: after - before, n, of: s.labs === "skip" ? BLOCKS.length - 1 : BLOCKS.length });
    play("camp");
  };

  const flow = useQuizFlow({ onGroupDone: openBlockCamp });
  const { step, id, factor, error, headingRef } = flow;
  const onPath = step >= PATH_FROM;
  const known = useMemo(() => answersBefore(answers, STEPS, step), [answers, step]);
  const walked = useMemo(() => (profile && onPath ? hpOf(profile, known) : null), [profile?.sex, profile?.age, onPath, known]);
  const reserved = useMemo(() => (profile && onPath ? reserveOf(profile, known) : 0), [profile?.sex, profile?.age, onPath, known]);
  // At the summit every answer counts, the last one too.
  const hp = finale ? finale.hp : walked;
  const reserve = finale ? finale.reserve : reserved;
  const progress = finale ? 1 : onPath ? (step - PATH_FROM) / PATH_LEN : 0;
  const biome: Biome = finale ? "summit" : onPath ? (groupOf(id) ?? "tests") : "create";
  const earned = finale ? finale.relics : BLOCKS.filter((b) => b.to < step).length;
  const relicsOf = labs === "skip" ? BLOCKS.length - 1 : BLOCKS.length;

  // The camp takes the focus; leaving it gives the focus back to the question.
  useEffect(() => {
    if (camp || finale) campHeading.current?.focus();
  }, [camp, finale]);

  const walk = () => {
    setPose("walk");
    later(() => setPose(campRef.current ? "rest" : "stand"), calm() ? 0 : WALK_MS);
  };

  const showFinale = () => {
    const s = useQuiz.getState();
    if (!s.sex || !s.age) return;
    const p = { sex: s.sex, age: s.age };
    s.complete();
    setFinale({
      hp: hpOf(p, s.answers),
      start: hpOf(p, answersBefore(s.answers, STEPS, PATH_FROM)),
      reserve: reserveOf(p, s.answers),
      relics: s.labs === "skip" ? BLOCKS.length - 1 : BLOCKS.length,
      of: s.labs === "skip" ? BLOCKS.length - 1 : BLOCKS.length,
    });
    setPose("summit");
    play("summit");
  };

  const advance = () => {
    const from = useQuiz.getState().step;
    if (!flow.next(showFinale)) return;
    if (STEPS[from] === "country-next") {
      const s = useQuiz.getState();
      if (s.sex && s.age) {
        setCamp({ kind: "start", hp: hpOf({ sex: s.sex, age: s.age }, answersBefore(s.answers, STEPS, PATH_FROM)) });
        play("camp");
      }
    }
    if (useQuiz.getState().step !== from) walk();
  };

  /** Plays the chosen answer: the card turns, the health moves, then the hero walks on. */
  const resolve = () => {
    if (reveal || camp || finale) return;
    const problem = flow.check();
    if (problem) {
      flow.showProblem(problem);
      return;
    }
    const s = useQuiz.getState();
    const current = STEPS[s.step];
    const f = FACTOR_BY_SLUG.get(current);
    if (!onPath || !profile || !f || f.kind === "country") {
      advance();
      return;
    }
    const before = hpOf(profile, answersBefore(s.answers, STEPS, s.step));
    const nowKnown = answersBefore(s.answers, STEPS, s.step + 1);
    const after = hpOf(profile, nowKnown);
    const d = after - before;
    const chosen = f.options.find((o) => o.id === s.answers[current]);
    const back = chosen?.improveTo && f.modifiable ? Math.max(hpOf(profile, { ...nowKnown, [current]: chosen.improveTo }) - after, 0) : 0;
    setReveal({ id: s.answers[current], delta: d, back });
    setFloat({ key: Date.now(), delta: d });
    setPose(d < -0.04 ? "hurt" : d > 0.04 ? "cheer" : "stand");
    if (d <= -1) setShake((n) => n + 1);
    setSaid(`${signed(d)}. HP ${years(after)}.`);
    play("flip");
    if (d > 0.04) later(() => play("heal", d >= 1), 180);
    else if (d < -0.04) later(() => play("hurt"), 180);
    else later(() => play("calm"), 180);
    later(
      () => {
        setReveal(null);
        setPose("stand");
        advance();
      },
      calm() ? HOLD_MS_CALM : HOLD_MS,
    );
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    resolve();
  };

  const leaveCamp = () => {
    setCamp(null);
    setPose("stand");
    window.setTimeout(() => headingRef.current?.focus(), 0);
  };

  const toggleSound = () => {
    if (!sound) sfx.wake();
    setSound(!sound);
  };

  const look = factor ? (LOOKS[factor.slug] ?? FALLBACK_LOOK) : id === "sex" ? LOOKS.sex : id === "labs" ? LOOKS.labs : FALLBACK_LOOK;
  const isChoice = factor?.kind === "choice" || id === "sex" || id === "labs";
  const creating = !onPath;
  const blockTitle = creating ? "Создание героя" : groupById(groupOf(id) ?? "tests").title;
  const pct = Math.round(progress * 100);

  return (
    <div className="journey" data-biome={biome} data-busy={reveal ? "true" : undefined}>
      <header className="j-top">
        <div className="j-top__inner">
          <Wordmark />
          <p className="j-top__progress" id="quiz-progress">
            {creating ? `Создание героя, шаг ${step + 1} из ${PATH_FROM}` : `Путь ${pct}%`}
          </p>
          <div className="j-top__tools">
            <button type="button" className="j-tool" aria-pressed={sound} onClick={toggleSound}>
              {sound ? <Volume2 size={20} strokeWidth={2} aria-hidden="true" /> : <VolumeX size={20} strokeWidth={2} aria-hidden="true" />}
              <span>Звук</span>
            </button>
            <button type="button" className="j-tool j-tool--text" onClick={() => setStyle("classic")}>
              К обычной анкете
            </button>
          </div>
        </div>
        <ol className="j-map" aria-label={`Реликвии: ${earned} из ${relicsOf}`}>
          {BLOCKS.filter((b) => labs !== "skip" || b.group !== "tests").map((b) => {
            const Relic = RELICS[b.group].icon;
            const state = b.to < step || finale ? "is-earned" : groupOf(id) === b.group && onPath ? "is-here" : "";
            return (
              <li key={b.group} className={state} title={RELICS[b.group].name}>
                <Relic size={14} strokeWidth={2} aria-hidden="true" />
                <span className="visually-hidden">
                  {RELICS[b.group].name}
                  {state === "is-earned" ? ", получена" : ""}
                </span>
              </li>
            );
          })}
        </ol>
      </header>

      <div className={`j-world${shake ? " is-shaken" : ""}`} key={`shake-${shake}`}>
        <Scene progress={progress} stops={STOPS} sex={sex} pose={pose} />
        {float && (
          <span key={float.key} className={`j-float ${float.delta > 0.04 ? "is-heal" : float.delta < -0.04 ? "is-hurt" : "is-even"}`} aria-hidden="true">
            {signed(float.delta)}
          </span>
        )}
        {hp !== null && profile && (
          <section className="j-hud" aria-label="Состояние героя">
            <div className={`j-hp${reveal ? (reveal.delta > 0.04 ? " is-heal" : reveal.delta < -0.04 ? " is-hurt" : "") : ""}`}>
              <Heart className="j-hp__heart" size={22} strokeWidth={2} aria-hidden="true" />
              <p>
                <span className="j-hp__who">{name.trim() || "Герой"}</span>
                <b>{decimal(reveal ? hp + reveal.delta : hp)}</b> <span>{plural(1.5, YEARS)}</span>
              </p>
              <span className="j-hp__bar" aria-hidden="true">
                <i className="j-hp__ghost" style={{ "--fill": fill(reveal ? hp + reveal.delta : hp, profile.age) } as CSSProperties} />
                <i className="j-hp__fill" style={{ "--fill": fill(reveal ? hp + reveal.delta : hp, profile.age) } as CSSProperties} />
              </span>
            </div>
            <p className="j-reserve">
              <Gem size={16} strokeWidth={2} aria-hidden="true" />
              <span>
                Резерв <b>{signed(reserve)}</b>
              </span>
            </p>
          </section>
        )}
      </div>

      <main id="main" className="quiz j-stage">
        <p className="visually-hidden" role="status">
          {said}
        </p>
        {camp && <CampPanel camp={camp} headingRef={campHeading} onGo={leaveCamp} />}
        {finale && <FinalePanel finale={finale} headingRef={campHeading} onOpen={() => router.push("/result")} />}
        {!camp && !finale && (
          <form className="j-form" onSubmit={onSubmit} noValidate key={id}>
            <p className="j-block">{blockTitle}</p>
            {id === "name" && <NameStep headingRef={headingRef} />}
            {id === "age" && <AgeStep key="age" headingRef={headingRef} error={error} />}
            {factor?.kind === "country" && <CountryStep key={factor.slug} factor={factor} headingRef={headingRef} error={error} />}
            {factor?.kind === "bmi" && <BodyStep key="body" headingRef={headingRef} error={error} />}
            {isChoice && (
              <fieldset>
                {id === "sex" && <Question look={look} headingRef={headingRef} title="Кто отправляется в путь?" help="У мужчин и женщин разная исходная продолжительность жизни." helpId="help-sex" />}
                {id === "labs" && (
                  <Question look={look} headingRef={headingRef} title="Свернуть в лабораторию?" help="Холестерин, сахар, СРБ и омега-3 за год." helpId="help-labs" />
                )}
                {factor && <Question look={look} headingRef={headingRef} title={factor.question} help={factor.help} helpId={`help-${factor.slug}`} />}
                <Cards
                  name={id}
                  look={look}
                  options={
                    id === "sex"
                      ? [
                          { id: "female", label: "Женщина" },
                          { id: "male", label: "Мужчина" },
                        ]
                      : id === "labs"
                        ? [
                            { id: "yes", label: "Да, у меня есть цифры" },
                            { id: "skip", label: "Нет, сразу к вершине" },
                          ]
                        : factor!.options
                  }
                  value={id === "sex" ? sex : id === "labs" ? labs : answers[id]}
                  onChange={(v) => {
                    if (id === "sex") setSex(v as "male" | "female");
                    else if (id === "labs") setLabs(v as "yes" | "skip");
                    else answer(id, v);
                  }}
                  onPlay={resolve}
                  reveal={reveal}
                  describedBy={factor?.help ? `help-${factor.slug}` : id === "sex" ? "help-sex" : id === "labs" ? "help-labs" : undefined}
                  error={error}
                />
              </fieldset>
            )}
            <div className="j-nav">
              <button type="submit" className="btn j-play" disabled={Boolean(reveal)}>
                {isChoice ? "Сыграть карту" : STEPS[step] === "country-next" ? "Отправиться в путь" : "Дальше"}
              </button>
              {step > 0 && (
                <button type="button" className="j-back" onClick={flow.back} disabled={Boolean(reveal)}>
                  <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
                  Назад
                </button>
              )}
            </div>
            {factor && (
              <details className="quiz__more j-why">
                <summary>Почему спрашиваем</summary>
                <p>{nb(factor.summary)}</p>
              </details>
            )}
          </form>
        )}
      </main>
    </div>
  );
}

/** The bar shows the years left: from today's age to a hundred. */
const fill = (hp: number, age: number) => Math.min(Math.max((hp - age) / Math.max(100 - age, 1), 0.02), 1).toFixed(3);

function CampPanel({ camp, headingRef, onGo }: { camp: Camp; headingRef: RefObject<HTMLHeadingElement | null>; onGo: () => void }) {
  if (camp.kind === "start") {
    return (
      <section className="j-camp" aria-labelledby="camp-title">
        <p className="j-camp__kicker">Начало пути</p>
        <h1 id="camp-title" ref={headingRef} tabIndex={-1}>
          Герой готов
        </h1>
        <p className="j-camp__big">
          <Heart size={28} strokeWidth={2} aria-hidden="true" />
          <b>{decimal(camp.hp)}</b> <span>{plural(1.5, YEARS)}</span>
        </p>
        <p className="j-camp__text">Это стартовое HP: столько в среднем проживёт ваш ровесник в этой стране. Каждая сыгранная карта сдвинет его.</p>
        <button type="button" className="btn j-play" onClick={onGo}>
          В путь
        </button>
      </section>
    );
  }
  const relic = RELICS[camp.group];
  const Relic = relic.icon;
  return (
    <section className="j-camp" aria-labelledby="camp-title">
      <p className="j-camp__kicker">Привал</p>
      <h1 id="camp-title" ref={headingRef} tabIndex={-1}>
        Блок «{groupById(camp.group).title}» пройден
      </h1>
      <p className={`j-camp__delta${camp.delta > 0.04 ? " is-heal" : camp.delta < -0.04 ? " is-hurt" : ""}`}>{signed(camp.delta)} за блок</p>
      <div className="j-relic">
        <span className="j-relic__icon" aria-hidden="true">
          <Relic size={34} strokeWidth={1.75} />
        </span>
        <p>
          <span>Реликвия</span>
          <b>{relic.name}</b>
          <span>
            {camp.n} из {camp.of}
          </span>
        </p>
      </div>
      <button type="button" className="btn j-play" onClick={onGo}>
        В путь
      </button>
    </section>
  );
}

function FinalePanel({ finale, headingRef, onOpen }: { finale: Finale; headingRef: RefObject<HTMLHeadingElement | null>; onOpen: () => void }) {
  return (
    <section className="j-camp j-finale" aria-labelledby="camp-title">
      <p className="j-camp__kicker">Вершина</p>
      <h1 id="camp-title" ref={headingRef} tabIndex={-1}>
        Герой дошёл до конца пути
      </h1>
      <p className="j-camp__big">
        <Heart size={32} strokeWidth={2} aria-hidden="true" />
        <b>{decimal(finale.hp)}</b> <span>{plural(1.5, YEARS)}</span>
      </p>
      <dl className="j-stats">
        <div>
          <dt>Старт</dt>
          <dd>{years(finale.start)}</dd>
        </div>
        <div>
          <dt>За путь</dt>
          <dd>{signed(finale.hp - finale.start)}</dd>
        </div>
        <div>
          <dt>Реликвии</dt>
          <dd>
            {finale.relics} из {finale.of}
          </dd>
        </div>
      </dl>
      {finale.reserve > 0.04 && <p className="j-camp__text">В резерве ещё {signed(finale.reserve)}: их можно вернуть квестами в отчёте.</p>}
      <button type="button" className="btn j-play" onClick={onOpen}>
        Посмотреть результат
      </button>
    </section>
  );
}
