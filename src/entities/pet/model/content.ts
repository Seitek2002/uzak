/*
 * Texts of the pet page: what research found and what to do, with sources.
 * Kept apart from factors.ts so the pet test does not ship them.
 */
import type { Source } from "../../factor/model/types.ts";
import type { PetFactorContent } from "./types.ts";

const pubmed = (title: string) => `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(`"${title}"`)}`;
const paper = (authors: string, title: string, where: string): Source => ({ authors, title, where, href: pubmed(title) });

export const PET_SOURCE = {
  teng2022: paper("Teng KT, Brodbelt DC, Pegram C, Church DB, O'Neill DG.", "Life tables of annual life expectancy and mortality for companion dogs in the United Kingdom", "Sci Rep. 2022;12:6415"),
  teng2024: paper("Teng KT, Brodbelt DC, Church DB, O'Neill DG.", "Life tables of annual life expectancy and risk factors for mortality in cats in the UK", "J Feline Med Surg. 2024;26(5):1098612X241234556"),
  mcmillan2024: paper("McMillan KM, Bielby J, Williams CL, et al.", "Longevity of companion dog breeds: those at risk from early death", "Sci Rep. 2024;14:531"),
  montoya2023: paper("Montoya M, Morrison JA, Arrignon F, et al.", "Life expectancy tables for dogs and cats derived from clinical data", "Front Vet Sci. 2023;10:1082102"),
  kraus2013: paper("Kraus C, Pavard S, Promislow DEL.", "The size-life span trade-off decomposed: why large dogs die young", "Am Nat. 2013;181(4):492-505"),
  hoffman2013: paper("Hoffman JM, Creevy KE, Promislow DEL.", "Reproductive capability is associated with lifespan and cause of death in companion dogs", "PLoS One. 2013;8(4):e61082"),
  mata2025: paper("Mata F.", "Life expectancy of cats in Britain: moggies and mollies live longer", "PeerJ. 2025;13:e18869"),
  salt2019: paper("Salt C, Morris PJ, Wilson D, Lund EM, German AJ.", "Association between life span and body condition in neutered client-owned dogs", "J Vet Intern Med. 2019;33(1):89-99"),
  kealy2002: paper("Kealy RD, Lawler DF, Ballam JM, et al.", "Effects of diet restriction on life span and age-related changes in dogs", "J Am Vet Med Assoc. 2002;220(9):1315-1320"),
  scarlett1998: paper("Scarlett JM, Donoghue S.", "Associations between body condition and disease in cats", "J Am Vet Med Assoc. 1998;212(11):1725-1731"),
  bray2023: paper("Bray EE, Raichlen DA, Forsyth KK, et al.", "Associations between physical activity and cognitive dysfunction in older companion dogs: results from the Dog Aging Project", "GeroScience. 2023;45(2):645-661"),
  oneill2015: paper("O'Neill DG, Church DB, McGreevy PD, Thomson PC, Brodbelt DC.", "Longevity and mortality of cats attending primary care veterinary practices in England", "J Feline Med Surg. 2015;17(2):125-133"),
  taylor2025: paper("Taylor AR, McDonald J, Foreman-Worsley R, Hibbert A, Blackwell EJ.", "Mortality and life table analysis in a young cohort of pet cats in the UK", "J Feline Med Surg. 2025;27(4):1098612X251314689"),
  harris2018: paper("Harris GL, Brodbelt D, Church D, et al.", "Epidemiology, clinical management, and outcomes of dogs involved in road traffic accidents in the United Kingdom (2009-2014)", "J Vet Emerg Crit Care. 2018;28(2):140-148"),
  mylonakis2016: paper("Mylonakis ME, Kalli I, Rallis TS.", "Canine parvoviral enteritis: an update on the clinical diagnosis, treatment, and prevention", "Vet Med (Auckl). 2016;7:91-100"),
  kruse2010: paper("Kruse BD, Unterer S, Horlacher K, Sauter-Louis C, Hartmann K.", "Prognostic factors in cats with feline panleukopenia", "J Vet Intern Med. 2010;24(6):1271-1276"),
  aydin2020: paper("Aydın MF, Altay K, Aytmirzakizi A, Dumanlı N.", "First molecular detection of Dirofilaria immitis and D. repens in dogs from Kyrgyzstan", "Acta Parasitol. 2020;65(4):949-953"),
  kondrashin2020: paper("Kondrashin AV, Morozova LF, Stepanova EV, et al.", "Anthology of Dirofilariasis in Russia (1915-2017)", "Pathogens. 2020;9(4):275"),
  boyd2008: paper("Boyd LM, Langston C, Thompson K, Zivin K, Imanishi M.", "Survival in cats with naturally occurring chronic kidney disease (2000-2002)", "J Vet Intern Med. 2008;22(5):1111-1117"),
  glickman2011: paper("Glickman LT, Glickman NW, Moore GE, et al.", "Association between chronic azotemic kidney disease and the severity of periodontal disease in dogs", "Prev Vet Med. 2011;99(2-4):193-200"),
  trevejo2018: paper("Trevejo RT, Lefebvre SL, Yang M, et al.", "Survival analysis to evaluate associations between periodontal disease and the risk of development of chronic azotemic kidney disease in cats evaluated at primary care veterinary hospitals", "J Am Vet Med Assoc. 2018;252(6):710-720"),
  urfer2019: paper("Urfer SR, Wang M, Yang M, Lund EM, Lefebvre SL.", "Risk factors associated with lifespan in pet dogs evaluated in primary care veterinary hospitals", "J Am Anim Hosp Assoc. 2019;55(3):130-137"),
  callegari2013: paper("Callegari C, Mercuriali E, Hafner M, et al.", "Survival time and prognostic factors in cats with newly diagnosed diabetes mellitus: 114 cases (2000-2009)", "J Am Vet Med Assoc. 2013;243(1):91-95"),
  boswood2016: paper("Boswood A, Häggström J, Gordon SG, et al.", "Effect of pimobendan in dogs with preclinical myxomatous mitral valve disease and cardiomegaly: the EPIC study-a randomized clinical trial", "J Vet Intern Med. 2016;30(6):1765-1779"),
  wang2020: paper("Wang T, Ma J, Hogan AN, et al.", "Quantitative translation of dog-to-human aging by conserved remodeling of the DNA methylome", "Cell Syst. 2020;11(2):176-185"),
  vogt2010: paper("Hoyumpa Vogt A, Rodan I, Brown M, et al.", "AAFP-AAHA: feline life stage guidelines", "J Feline Med Surg. 2010;12(1):43-54"),
} satisfies Record<string, Source>;

