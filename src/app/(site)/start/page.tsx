import type { Metadata } from "next";
import Link from "next/link";
import { PET_QUESTIONS, PET_MINUTES } from "@/features/pet-quiz/model/steps";
import { SITE } from "@/shared/config/site";
import { nb } from "@/shared/lib/format";

export const metadata: Metadata = {
  title: "Для кого тест",
  description: "Тест долголетия для себя или для кошки и собаки. Бесплатно, без регистрации.",
};

export default function StartPage() {
  return (
    <section className="section field start" aria-labelledby="start-title">
      <div className="container cols close">
        <div className="close__head">
          <h1 id="start-title">Для кого тест?</h1>
          <p className="lead">
            {nb(
              `Для себя: ${SITE.questions} вопросов, около ${SITE.minutes} минут. Для кошки или собаки: ${PET_QUESTIONS} вопросов, около ${PET_MINUTES} минут.`,
            )}
          </p>
        </div>
        <div className="close__choice">
          <p id="start-question">Кого проверяем</p>
          <ul className="close__options" aria-labelledby="start-question">
            <li>
              <Link href="/test" className="choice-big">
                Себя
              </Link>
            </li>
            <li>
              <Link href="/pet/test" className="choice-big">
                Питомца
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
