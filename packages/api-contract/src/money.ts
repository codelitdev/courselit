/**
 * Money in CourseLit is stored as an integer in the currency's ISO 4217 minor
 * unit: cents for USD, yen for JPY (no decimals), fils for KWD (three
 * decimals). Every screen and the API convert through these helpers, so a
 * price typed as 10 is 1000 for USD, 10 for JPY and 10000 for KWD.
 */

/** ISO 4217 currencies with no minor unit. */
const ZERO_DECIMAL = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "ISK",
  "JPY",
  "KMF",
  "KRW",
  "PYG",
  "RWF",
  "UGX",
  "UYI",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

/** ISO 4217 currencies with three decimals. */
const THREE_DECIMAL = new Set(["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"]);

function normalize(currency: string): string {
  return currency.trim().toUpperCase();
}

/** Digits after the decimal point in the currency's minor unit. */
export function currencyExponent(currency: string): number {
  const code = normalize(currency);
  if (ZERO_DECIMAL.has(code)) return 0;
  if (THREE_DECIMAL.has(code)) return 3;
  return 2;
}

/**
 * Decimals a price may have. Payment providers charge three-decimal currencies
 * only in steps of 0.010 (the last digit must be 0), so prices stop at two.
 */
export function priceDecimals(currency: string): number {
  return Math.min(currencyExponent(currency), 2);
}

/**
 * A price in major units (10.5) as an integer in the minor unit, rounded to
 * the decimals a price may have. Null when it isn't a non-negative finite
 * amount that fits in a safe integer.
 */
export function majorToMinor(amount: number, currency: string): number | null {
  if (!Number.isFinite(amount) || amount < 0) return null;
  const decimals = priceDecimals(currency);
  const steps = Math.round(amount * 10 ** decimals);
  const minor = steps * 10 ** (currencyExponent(currency) - decimals);
  return Number.isSafeInteger(minor) ? minor : null;
}

/** An integer amount in the minor unit as a major amount (1050 USD → 10.5). */
export function minorToMajor(amountMinor: number, currency: string): number {
  const exponent = currencyExponent(currency);
  return Number((amountMinor / 10 ** exponent).toFixed(exponent));
}

export type FormatMoneyOptions = {
  /** Defaults to the reader's locale. */
  locale?: string;
  /** Drop the decimals of whole amounts: "₹500" rather than "₹500.00". */
  compact?: boolean;
};

/** An amount in the minor unit for people to read, e.g. "$10.50" or "¥1,000". */
export function formatMoney(
  amountMinor: number,
  currency: string,
  options: FormatMoneyOptions = {},
): string {
  const code = normalize(currency);
  const exponent = currencyExponent(code);
  const major = amountMinor / 10 ** exponent;
  const decimals = options.compact && amountMinor % 10 ** exponent === 0 ? 0 : exponent;
  try {
    return new Intl.NumberFormat(options.locale, {
      style: "currency",
      currency: code,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(major);
  } catch {
    return `${code} ${major.toFixed(decimals)}`;
  }
}
