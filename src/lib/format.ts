const TL_LOCALE = "tr-TR";

export function formatCurrency(
  value: number,
  opts?: { compact?: boolean; showSign?: boolean }
): string {
  const { compact = false, showSign = false } = opts ?? {};

  const formatted = new Intl.NumberFormat(TL_LOCALE, {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...(compact && { notation: "compact", compactDisplay: "short" }),
    ...(showSign && { signDisplay: "exceptZero" }),
  }).format(value);

  return formatted;
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat(TL_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return new Intl.NumberFormat(TL_LOCALE, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

const MONTH_NAMES_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatMonth(period: string): string {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return period;
  const idx = ((month - 1) % 12 + 12) % 12;
  return `${MONTH_NAMES_LONG[idx]} ${year}`;
}

/**
 * Adds `offsetMonths` to a YYYY-MM anchor period and returns a short label.
 * Deterministic — safe to call during SSR.
 */
export function formatMonthWithOffset(period: string, offsetMonths: number): string {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return "";
  const totalMonths = (month - 1) + offsetMonths;
  const targetYear = year + Math.floor(totalMonths / 12);
  const idx = ((totalMonths % 12) + 12) % 12;
  return `${MONTH_NAMES_SHORT[idx]} ${targetYear}`;
}
