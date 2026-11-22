import {
  Activity,
  Annoyed,
  Apple,
  Beef,
  Beer,
  BicepsFlexed,
  Car,
  Carrot,
  Check,
  Cigarette,
  CigaretteOff,
  CircleQuestionMark,
  Citrus,
  CloudRain,
  CloudSun,
  CupSoda,
  Dna,
  Droplet,
  Dumbbell,
  Fish,
  Flame,
  Footprints,
  Frown,
  Gauge,
  Globe,
  Ham,
  Heart,
  HeartCrack,
  HeartHandshake,
  HeartPulse,
  Hourglass,
  Laugh,
  MapPin,
  Mars,
  Martini,
  Meh,
  Moon,
  Motorbike,
  NotebookPen,
  PersonStanding,
  Phone,
  Pill,
  Plane,
  Ribbon,
  Salad,
  Sandwich,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Smile,
  Sun,
  TestTube,
  TreeDeciduous,
  UserRound,
  Users,
  Venus,
  Wine,
  X,
  Cake,
} from "lucide-react";
import { falling, icon, rising, type QuestionLook, type Visual } from "@/shared/ui/Visual";

const unknown: Record<string, Visual> = { unknown: icon(CircleQuestionMark) };

/** How each question of the test looks, by step id. Every step and every answer has an entry. */
export const LOOKS: Record<string, QuestionLook> = {
  name: { icon: NotebookPen },
  sex: { icon: UserRound, options: { female: icon(Venus), male: icon(Mars) } },
  age: { icon: Cake },

  "country-before": { icon: MapPin },
  "country-next": { icon: Plane },
  relationship: {
    icon: HeartHandshake,
    options: { married: icon(Users), single: icon(UserRound), divorced: icon(HeartCrack), widowed: icon(Heart) },
  },

  smoking: {
    icon: Cigarette,
    options: {
      never: icon(CigaretteOff),
      quit10: icon(Check, 2),
      quit: icon(Check),
      smokeless: icon(Flame),
      light: icon(Cigarette),
      heavy: icon(Cigarette, 3),
    },
  },
  alcohol: {
    icon: Wine,
    options: rising(["none", "low", "mid", "high", "heavy"], 0),
    hints: [
      { icon: Wine, text: "100 мл вина" },
      { icon: Beer, text: "250 мл пива" },
      { icon: Martini, text: "30 мл крепкого" },
    ],
  },
  sleep: { icon: Moon, options: rising(["lt6", "6to7", "7to8", "8to9", "gt9"]) },

  activity: { icon: Activity, options: rising(["none", "lt150", "150to300", "gt300"], 0) },
  strength: { icon: Dumbbell, options: rising(["none", "lt30", "30to60", "gt60"], 0) },
  muscle: { icon: BicepsFlexed, options: falling(["more", "average", "less"]) },
  steps: {
    icon: Footprints,
    options: rising(["lt4", "4to6", "6to8", "8to10", "gt10"]),
    hints: [{ icon: Footprints, text: "1 000 шагов: около 10 минут ходьбы" }],
  },

  "fruits-vegetables": {
    icon: Apple,
    options: rising(["lt1", "1to2", "3to4", "5plus"]),
    hints: [
      { icon: Apple, text: "1 яблоко" },
      { icon: Carrot, text: "1 морковь" },
      { icon: Salad, text: "тарелка салата" },
    ],
  },
  "processed-meat": {
    icon: Ham,
    options: rising(["rare", "weekly", "often", "daily"]),
    hints: [
      { icon: Ham, text: "ветчина" },
      { icon: Sandwich, text: "колбаса" },
      { icon: Beef, text: "копчёности" },
    ],
  },
  "sugary-drinks": {
    icon: CupSoda,
    options: rising(["rare", "weekly", "daily", "twice"]),
    hints: [
      { icon: CupSoda, text: "газировка" },
      { icon: Citrus, text: "сок из пакета" },
    ],
  },

  bmi: { icon: Scale },
  "blood-pressure": { icon: Gauge, options: { ...rising(["lt120", "120", "130", "140", "160"]), ...unknown } },
  "heart-rate": { icon: HeartPulse, options: { ...rising(["lt60", "60to69", "70to79", "80to89", "gt90"]), ...unknown } },

  "seat-belt": {
    icon: ShieldCheck,
    options: { always: icon(ShieldCheck, 2), front: icon(ShieldCheck), sometimes: icon(ShieldAlert), never: icon(X) },
  },
  "phone-driving": {
    icon: Smartphone,
    options: { nodrive: icon(PersonStanding), never: icon(Car), sometimes: icon(Phone), often: icon(Smartphone, 3) },
  },
  motorcycle: { icon: Motorbike, options: { never: icon(X), sometimes: icon(Motorbike), regular: icon(Motorbike, 3) } },

  "close-people": {
    icon: Users,
    options: { none: icon(X), one2: icon(UserRound), three5: icon(UserRound, 2), six: icon(UserRound, 3) },
  },
  "relationship-quality": {
    icon: Heart,
    options: { great: icon(Laugh), good: icon(Smile), mixed: icon(Meh), poor: icon(Annoyed), bad: icon(Frown) },
  },
  "life-satisfaction": {
    icon: Smile,
    options: { very: icon(Laugh), mostly: icon(Smile), mixed: icon(Meh), low: icon(Annoyed), "very-low": icon(Frown) },
  },
  distress: { icon: CloudRain, options: rising(["rarely", "sometimes", "often", "always"]) },
  optimism: { icon: Sun, options: { bad: icon(CloudRain), mixed: icon(CloudSun), good: icon(Sun) } },

  parents: {
    icon: TreeDeciduous,
    options: {
      alive85: icon(TreeDeciduous, 2),
      long: icon(TreeDeciduous),
      alive: icon(Users),
      short: icon(Hourglass),
      other: icon(CircleQuestionMark),
    },
  },
  "family-heart": { icon: Dna, options: { no: icon(Check), yes: icon(HeartPulse), ...unknown } },
  "family-cancer": { icon: Dna, options: { no: icon(Check), yes: icon(Ribbon), ...unknown } },

  diabetes: { icon: Droplet, options: { no: icon(Check), pre: icon(Droplet), yes: icon(Droplet, 2), ...unknown } },
  "heart-disease": { icon: HeartPulse, options: { no: icon(Check), event: icon(HeartCrack), other: icon(Pill) } },
  cancer: { icon: Ribbon, options: { no: icon(Check), remission: icon(Ribbon), recent: icon(Pill) } },

  labs: { icon: TestTube, options: { yes: icon(TestTube), skip: icon(X) } },
  ldl: { icon: Droplet, options: { ...rising(["lt18", "18to25", "26to33", "34to40", "41to48", "ge49"]), ...unknown } },
  hba1c: { icon: TestTube, options: { ...rising(["lt57", "57to64", "ge65"]), ...unknown } },
  crp: { icon: Flame, options: { ...rising(["lt1", "1to3", "3to10", "gt10"]), ...unknown } },
  omega3: { icon: Fish, options: { ...rising(["lt4", "4to8", "gt8"]), ...unknown } },
};

export const FALLBACK_LOOK: QuestionLook = { icon: Globe };
