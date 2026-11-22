import type { Answers, Profile } from "@/entities/result";

export interface Check {
  id: string;
  title: string;
  text: string;
}

/** What to discuss with a doctor, from the answers and the age. General guidance, never a prescription. */
export function checksFor(profile: Profile, answers: Answers, bmi?: number): Check[] {
  const list: Check[] = [];
  const bp = answers["blood-pressure"];
  if (bp === "unknown") {
    list.push({ id: "bp", title: "Измерьте давление", text: "Повышенное давление годами не ощущается. Измерьте его дома, в аптеке или у терапевта." });
  } else if (bp === "140" || bp === "160") {
    list.push({ id: "bp-high", title: "Обсудите давление с врачом", text: "Давление от 140 и выше обычно лечат. Возьмите на приём записи измерений за неделю." });
  }
  if (answers["heart-rate"] === "unknown") {
    list.push({ id: "pulse", title: "Посчитайте пульс в покое", text: "Сидя, после пяти минут отдыха: удары за 30 секунд, умноженные на два." });
  } else if (answers["heart-rate"] === "gt90") {
    list.push({ id: "pulse-high", title: "Покажите пульс терапевту", text: "Пульс в покое от 90 и выше стоит проверить: обычно начинают с ЭКГ." });
  }
  const diabetes = answers.diabetes;
  const hba1c = answers.hba1c;
  const sugarUnknown = diabetes === "unknown" && (hba1c === undefined || hba1c === "unknown");
  if (sugarUnknown && (profile.age >= 35 || (bmi ?? 0) >= 25)) {
    list.push({ id: "glucose", title: "Проверьте сахар крови", text: "Глюкоза натощак или гликированный гемоглобин (HbA1c). После 35 лет или при лишнем весе раз в три года." });
  } else if (hba1c === "ge65" && diabetes !== "yes") {
    list.push({ id: "glucose-high", title: "Покажите HbA1c врачу", text: "6,5% и выше бывает при диабете. Диагноз подтверждают повторным анализом." });
  } else if (hba1c === "57to64" && diabetes !== "yes" && diabetes !== "pre") {
    list.push({ id: "glucose-pre", title: "Обсудите преддиабет", text: "HbA1c от 5,7 до 6,4% говорит о преддиабете. Вес, движение и меньше сладкого часто возвращают его в норму." });
  }
  const ldl = answers.ldl;
  if ((ldl === undefined || ldl === "unknown") && profile.age >= 30) {
    list.push({ id: "lipids", title: "Сдайте липидный профиль", text: "Общий холестерин, ЛПНП, ЛПВП и триглицериды. Вместе с давлением это основа оценки риска для сердца." });
  } else if (ldl === "ge49") {
    list.push({ id: "lipids-very-high", title: "Обсудите холестерин с врачом", text: "ЛПНП от 4,9 ммоль/л часто бывает наследственным. Обычно его лечат и проверяют родных." });
  } else if (ldl === "41to48") {
    list.push({ id: "lipids-high", title: "Обсудите холестерин с врачом", text: "При ЛПНП от 4,1 ммоль/л решение о лечении зависит от давления, курения и возраста." });
  }
  if (answers.crp === "gt10") {
    list.push({ id: "crp-retest", title: "Пересдайте С-реактивный белок", text: "Выше 10 мг/л обычно бывает при простуде или другой инфекции. Повторите анализ через две или три недели после выздоровления." });
  } else if (answers.crp === "3to10") {
    list.push({ id: "crp-high", title: "Обсудите СРБ с врачом", text: "От 3 до 10 мг/л при повторном анализе может говорить о хроническом воспалении. Врач поищет причину." });
  }
  if (answers["family-heart"] === "yes") {
    list.push({ id: "family", title: "Расскажите о ранних инфарктах в семье", text: "Это повод проверять сердце и сосуды раньше сверстников." });
  }
  if (answers["family-cancer"] === "yes") {
    list.push({ id: "family-cancer", title: "Расскажите о раке у родных", text: "Если рак у близкого был до 50 лет, скрининг этого вида рака иногда начинают раньше." });
  }
  if (profile.age >= 45) {
    list.push({ id: "colon", title: "Спросите о скрининге рака кишечника", text: "Анализ кала на скрытую кровь или колоноскопия: врач подскажет, что и как часто." });
  }
  if (profile.sex === "female" && profile.age >= 40) {
    list.push({ id: "breast", title: "Спросите о маммографии", text: "С какого возраста и как часто её делать, решают по возрасту и семейной истории." });
  }
  if (answers.distress === "often" || answers.distress === "always") {
    list.push({ id: "mind", title: "Поговорите с врачом или психологом", text: "Если тревога или подавленность держатся дольше двух недель, это повод обратиться за помощью." });
  }
  return list;
}
