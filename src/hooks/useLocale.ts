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
};

export type Locale = {
  country: string;
  currency: string;
  locale: string;
  rate: number;
};

const STORAGE_KEY = "ec_locale_v1";

function detectFromBrowser(): Locale {
  const lang =
    typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US";
  const country = lang.split("-")[1]?.toUpperCase() || "US";
  const cfg = COUNTRY_TO_CURRENCY[country] ?? { currency: "USD", locale: "en-US" };
  return {
    country,
    currency: cfg.currency,
    locale: cfg.locale,
    rate: USD_TO[cfg.currency] ?? 1,
  };
}

export function useLocale(): Locale {
  const [loc, setLoc] = useState<Locale>(detectFromBrowser);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        setLoc(JSON.parse(cached));
        return;
      }
    } catch {}

    let cancelled = false;
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
        if (!cancelled) {
          setLoc(next);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {}
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
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
