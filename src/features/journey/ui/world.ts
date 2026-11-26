import {
  BriefcaseMedical,
  Compass,
  FlaskConical,
  Footprints,
  HeartHandshake,
  Hourglass,
  KeyRound,
  Apple,
  Shield,
  TreeDeciduous,
  type LucideIcon,
} from "lucide-react";
import type { GroupId } from "@/entities/factor";

/*
 * What each block of questions looks like on the trail: the time of day of
 * its sky and the relic the hero takes at its camp. A relic is the reward for
 * finishing the block, whatever the answers were, so no answer pays more.
 */

export type Biome = "create" | GroupId | "summit";

export const RELICS: Record<GroupId, { name: string; icon: LucideIcon }> = {
  place: { name: "Ключ от дома", icon: KeyRound },
  habits: { name: "Песочные часы", icon: Hourglass },
  movement: { name: "Сапоги-скороходы", icon: Footprints },
  food: { name: "Яблоко молодости", icon: Apple },
  body: { name: "Щит здоровья", icon: Shield },
  road: { name: "Компас путника", icon: Compass },
  mind: { name: "Нить дружбы", icon: HeartHandshake },
  family: { name: "Родовое древо", icon: TreeDeciduous },
  diagnoses: { name: "Походная аптечка", icon: BriefcaseMedical },
  tests: { name: "Колба знаний", icon: FlaskConical },
};
