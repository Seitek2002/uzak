/** Ала, the tortoise who asks the questions: a long life in one animal. Drawn for an avatar circle. */
export function Mascot({ size = 44 }: { size?: number }) {
  return (
    <svg className="c-mascot" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="24" className="c-mascot__bg" />
      <path d="M11 33 L11 37 Q11 39 13 39 L15 39 Q17 39 17 37 L17 33 Z M29 33 L29 37 Q29 39 31 39 L33 39 Q35 39 35 37 L35 33 Z" className="c-mascot__skin" />
      <path d="M33 27 Q36 20 41 20 Q46 20 46 25 Q46 29 41 29 L35 30 Z" className="c-mascot__skin" />
      <circle cx="42.4" cy="23.6" r="1.3" className="c-mascot__eye" />
      <path d="M42 26.6 Q43.4 27.4 44.6 26.4" className="c-mascot__line" />
      <path d="M7 33 Q8 16 23 14 Q38 16 39 33 Z" className="c-mascot__shell" />
      <path d="M17 33 L19 25 L27 25 L29 33 M19 25 L15 19 M27 25 L31 19 M23 14 L23 19 L19 25 M23 19 L27 25 M8.5 27 L15 26 L17 33 M37.6 27 L31 26 L29 33" className="c-mascot__plates" />
      <path d="M6 33 L40 33" className="c-mascot__rim" />
    </svg>
  );
}
