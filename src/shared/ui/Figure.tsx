import type { Parts } from "@/shared/lib/format";

/** A number at display size with its unit a third of the size beside it. */
export function Figure({ parts, className = "figure" }: { parts: Parts; className?: string }) {
  return (
    <p className={className}>
      {parts.num}
      {parts.unit && <small>{`${parts.num ? "\u00a0" : ""}${parts.unit}`}</small>}
    </p>
  );
}
