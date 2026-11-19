import type { Source } from "./types.ts";

const pubmed = (title: string) =>
  `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(`"${title}"`)}`;
const scholar = (title: string) =>
  `https://scholar.google.com/scholar?q=${encodeURIComponent(`"${title}"`)}`;

function paper(authors: string, title: string, where: string): Source {
  return { authors, title, where, href: pubmed(title) };
}

export const SOURCES = {
  jha2013: paper(
    "Jha P, Ramasundarahettige C, Landsman V, et al.",
    "21st-century hazards of smoking and benefits of cessation in the United States",
    "N Engl J Med. 2013;368:341-350",
  ),
  doll2004: paper(
    "Doll R, Peto R, Boreham J, Sutherland I.",
    "Mortality in relation to smoking: 50 years' observations on male British doctors",
    "BMJ. 2004;328:1519",
  ),
  wood2018: paper(
    "Wood AM, Kaptoge S, Butterworth AS, et al.",
    "Risk thresholds for alcohol consumption: combined analysis of individual-participant data for 599 912 current drinkers in 83 prospective studies",
    "Lancet. 2018;391:1513-1523",
  ),
  cappuccio2010: paper(
    "Cappuccio FP, D'Elia L, Strazzullo P, Miller MA.",
    "Sleep duration and all-cause mortality: a systematic review and meta-analysis of prospective studies",
    "Sleep. 2010;33(5):585-592",
  ),
  arem2015: paper(
    "Arem H, Moore SC, Patel A, et al.",
    "Leisure time physical activity and mortality: a detailed pooled analysis of the dose-response relationship",
    "JAMA Intern Med. 2015;175(6):959-967",
  ),
  momma2022: paper(
    "Momma H, Kawakami R, Honda T, Sawada SS.",
    "Muscle-strengthening activities are associated with lower risk and mortality in major non-communicable diseases: a systematic review and meta-analysis of cohort studies",
    "Br J Sports Med. 2022;56:755-763",
  ),
  paluch2022: paper(
    "Paluch AE, Bajpai S, Bassett DR, et al.",
    "Daily steps and all-cause mortality: a meta-analysis of 15 international cohorts",
    "Lancet Public Health. 2022;7(3):e219-e228",
  ),
  aune2017: paper(
    "Aune D, Giovannucci E, Boffetta P, et al.",
    "Fruit and vegetable intake and the risk of cardiovascular disease, total cancer and all-cause mortality: a systematic review and dose-response meta-analysis of prospective studies",
    "Int J Epidemiol. 2017;46(3):1029-1056",
  ),
  rohrmann2013: paper(
    "Rohrmann S, Overvad K, Bueno-de-Mesquita HB, et al.",
    "Meat consumption and mortality: results from the European Prospective Investigation into Cancer and Nutrition",
    "BMC Med. 2013;11:63",
  ),
  malik2019: paper(
    "Malik VS, Li Y, Pan A, et al.",
    "Long-Term Consumption of Sugar-Sweetened and Artificially Sweetened Beverages and Risk of Mortality in US Adults",
    "Circulation. 2019;139:2113-2125",
  ),
  gbmc2016: paper(
    "The Global BMI Mortality Collaboration.",
    "Body-mass index and all-cause mortality: individual-participant-data meta-analysis of 239 prospective studies in four continents",
    "Lancet. 2016;388:776-786",
  ),
  lewington2002: paper(
    "Lewington S, Clarke R, Qizilbash N, Peto R, Collins R.",
    "Age-specific relevance of usual blood pressure to vascular mortality: a meta-analysis of individual data for one million adults in 61 prospective studies",
    "Lancet. 2002;360:1903-1913",
  ),
  zhang2016: paper(
    "Zhang D, Shen X, Qi X.",
    "Resting heart rate and all-cause and cardiovascular mortality in the general population: a meta-analysis",
    "CMAJ. 2016;188(3):E53-E63",
  ),
  kahane2015: {
    authors: "Kahane CJ.",
    title:
      "Lives saved by vehicle safety technologies and associated Federal Motor Vehicle Safety Standards, 1960 to 2012",
    where: "NHTSA, DOT HS 812 069. 2015",
    href: scholar(
      "Lives saved by vehicle safety technologies and associated Federal Motor Vehicle Safety Standards, 1960 to 2012",
    ),
  },
  dingus2016: paper(
    "Dingus TA, Guo F, Lee S, et al.",
    "Driver crash risk factors and prevalence evaluation using naturalistic driving data",
    "Proc Natl Acad Sci USA. 2016;113(10):2636-2641",
  ),
  holtlunstad2015: paper(
    "Holt-Lunstad J, Smith TB, Baker M, Harris T, Stephenson D.",
    "Loneliness and social isolation as risk factors for mortality: a meta-analytic review",
    "Perspect Psychol Sci. 2015;10(2):227-237",
  ),
  russ2012: paper(
    "Russ TC, Stamatakis E, Hamer M, et al.",
    "Association between psychological distress and mortality: individual participant pooled analysis of 10 prospective cohort studies",
    "BMJ. 2012;345:e4933",
  ),
  rozanski2019: paper(
    "Rozanski A, Bavishi C, Kubzansky LD, Cohen R.",
    "Association of Optimism With Cardiovascular Events and All-Cause Mortality: A Systematic Review and Meta-analysis",
    "JAMA Netw Open. 2019;2(9):e1912200",
  ),
  lee2019: paper(
    "Lee LO, James P, Zevon ES, et al.",
    "Optimism is associated with exceptional longevity in 2 epidemiologic cohorts of men and women",
    "Proc Natl Acad Sci USA. 2019;116(37):18357-18362",
  ),
  pilling2016: paper(
    "Pilling LC, Atkins JL, Bowman K, et al.",
    "Human longevity is influenced by many genetic variants: evidence from 75,000 UK Biobank participants",
    "Aging (Albany NY). 2016;8(3):547-560",
  ),
  lloydjones2004: paper(
    "Lloyd-Jones DM, Nam BH, D'Agostino RB, et al.",
    "Parental cardiovascular disease as a risk factor for cardiovascular disease in middle-aged adults: a prospective study of parents and offspring",
    "JAMA. 2004;291(18):2204-2211",
  ),
  erfc2011: paper(
    "The Emerging Risk Factors Collaboration.",
    "Diabetes mellitus, fasting glucose, and risk of cause-specific death",
    "N Engl J Med. 2011;364:829-841",
  ),
  erfc2015: paper(
    "The Emerging Risk Factors Collaboration.",
    "Association of cardiometabolic multimorbidity with mortality",
    "JAMA. 2015;314(1):52-60",
  ),
  kirkwood2015: paper(
    "Kirkwood TBL.",
    "Deciphering death: a commentary on Gompertz (1825) 'On the nature of the function expressive of the law of human mortality, and on a new mode of determining the value of life contingencies'",
    "Phil Trans R Soc B. 2015;370:20140379",
  ),
  li2018: paper(
    "Li Y, Pan A, Wang DD, et al.",
    "Impact of Healthy Lifestyle Factors on Life Expectancies in the US Population",
    "Circulation. 2018;138:345-355",
  ),
  who2023: {
    authors: "World Health Organization.",
    title: "Global Health Observatory: life tables by country, 2023",
    where: "WHO Global Health Estimates, data for 2023",
    href: "https://www.who.int/data/gho/data/indicators/indicator-details/GHO/gho-ghe-life-tables-by-country",
  },
  inouechoi2017: paper(
    "Inoue-Choi M, Liao LM, Reyes-Guzman C, et al.",
    "Association of Long-term, Low-Intensity Smoking With All-Cause and Cause-Specific Mortality in the National Institutes of Health-AARP Diet and Health Study",
    "JAMA Intern Med. 2017;177(1):87-95",
  ),
  sinha2018: paper(
    "Sinha DN, Suliankatchi RA, Gupta PC, et al.",
    "Global burden of all-cause and cause-specific mortality due to smokeless tobacco use: systematic review and meta-analysis",
    "Tob Control. 2018;27(1):35-42",
  ),
  roelfs2011: paper(
    "Roelfs DJ, Shor E, Kalish R, Yogev T.",
    "The rising relative risk of mortality for singles: meta-analysis and meta-regression",
    "Am J Epidemiol. 2011;174(4):379-389",
  ),
  shor2012: paper(
    "Shor E, Roelfs DJ, Bugyi P, Schwartz JE.",
    "Meta-analysis of marital dissolution and mortality: reevaluating the intersection of gender and age",
    "Soc Sci Med. 2012;75(1):46-59",
  ),
  moon2011: paper(
    "Moon JR, Kondo N, Glymour MM, Subramanian SV.",
    "Widowhood and mortality: a meta-analysis",
    "PLoS One. 2011;6(8):e23465",
  ),
  robles2014: paper(
    "Robles TF, Slatcher RB, Trombello JM, McGinn MM.",
    "Marital quality and health: a meta-analytic review",
    "Psychol Bull. 2014;140(1):140-187",
  ),
  leong2015: paper(
    "Leong DP, Teo KK, Rangarajan S, et al.",
    "Prognostic value of grip strength: findings from the Prospective Urban Rural Epidemiology (PURE) study",
    "Lancet. 2015;386:266-273",
  ),
  cooper2010: paper(
    "Cooper R, Kuh D, Hardy R.",
    "Objectively measured physical capability levels and mortality: systematic review and meta-analysis",
    "BMJ. 2010;341:c4467",
  ),
  nhtsa2024: {
    authors: "National Highway Traffic Safety Administration.",
    title: "Traffic Safety Facts 2022 Data: Motorcycles",
    where: "US Department of Transportation, 2024",
    href: scholar("Traffic Safety Facts 2022 Data: Motorcycles"),
  },
  liu2008: paper(
    "Liu BC, Ivers R, Norton R, et al.",
    "Helmets for preventing injury in motorcycle riders",
    "Cochrane Database Syst Rev. 2008;(1):CD004333",
  ),
  atkins2016: paper(
    "Atkins JL, Pilling LC, Ble A, et al.",
    "Longer-Lived Parents and Cardiovascular Outcomes: 8-Year Follow-Up in 186,000 U.K. Biobank Participants",
    "J Am Coll Cardiol. 2016;68(8):874-875",
  ),
  williamson2014: paper(
    "Williamson C, Jeemon P, Hastie CE, et al.",
    "Family history of premature cardiovascular disease: blood pressure control and long-term mortality outcomes in hypertensive patients",
    "Eur Heart J. 2014;35(9):563-570",
  ),
  johns2001: paper(
    "Johns LE, Houlston RS.",
    "A systematic review and meta-analysis of familial colorectal cancer risk",
    "Am J Gastroenterol. 2001;96(10):2992-3003",
  ),
  cghfbc2001: paper(
    "Collaborative Group on Hormonal Factors in Breast Cancer.",
    "Familial breast cancer: collaborative reanalysis of individual data from 52 epidemiological studies including 58,209 women with breast cancer and 101,986 women without the disease",
    "Lancet. 2001;358:1389-1399",
  ),
  koczwara2021: paper(
    "Koczwara B, Meng R, Miller MD, et al.",
    "Late mortality in people with cancer: a population-based Australian study",
    "Med J Aust. 2021;214(7):318-323",
  ),
  ctt2010: paper(
    "Cholesterol Treatment Trialists' (CTT) Collaboration.",
    "Efficacy and safety of more intensive lowering of LDL cholesterol: a meta-analysis of data from 170,000 participants in 26 randomised trials",
    "Lancet. 2010;376:1670-1681",
  ),
  johannesen2020: paper(
    "Johannesen CDL, Langsted A, Mortensen MB, Nordestgaard BG.",
    "Association between low density lipoprotein and all cause and cause specific mortality in Denmark: prospective cohort study",
    "BMJ. 2020;371:m4266",
  ),
  selvin2010: paper(
    "Selvin E, Steffes MW, Zhu H, et al.",
    "Glycated hemoglobin, diabetes, and cardiovascular risk in nondiabetic adults",
    "N Engl J Med. 2010;362:800-811",
  ),
  erfc2010: paper(
    "The Emerging Risk Factors Collaboration.",
    "C-reactive protein concentration and risk of coronary heart disease, stroke, and mortality: an individual participant meta-analysis",
    "Lancet. 2010;375:132-140",
  ),
  harris2021: paper(
    "Harris WS, Tintle NL, Imamura F, et al.",
    "Blood n-3 fatty acid levels and total and cause-specific mortality from 17 prospective studies",
    "Nat Commun. 2021;12:2329",
  ),
  martinmaria2017: paper(
    "Martín-María N, Miret M, Caballero FF, et al.",
    "The Impact of Subjective Well-being on Mortality: A Meta-Analysis of Longitudinal Studies in the General Population",
    "Psychosom Med. 2017;79(5):565-575",
  ),
  steps2023: {
    authors: "WHO Regional Office for Europe.",
    title: "Kyrgyzstan STEPS survey 2023: data book",
    where: "WHO/Europe, 2026",
    href: "https://iris.who.int/handle/10665/384802",
  },
  aldridge2018: paper(
    "Aldridge RW, Nellums LB, Bartlett S, et al.",
    "Global patterns of mortality in international migrants: a systematic review and meta-analysis",
    "Lancet. 2018;392:2553-2566",
  ),
} satisfies Record<string, Source>;
