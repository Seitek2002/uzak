/*
 * Checks of the bonus-years logic: days, streaks, where a quest leads and how
 * many years it unlocks.
 *
 *   npm run test:game
 */
import { assess } from "../src/entities/result/model/engine.ts";
import { badgesOf, bestStreakOf, bonusOf, dayKey, isReady, QUEST_DAYS, questSlots, questTarget, streakOf, type Quest } from "../src/features/quests/model/quests.ts";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `: ${detail}`}`);
};

const days = (from: string, n: number, step = 1) => {
  const [y, m, d] = from.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => dayKey(new Date(y, m - 1, d + i * step)));
};

check("day keys are local calendar days", dayKey(new Date(2026, 0, 5, 23, 59)) === "2026-01-05");
check("a month and a year roll over", days("2026-12-30", 3).join() === "2026-12-30,2026-12-31,2027-01-01");
check("streak counts up to today", streakOf(days("2026-11-20", 4), "2026-11-23") === 4);
check("streak holds until today is ticked", streakOf(days("2026-11-20", 3), "2026-11-23") === 3);
check("a missed day breaks the streak", streakOf(["2026-11-19", "2026-11-21", "2026-11-22"], "2026-11-23") === 2);
check("an old run is no streak", streakOf(days("2026-11-01", 5), "2026-11-23") === 0);
check("the best run is found", bestStreakOf([...days("2026-11-01", 3), ...days("2026-11-10", 8), "2026-11-10"]) === 8);

const quest = (marks: string[], done?: string): Quest => ({ slug: "steps", from: "lt4", to: "6to8", started: "2026-11-01", marks, done });
check(`a quest is ready after ${QUEST_DAYS} days`, isReady(quest(days("2026-11-01", QUEST_DAYS))));
check("days need not be in a row", isReady(quest(days("2026-10-01", QUEST_DAYS, 2))));
check("a twice-ticked day counts once", !isReady(quest([...days("2026-11-01", QUEST_DAYS - 1), "2026-11-01"])));
check("a finished quest is not ready again", !isReady(quest(days("2026-11-01", QUEST_DAYS), "2026-11-22")));

check("three weeks without cigarettes is a recent quit", questTarget("smoking", "quit10") === "quit");
check("other targets stay the report's", questTarget("steps", "6to8") === "6to8");

const profile = { sex: "male" as const, age: 40 };
const answers = { "country-before": "KGZ", "country-next": "KGZ", smoking: "light", steps: "lt4", activity: "none" };
const date = "2026-11-23T10:00:00.000Z";
const bonus = bonusOf(profile, answers, "smoking", "quit", date);
const direct = assess(profile, { ...answers, smoking: "quit" }, date).forecast - assess(profile, answers, date).forecast;
check("the bonus is the forecast difference of the new answer", Math.abs(bonus - direct) < 1e-9 && bonus > 0, String(bonus));
check("a worse answer unlocks nothing", bonusOf(profile, { ...answers, smoking: "never" }, "smoking", "light", date) === 0);

const result = assess(profile, answers, date);
const slots = questSlots(result, {});
check("three quests are offered", slots.length === 3, String(slots.length));
check("the strongest change comes first", slots[0].gain >= slots[1].gain && slots[1].gain >= slots[2].gain);
check("a smoker's quest leads to a recent quit", slots.find((s) => s.slug === "smoking")?.to === "quit");
const quitter = assess(profile, { ...answers, smoking: "quit" }, date);
check("a recent quitter gets no quest to the same answer", !questSlots(quitter, {}).some((s) => s.slug === "smoking"));
const under = questSlots(result, { "fruits-vegetables": { slug: "fruits-vegetables", from: "lt1", to: "3to4", started: date, marks: [] } });
check("a quest under way keeps its place", under[0].slug === "fruits-vegetables" && under.length === 3);

const none = badgesOf({ attempts: 0, knowsNumbers: false, petAttempts: 0, quests: [] });
check("no badges before the test", none.every((b) => !b.earned) && none.length === 8);
const some = badgesOf({ attempts: 2, knowsNumbers: true, petAttempts: 1, quests: [quest(days("2026-11-01", QUEST_DAYS), "2026-11-22")] });
check("badges follow the facts", some.filter((b) => b.earned).map((b) => b.id).join() === "first,numbers,pet,start,week,quest,again");

console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
