import { useEffect, useState } from "react";

const COUNTRY_TO_CURRENCY: Record<string, { currency: string; locale: string }> = {
  US: { currency: "USD", locale: "en-US" },
  GB: { currency: "GBP", locale: "en-GB" },
  CA: { currency: "CAD", locale: "en-CA" },
  AU: { currency: "AUD", locale: "en-AU" },
  DE: { currency: "EUR", locale: "de-DE" },
  FR: { currency: "EUR", locale: "fr-FR" },
  ES: { currency: "EUR", locale: "es-ES" },
  IT: { currency: "EUR", locale: "it-IT" },
  NL: { currency: "EUR", locale: "nl-NL" },
  IE: { currency: "EUR", locale: "en-IE" },
  PT: { currency: "EUR", locale: "pt-PT" },
  JP: { currency: "JPY", locale: "ja-JP" },
  CN: { currency: "CNY", locale: "zh-CN" },
  IN: { currency: "INR", locale: "en-IN" },
  BR: { currency: "BRL", locale: "pt-BR" },
  MX: { currency: "MXN", locale: "es-MX" },
  NG: { currency: "NGN", locale: "en-NG" },
  ZA: { currency: "ZAR", locale: "en-ZA" },
  KE: { currency: "KES", locale: "en-KE" },
  AE: { currency: "AED", locale: "en-AE" },
  SG: { currency: "SGD", locale: "en-SG" },
  CH: { currency: "CHF", locale: "de-CH" },
  SE: { currency: "SEK", locale: "sv-SE" },
  NO: { currency: "NOK", locale: "nb-NO" },
  DK: { currency: "DKK", locale: "da-DK" },
  PL: { currency: "PLN", locale: "pl-PL" },
  TR: { currency: "TRY", locale: "tr-TR" },
  KR: { currency: "KRW", locale: "ko-KR" },
  PH: { currency: "PHP", locale: "en-PH" },
  ID: { currency: "IDR", locale: "id-ID" },
  TH: { currency: "THB", locale: "th-TH" },
};

const USD_TO: Record<string, number> = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
  CAD: 1.36,
  AUD: 1.51,
  JPY: 154,
  CNY: 7.2,
  INR: 83,
  BRL: 5.1,
  MXN: 17.1,
  NGN: 1550,
  ZAR: 18.5,
  KES: 129,
  AED: 3.67,
  SGD: 1.35,
  CHF: 0.9,
  SEK: 10.5,
  NOK: 10.6,
  DKK: 6.9,
  PLN: 4.0,
  TRY: 32,
  KRW: 1370,
  PHP: 57,
  IDR: 15800,
  THB: 35,
};

const CURRENCY_TO_LOCALE: Record<string, string> = {
  USD: "en-US",
  GBP: "en-GB",
  EUR: "de-DE",
  CAD: "en-CA",
  AUD: "en-AU",
  JPY: "ja-JP",
  CNY: "zh-CN",
  INR: "en-IN",
  BRL: "pt-BR",
  MXN: "es-MX",
  NGN: "en-NG",
  ZAR: "en-ZA",
  KES: "en-KE",
  AED: "en-AE",
  SGD: "en-SG",
  CHF: "de-CH",
  SEK: "sv-SE",
  NOK: "nb-NO",
  DKK: "da-DK",
  PLN: "pl-PL",
  TRY: "tr-TR",
  KRW: "ko-KR",
  PHP: "en-PH",
  IDR: "id-ID",
  THB: "th-TH",
};

export type Locale = {
  country: string;
  currency: string;
  locale: string;
  rate: number;
};

const GEO_KEY = "ec_locale_v1";
const OVERRIDE_KEY = "ec_currency_override_v1";

function readOverride(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(OVERRIDE_KEY);
    return v && v !== "AUTO" ? v : null;
  } catch {
    return null;
  }
}

function applyOverride(base: Locale, currency: string): Locale {
  return {
    country: base.country,
    currency,
    locale: CURRENCY_TO_LOCALE[currency] ?? base.locale,
    rate: USD_TO[currency] ?? 1,
  };
}

function detectFromBrowser(): Locale {
  const lang = typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US";
  const country = lang.split("-")[1]?.toUpperCase() || "US";
  const cfg = COUNTRY_TO_CURRENCY[country] ?? { currency: "USD", locale: "en-US" };
  return {
    country,
    currency: cfg.currency,
    locale: cfg.locale,
    rate: USD_TO[cfg.currency] ?? 1,
  };
}

function initialLocale(): Locale {
  const base = detectFromBrowser();
  if (typeof window === "undefined") return base;
  try {
    const cached = localStorage.getItem(GEO_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as Locale;
      const o = readOverride();
      return o ? applyOverride(parsed, o) : parsed;
    }
  } catch {
    /* ignore */
  }
  const o = readOverride();
  return o ? applyOverride(base, o) : base;
}

export function useLocale(): Locale {
  const [loc, setLoc] = useState<Locale>(initialLocale);

  useEffect(() => {
    let cancelled = false;
    let geoBase: Locale | null = null;
    try {
      const cached = localStorage.getItem(GEO_KEY);
      if (cached) geoBase = JSON.parse(cached) as Locale;
    } catch {
      /* ignore */
    }

    const apply = (base: Locale) => {
      const override = readOverride();
      setLoc(override ? applyOverride(base, override) : base);
    };

    if (!geoBase) {
      (async () => {
        try {
          const res = await fetch("/api/country");
          if (!res.ok) return;
          const data = await res.json();
          const code = (data.country_code as string)?.toUpperCase();
          if (!code) return;
          const cfg = COUNTRY_TO_CURRENCY[code];
          if (!cfg) return;
          const next: Locale = {
            country: code,
            currency: cfg.currency,
            locale: cfg.locale,
            rate: USD_TO[cfg.currency] ?? 1,
          };
          if (cancelled) return;
          geoBase = next;
          try {
            localStorage.setItem(GEO_KEY, JSON.stringify(next));
          } catch {
            /* ignore */
          }
          apply(next);
        } catch {
          /* ignore */
        }
      })();
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === OVERRIDE_KEY || e.key === GEO_KEY) {
        try {
          const raw = localStorage.getItem(GEO_KEY);
          const fresh = raw ? (JSON.parse(raw) as Locale) : detectFromBrowser();
          apply(fresh);
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("storage", onStorage);

    const onFocus = () => {
      if (geoBase) apply(geoBase);
    };
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return loc;
}

export function formatLocal(usd: number, loc: Locale): string {
  const value = usd * loc.rate;
  return new Intl.NumberFormat(loc.locale, {
    style: "currency",
    currency: loc.currency,
    maximumFractionDigits: 0,
  }).format(value);
}
