/*
 * The visitor's country from the IP address. The site is static, so the
 * browser asks a public service; it sees the address as any site does and gets
 * nothing else: no answers, no cookies, no referrer. The second service is
 * asked only when the first fails. Both are named on /privacy.
 */

export const COUNTRY_SERVICES = [
  { host: "api.country.is", url: "https://api.country.is/" },
  { host: "get.geojs.io", url: "https://get.geojs.io/v1/ip/country.json" },
] as const;

const TIMEOUT_MS = 2500;

let lookup: Promise<string | null> | undefined;

async function ask(url: string): Promise<string | null> {
  const control = new AbortController();
  const timer = window.setTimeout(() => control.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: control.signal, credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store" });
    if (!res.ok) return null;
    const { country } = (await res.json()) as { country?: unknown };
    return typeof country === "string" && /^[A-Z]{2}$/.test(country) ? country : null;
  } catch {
    // Blocked, offline or too slow: the person picks the country by hand.
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

/** ISO 3166 alpha-2 code, or null. One lookup for a page load. */
export function countryByIp(): Promise<string | null> {
  lookup ??= (async () => {
    for (const { url } of COUNTRY_SERVICES) {
      const country = await ask(url);
      if (country) return country;
    }
    return null;
  })();
  return lookup;
}
