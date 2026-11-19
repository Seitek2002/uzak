import type { Species } from "@/entities/pet";

export interface PetCheck {
  id: string;
  title: string;
  text: string;
}

/** Age from which a pet counts as senior: giant dogs age earlier. */
export const seniorAge = (species: Species, size?: string) => (species === "dog" && (size === "giant" || size === "large") ? 6 : 7);

/** What to discuss with the vet, from the answers and the age. General guidance, never a prescription. */
export function petChecksFor(species: Species, age: number, answers: Record<string, string>): PetCheck[] {
  const list: PetCheck[] = [];
  const v = answers.vaccines;
  if (v === "never" || v === "lapsed") {
    list.push({
      id: "vaccines",
      title: "Восстановите прививки",
      text:
        species === "dog"
          ? "Чума, парвовирус, лептоспироз и бешенство. Ветеринар составит график, даже если прививки давно пропущены."
          : "Панлейкопения, калицивирус, ринотрахеит и бешенство. Ветеринар составит график, даже если прививки давно пропущены.",
    });
  }
  if (answers.parasites && answers.parasites !== "regular") {
    list.push({
      id: "parasites",
      title: "Наладьте обработку от паразитов",
      text: "Глисты раз в три месяца, клещи и блохи весь тёплый сезон. Для собак спросите о профилактике дирофиляриоза.",
    });
  }
  if (answers.teeth === "yes" || answers.teeth === "unknown") {
    list.push({ id: "teeth", title: "Покажите зубы ветеринару", text: "Камень и воспаление дёсен лечат чисткой под наркозом. Дома помогает щётка и паста для животных." });
  }
  if (answers.body === "over" || answers.body === "obese") {
    list.push({ id: "weight", title: "Составьте план снижения веса", text: "Ветеринар рассчитает норму корма: худеть надо медленно, около 1 или 2% веса в неделю." });
  } else if (answers.body === "thin") {
    list.push({ id: "thin", title: "Проверьте причину худобы", text: "Потеря веса бывает при болезнях почек, щитовидной железы, зубов и паразитах." });
  }
  if (age >= seniorAge(species, answers.size)) {
    list.push({
      id: "senior",
      title: "Анализы крови раз в год",
      text:
        species === "cat"
          ? "После 7 лет: почки (креатинин, SDMA), давление, моча. После 10 лет ещё гормоны щитовидной железы."
          : "Пожилым собакам: общий и биохимический анализ крови, моча, давление, осмотр сердца.",
    });
  }
  if (answers.neutered === "no") {
    list.push({ id: "neuter", title: "Обсудите стерилизацию", text: "Ветеринар подскажет возраст и риски для породы. У кошек польза особенно заметна." });
  }
  if (answers.breed === "flat") {
    list.push({ id: "airway", title: "Проверьте дыхание", text: "Храп, одышка и обмороки при жаре бывают от короткой морды. Это лечат, в том числе операцией." });
  }
  if (answers.outdoors === "free") {
    list.push({ id: "outdoors", title: "Чип и ошейник с телефоном", text: "Гуляющим животным нужны прививка от бешенства и обработка от клещей, а чип поможет найти потерявшегося." });
  }
  if (answers.vet === "sick" || answers.vet === "never") {
    list.push({ id: "vet", title: "Осмотр раз в год", text: "Даже здоровым: ветеринар взвесит, послушает сердце, посмотрит зубы и при необходимости назначит анализы." });
  }
  return list;
}
