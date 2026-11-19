import type { Metadata } from "next";
import { PET_MINUTES, PET_QUESTIONS } from "@/features/pet-quiz/model/steps";
import { PetQuizApp } from "@/features/pet-quiz/ui/PetQuizApp";

export const metadata: Metadata = {
  title: "Тест для питомца",
  description: `До ${PET_QUESTIONS} вопросов о кошке или собаке: порода, вес, улица, прививки и здоровье. Около ${PET_MINUTES} минут.`,
};

export default function PetTestPage() {
  return <PetQuizApp />;
}