const S = PET_SOURCE;

export const PET_CONTENT: Record<string, PetFactorContent> = {
  size: {
    evidence: [
      "По данным 584 тысяч собак в Великобритании медианный срок жизни мелких пород 12,7 года, средних 12,5, крупных 11,9.",
      "В США у собак от 45 кг ожидаемая продолжительность жизни 9,5 года, у мелких 13,5.",
      "Крупные собаки стареют быстрее: риск смерти с возрастом растёт у них круче.",
    ],
    advice: ["Размер не изменить, но крупным собакам анализы и осмотр сердца и суставов нужны раньше, примерно с 6 лет."],
    sources: [S.mcmillan2024, S.montoya2023, S.kraus2013],
  },
  breed: {
    evidence: [
      "У собак с короткой мордой риск ранней смерти в 1,4 раза выше, у французского бульдога в 2,2 раза.",
      "Беспородные кошки живут дольше породистых: 11,9 года против 10,4.",
      "У метисов и породистых собак данные расходятся, поэтому модель их не различает.",
    ],
    advice: ["Если у питомца короткая морда, не перегревайте его, следите за дыханием и держите вес в норме: лишний вес усиливает одышку."],
    sources: [S.mcmillan2024, S.teng2022, S.teng2024, S.mata2025],
  },
  neutered: {
    evidence: [
      "Среди 70 тысяч собак в США стерилизованные жили в среднем 9,4 года, нестерилизованные 7,9.",
      "В британских таблицах стерилизованная сука живёт 12 лет против 10,5, кобель 11,5 против 10,6.",
      "У нестерилизованных кошек риск смерти выше на 23%, а умереть до 3 лет они рискуют вчетверо чаще.",
    ],
    advice: [
      "Обсудите с ветеринаром возраст операции: у крупных собак её иногда откладывают.",
      "После стерилизации питомцу нужно меньше корма, следите за весом.",
    ],
    sources: [S.hoffman2013, S.teng2022, S.teng2024, S.mata2025],
  },
  body: {
    evidence: [
      "Наблюдение за 50 тысячами собак 12 пород: полные собаки жили меньше, от 5 месяцев у немецкой овчарки до 2,5 года у йоркширского терьера.",
      "У лабрадоров, которых кормили на четверть меньше, медианный срок жизни был 13 лет против 11,2.",
      "У кошек с ожирением диабет бывает почти вчетверо чаще.",
    ],
    advice: [
      "Попросите ветеринара назвать идеальный вес и дневную норму корма.",
      "Отмеряйте корм весами, лакомства держите в пределах десятой части нормы.",
    ],
    sources: [S.salt2019, S.kealy2002, S.scarlett1998],
  },
  activity: {
    evidence: [
      "Прямых данных о годах жизни нет. У пожилых собак активность связана с вдвое меньшим риском когнитивных нарушений.",
      "Движение держит вес в норме, а вес уже прямо влияет на срок жизни.",
    ],
    advice: ["Собаке две прогулки в день с бегом и играми, кошке от 10 до 15 минут игры с удочкой каждый день."],
    sources: [S.bray2023, S.salt2019],
  },
  outdoors: {
    evidence: [
      "В Англии травмы стали причиной 12% смертей кошек и почти половины смертей до 5 лет.",
      "В когорте 2 444 молодых кошек машины стали причиной 46% смертей до 8 лет.",
      "Собаки попадают под машины реже и обычно молодыми: медианный возраст 2,5 года.",
    ],
    advice: [
      "Сетки на окна и балкон, для прогулок шлейка или огороженный вольер.",
      "Собаку рядом с дорогой держите на поводке, особенно молодую.",
      "Чип и ошейник с телефоном помогут найти потерявшегося питомца.",
    ],
    sources: [S.oneill2015, S.taylor2025, S.harris2018],
  },
  vaccines: {
    evidence: [
      "Без лечения парвовирусный энтерит переживает около 9% собак, при хорошем лечении больше 80%.",
      "Панлейкопения убивает около половины заболевших кошек даже при лечении.",
      "Прямых сравнений продолжительности жизни привитых и непривитых животных нет, поэтому модель берёт осторожные значения.",
    ],
    advice: ["Щенков и котят прививают сериями, взрослых по графику ветеринара. Прививка от бешенства необходима: оно есть в большинстве стран Азии и Африки и смертельно."],
    sources: [S.mylonakis2016, S.kruse2010],
  },
  parasites: {
    evidence: [
      "В Кыргызстане дирофилярии, среди которых есть сердечный червь, найдены у 2 собак из 337. На юге России они были у каждой пятой.",
      "Блохи и клещи переносят инфекции, глисты истощают щенков и котят.",
    ],
    advice: ["Глисты обрабатывают раз в три месяца, от клещей и блох защищают весь тёплый сезон."],
    sources: [S.aydin2020, S.kondrashin2020],
  },
  vet: {
    evidence: [
      "Прямых данных о том, что осмотры продлевают жизнь, нет. Но болезни почек, сердца и зубов хозяин долго не замечает, а ветеринар находит.",
      "У кошек с болезнью почек на ранней стадии медианная выживаемость больше 3 лет, на последней около 3 месяцев.",
    ],
    advice: ["Раз в год осмотр даже здорового питомца, после 7 лет с анализами крови и мочи."],
    sources: [S.boyd2008],
  },
  teeth: {
    evidence: [
      "У собак с тяжёлой болезнью дёсен риск хронической болезни почек выше в 2,7 раза. У кошек тоже есть такая связь.",
      "У собак регулярная чистка зубов у ветеринара связана с меньшим риском смерти.",
    ],
    advice: ["Чистите зубы щёткой и пастой для животных, камень снимают у ветеринара под наркозом."],
    sources: [S.glickman2011, S.trevejo2018, S.urfer2019],
  },
  diet: {
    evidence: [
      "Исследований, которые сравнивали бы срок жизни на готовом корме и на еде со стола, нет.",
      "Еда со стола чаще ведёт к перекорму, а перекорм сокращает жизнь, как показали опыты на лабрадорах.",
    ],
    advice: ["Кормите полнорационным кормом по возрасту или домашним рационом, который составил ветеринар. Лук, чеснок, виноград и шоколад животным нельзя."],
    sources: [S.kealy2002],
  },
  chronic: {
    evidence: [
      "Половина кошек с болезнью почек живёт больше 3 лет на ранней стадии и около 3 месяцев или больше на последней.",
      "У кошек с диабетом медианная выживаемость после диагноза около 1,5 года, почти половина живёт больше 2 лет.",
      "У собак с болезнью митрального клапана и уже увеличенным сердцем лечение до появления сердечной недостаточности продлевает жизнь.",
    ],
    advice: ["Не пропускайте контрольные анализы и не отменяйте лекарства без ветеринара."],
    sources: [S.boyd2008, S.callegari2013, S.boswood2016],
  },
};

/** Every source of the pet page, for the bibliography at the end. */
export const PET_SOURCES: Source[] = [
  S.teng2022,
  S.teng2024,
  S.mcmillan2024,
  S.montoya2023,
  S.kraus2013,
  S.wang2020,
  S.vogt2010,
  ...Object.values(PET_CONTENT).flatMap((c) => c.sources),
].filter((s, i, all) => all.indexOf(s) === i);
