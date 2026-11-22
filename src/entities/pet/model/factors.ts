import type { PetFactor, PetOption, Species } from "./types.ts";

/*
 * Questions of the pet test. Hazard ratios are set against the healthiest
 * option (1.0) and rounded from the veterinary cohorts in content.ts; the
 * average pet of those cohorts gives the "typical" answers. Like the human
 * test, every number is a model parameter for review, not a clinical claim.
 */

export const PET_FACTORS: PetFactor[] = [
  {
    slug: "size",
    title: "Размер собаки",
    species: ["dog"],
    modifiable: false,
    question: "Сколько весит ваша собака взрослой?",
    help: "Если щенок ещё растёт, ориентируйтесь на взрослых собак этой породы.",
    options: [
      { id: "small", label: "До 10 кг", hr: 1, group: "dog-small" },
      { id: "medium", label: "От 10 до 25 кг", hr: 1, group: "dog-medium" },
      { id: "large", label: "От 25 до 40 кг", hr: 1, group: "dog-large" },
      { id: "giant", label: "Больше 40 кг", hr: 1, group: "dog-giant" },
    ],
    typical: "medium",
    summary: "Маленькие собаки живут дольше крупных: большие стареют быстрее.",
  },
  {
    slug: "breed",
    title: "Порода",
    species: ["dog", "cat"],
    modifiable: false,
    question: { dog: "Какая у собаки порода?", cat: "Какая у кошки порода?" },
    options: {
      dog: [
        { id: "mixed", label: "Метис или беспородная", hr: 1 },
        { id: "pure", label: "Породистая, с обычной мордой", hr: 1 },
        { id: "flat", label: "С короткой мордой: мопс, французский или английский бульдог, ши-тцу", hr: 2 },
      ],
      cat: [
        { id: "mixed", label: "Беспородная или метис", hr: 1 },
        { id: "pure", label: "Породистая, с обычной мордой", hr: 1.3 },
        { id: "flat", label: "С плоской мордой: персидская, экзотическая", hr: 1.25 },
      ],
    },
    typical: "mixed",
    summary: "Короткая морда мешает дышать и сокращает жизнь собак. Беспородные кошки живут дольше породистых.",
  },
  {
    slug: "neutered",
    title: "Стерилизация",
    species: ["dog", "cat"],
    modifiable: true,
    question: "Питомец стерилизован или кастрирован?",
    options: {
      dog: [
        { id: "yes", label: "Да", goal: "стерилизация", hr: 1 },
        { id: "no", label: "Нет", hr: 1.4, hrBySex: { female: 1.5, male: 1.3 }, improveTo: "yes" },
      ],
      cat: [
        { id: "yes", label: "Да", goal: "стерилизация", hr: 1 },
        { id: "no", label: "Нет", hr: 1.25, improveTo: "yes" },
      ],
    },
    typical: "yes",
    summary: "Стерилизованные кошки и собаки в среднем живут дольше, особенно кошки.",
  },
  {
    slug: "body",
    title: "Вес и сложение",
    species: ["dog", "cat"],
    modifiable: true,
    question: "Какое сложение у питомца?",
    help: "Проведите ладонями по бокам. В норме рёбра прощупываются под тонким слоем жира, а сверху видна талия.",
    options: {
      dog: [
        { id: "thin", label: "Худой: рёбра и позвоночник видны", hr: 1.3, improveTo: "ideal" },
        { id: "ideal", label: "В норме: рёбра прощупываются, талия видна", hr: 1 },
        { id: "over", label: "Полноват: рёбра прощупываются с трудом, талии почти нет", hr: 1.4, improveTo: "ideal" },
        { id: "obese", label: "Толстый: рёбер не прощупать, живот свисает", hr: 1.8, improveTo: "over" },
      ],
      cat: [
        { id: "thin", label: "Худой: рёбра и позвоночник видны", hr: 1.5, improveTo: "ideal" },
        { id: "ideal", label: "В норме: рёбра прощупываются, талия видна", hr: 1 },
        { id: "over", label: "Полноват: рёбра прощупываются с трудом, талии почти нет", hr: 1.15, improveTo: "ideal" },
        { id: "obese", label: "Толстый: рёбер не прощупать, живот свисает", hr: 1.3, improveTo: "over" },
      ],
    },
    typical: "over",
    summary: "Лишний вес отнимает у собак до двух с половиной лет. Резкая худоба часто признак болезни.",
  },
  {
    slug: "activity",
    title: "Движение",
    species: ["dog", "cat"],
    modifiable: true,
    question: {
      dog: "Сколько ваша собака гуляет и бегает за день?",
      cat: "Сколько кошка двигается и играет?",
    },
    options: {
      dog: [
        { id: "low", label: "Меньше 30 минут", hr: 1.1, improveTo: "mid" },
        { id: "mid", label: "От 30 минут до часа", hr: 1.03, improveTo: "high" },
        { id: "high", label: "Больше часа", hr: 1 },
      ],
      cat: [
        { id: "low", label: "Почти не играет, больше лежит", hr: 1.08, improveTo: "mid" },
        { id: "mid", label: "Играет понемногу каждый день", hr: 1.02, improveTo: "high" },
        { id: "high", label: "Активно играет каждый день", hr: 1 },
      ],
    },
    typical: "mid",
    summary: "Движение держит вес и суставы в форме. Прямых данных о годах жизни мало.",
  },
  {
    slug: "outdoors",
    title: "Улица",
    species: ["dog", "cat"],
    modifiable: true,
    question: { dog: "Как гуляет ваша собака?", cat: "Выходит ли кошка на улицу?" },
    options: {
      dog: [
        { id: "safe", label: "Только на поводке или во дворе за забором", hr: 1 },
        { id: "offlead", label: "Иногда без поводка рядом с дорогами", hr: 1, lambda: 0.003, improveTo: "safe" },
        { id: "free", label: "Свободно бегает по улице сама", hr: 1.1, lambda: 0.01, improveTo: "safe" },
      ],
      cat: [
        { id: "safe", label: "Живёт дома, балкон или окна с сеткой", hr: 1 },
        { id: "supervised", label: "Гуляет на шлейке или в огороженном вольере", hr: 1, lambda: 0.002 },
        { id: "free", label: "Свободно гуляет на улице", hr: 1.05, lambda: 0.011, improveTo: "supervised" },
      ],
    },
    typical: { dog: "safe", cat: "free" },
    summary: "Машины, драки и инфекции: свободная улица опаснее всего для молодых животных.",
  },
  {
    slug: "vaccines",
    title: "Прививки",
    species: ["dog", "cat"],
    modifiable: true,
    question: "Питомец получает прививки по графику?",
    options: [
      { id: "regular", label: "Да, каждый год или как назначил ветеринар", hr: 1 },
      { id: "lapsed", label: "Прививали раньше, сейчас нет", hr: 1.06, improveTo: "regular" },
      { id: "never", label: "Никогда не прививали", hr: 1.15, improveTo: "regular" },
    ],
    typical: "regular",
    summary: "Чума, парвовирус и бешенство до сих пор убивают непривитых собак и кошек.",
  },
  {
    slug: "parasites",
    title: "Паразиты",
    species: ["dog", "cat"],
    modifiable: true,
    question: "Обрабатываете ли вы питомца от глистов, блох и клещей?",
    options: [
      { id: "regular", label: "Да, регулярно", hr: 1 },
      { id: "sometimes", label: "Иногда", hr: 1.02, improveTo: "regular" },
      { id: "never", label: "Нет", hr: 1.05, improveTo: "regular" },
    ],
    typical: "regular",
    summary: "Клещи переносят пироплазмоз, комары дирофиляриоз. Обработка дешевле лечения.",
  },
  {
    slug: "vet",
    title: "Осмотры",
    species: ["dog", "cat"],
    modifiable: true,
    question: "Как часто питомец бывает у ветеринара?",
    options: [
      { id: "yearly", label: "Раз в год и чаще, даже здоровым", hr: 1 },
      { id: "sick", label: "Только когда заболеет", hr: 1.05, improveTo: "yearly" },
      { id: "never", label: "Почти никогда", hr: 1.1, improveTo: "yearly" },
    ],
    typical: "sick",
    summary: "Болезни почек, сердца и зубов у животных долго не видны, осмотр находит их раньше.",
  },
  {
    slug: "teeth",
    title: "Зубы",
    species: ["dog", "cat"],
    modifiable: true,
    question: "Есть ли у питомца зубной камень, запах изо рта или красные дёсны?",
    options: [
      { id: "no", label: "Нет", goal: "чистые зубы и здоровые дёсны", hr: 1 },
      { id: "yes", label: "Да", hr: 1.15, improveTo: "no" },
      { id: "unknown", label: "Не знаю", hr: 1.15, unknown: true },
    ],
    typical: "yes",
    summary: "Болезни дёсен есть у большинства взрослых собак и кошек и связаны с болезнями почек и сердца.",
  },
  {
    slug: "diet",
    title: "Корм",
    species: ["dog", "cat"],
    modifiable: true,
    question: "Чем вы в основном кормите питомца?",
    options: [
      { id: "complete", label: "Готовым полнорационным кормом", hr: 1 },
      { id: "planned", label: "Домашней едой по совету ветеринара", hr: 1 },
      { id: "table", label: "Едой со стола и объедками", hr: 1.05, improveTo: "complete" },
    ],
    typical: "complete",
    summary: "Еда со стола часто перекармливает и даёт опасное: лук, чеснок, виноград, кости.",
  },
  {
    slug: "chronic",
    title: "Болезни",
    species: ["dog", "cat"],
    modifiable: false,
    question: "Есть ли у питомца хроническая болезнь?",
    help: "Та, что поставил ветеринар и что лечат долго: почки, сердце, диабет, щитовидная железа, суставы.",
    options: [
      { id: "no", label: "Нет", hr: 1 },
      { id: "treated", label: "Да, лечим", hr: 2 },
      { id: "cancer", label: "Онкология", hr: 4 },
    ],
    typical: "no",
    summary: "Хроническая болезнь сокращает срок, но лечение и контроль заметно его продлевают.",
  },
];

export const PET_FACTOR_BY_SLUG = new Map(PET_FACTORS.map((f) => [f.slug, f]));

const bySpecies = <T>(value: T | Record<Species, T>, species: Species): T =>
  typeof value === "object" && value !== null && !Array.isArray(value) && "dog" in value && "cat" in value
    ? (value as Record<Species, T>)[species]
    : (value as T);

export const petQuestion = (f: PetFactor, s: Species) => bySpecies(f.question, s);
export const petHelp = (f: PetFactor, s: Species) => (f.help ? bySpecies(f.help, s) : undefined);
export const petOptions = (f: PetFactor, s: Species): PetOption[] => bySpecies(f.options, s);
export const petTypical = (f: PetFactor, s: Species) => bySpecies(f.typical, s);
export const petFactorsFor = (s: Species) => PET_FACTORS.filter((f) => f.species.includes(s));
