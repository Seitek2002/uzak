import {
  Bone,
  Bug,
  Cake,
  Cat,
  Check,
  CircleQuestionMark,
  Dog,
  Fence,
  Footprints,
  House,
  Mars,
  NotebookPen,
  PawPrint,
  Pill,
  Ribbon,
  Scale,
  Scissors,
  Stethoscope,
  Syringe,
  Trees,
  UserRound,
  Utensils,
  Venus,
  X,
} from "lucide-react";
import { falling, icon, rising, type QuestionLook } from "@/shared/ui/Visual";

/** How each question of the pet test looks, by step id. */
export const PET_LOOKS: Record<string, QuestionLook> = {
  species: { icon: PawPrint, options: { cat: icon(Cat), dog: icon(Dog) } },
  name: { icon: NotebookPen },
  sex: { icon: PawPrint, options: { female: icon(Venus), male: icon(Mars) } },
  age: { icon: Cake },
  size: { icon: Dog, options: rising(["small", "medium", "large", "giant"]) },
  breed: { icon: PawPrint, options: { mixed: icon(PawPrint), pure: icon(PawPrint, 2), flat: icon(CircleQuestionMark) } },
  neutered: { icon: Scissors, options: { yes: icon(Check), no: icon(X) } },
  body: { icon: Scale, options: rising(["thin", "ideal", "over", "obese"]) },
  activity: { icon: Footprints, options: rising(["low", "mid", "high"]) },
  outdoors: {
    icon: Trees,
    options: { safe: icon(House), supervised: icon(Fence), offlead: icon(UserRound), free: icon(Trees) },
  },
  vaccines: { icon: Syringe, options: falling(["regular", "lapsed", "never"], 0) },
  parasites: { icon: Bug, options: falling(["regular", "sometimes", "never"], 0) },
  vet: { icon: Stethoscope, options: falling(["yearly", "sick", "never"], 0) },
  teeth: { icon: Bone, options: { no: icon(Check), yes: icon(X), unknown: icon(CircleQuestionMark) } },
  diet: { icon: Utensils, options: { complete: icon(Check), planned: icon(Stethoscope), table: icon(Utensils) } },
  chronic: { icon: Pill, options: { no: icon(Check), treated: icon(Pill), cancer: icon(Ribbon) } },
};

export const FALLBACK_PET_LOOK: QuestionLook = { icon: PawPrint };
