import type { Metadata } from "next";
import { PetReportView } from "@/features/pet-report/ui/PetReportView";

export const metadata: Metadata = {
  title: "Отчёт о питомце",
  description: "Прогноз продолжительности жизни кошки или собаки, возраст по-человечески и что обсудить с ветеринаром.",
};

export default function PetReportPage() {
  return <PetReportView />;
}
