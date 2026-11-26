import type { Metadata } from "next";
import { TestApp } from "@/features/quiz/ui/TestApp";
import { SITE } from "@/shared/config/site";

export const metadata: Metadata = {
  title: "Тест",
  description: `${SITE.questions} вопросов о привычках, теле, семье и анализах. Около ${SITE.minutes} минут, без регистрации.`,
};

export default function TestPage() {
  return <TestApp />;
}
