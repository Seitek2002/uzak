import type { Metadata } from "next";
import { ReportView } from "@/features/report/ui/ReportView";

export const metadata: Metadata = {
  title: "Мой отчёт",
  description: "Прогноз, потенциал, биологический возраст и карта факторов по вашим ответам.",
};

export default function ReportPage() {
  return <ReportView />;
}
