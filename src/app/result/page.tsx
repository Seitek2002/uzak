import type { Metadata } from "next";
import { ResultScreen } from "@/features/share/ui/ResultScreen";

export const metadata: Metadata = {
  title: "Ваш результат",
  description: "Сколько лет жизни добавят изменения привычек: результат одним экраном, картинка для соцсетей.",
};

export default function ResultPage() {
  return <ResultScreen />;
}
