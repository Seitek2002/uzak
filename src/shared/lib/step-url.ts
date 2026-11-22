/*
 * The question number lives in the address bar (?q=5), so the phone's back
 * button returns to the previous question instead of leaving the test.
 */

/** Zero-based step from ?q=, or null when the address has none or it is out of range. */
export function readStepFromUrl(total: number): number | null {
  const q = Number(new URLSearchParams(window.location.search).get("q"));
  return Number.isInteger(q) && q >= 1 && q <= total ? q - 1 : null;
}

/** `editing` keeps edit=1 in the address, so a reload continues the edit and a plain visit does not. */
export function writeStepToUrl(step: number, mode: "push" | "replace", editing: boolean) {
  const params = new URLSearchParams(window.location.search);
  params.set("q", String(step + 1));
  if (editing) params.set("edit", "1");
  else params.delete("edit");
  const url = `${window.location.pathname}?${params.toString()}`;
  if (mode === "push") window.history.pushState(null, "", url);
  else window.history.replaceState(null, "", url);
}

export const isEditLink = () => new URLSearchParams(window.location.search).get("edit") === "1";
