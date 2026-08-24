export const CATEGORIES = [
  { id: "entertainment", label: "Развлечения", color: "#7c6cff" },
  { id: "software", label: "Софт", color: "#3ec3ff" },
  { id: "work", label: "Работа", color: "#2dd4a0" },
  { id: "utilities", label: "Коммуналка", color: "#e8d5b5" },
];

export const CURRENCIES = [
  { id: "RUB", symbol: "₽", label: "Российский рубль" },
  { id: "USD", symbol: "$", label: "Доллар США" },
  { id: "EUR", symbol: "€", label: "Евро" },
];

export const PERIODS = [
  { id: "month", label: "Месяц" },
  { id: "year", label: "Год" },
];

export const RATES_TO_RUB = {
  RUB: 1,
  USD: 92,
  EUR: 100,
};

export function categoryMeta(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];
}

export function currencyMeta(id) {
  return CURRENCIES.find((c) => c.id === id) || CURRENCIES[0];
}

export function toMonthlyRub(price, currency, period) {
  const rub = Number(price) * (RATES_TO_RUB[currency] || 1);
  return period === "year" ? rub / 12 : rub;
}

export function formatMoney(amount, currency = "RUB", digits = 0) {
  const { symbol } = currencyMeta(currency);
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  const sign = amount < 0 ? "−" : "";
  if (currency === "USD") return `${sign}${symbol}${formatted}`;
  if (currency === "EUR") return `${sign}${symbol}${formatted}`;
  return `${sign}${formatted} ${symbol}`;
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysUntil(isoDate, from = new Date()) {
  const target = startOfDay(isoDate);
  const today = startOfDay(from);
  return Math.round((target - today) / 86400000);
}

export function formatDate(isoDate) {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function pluralDays(n) {
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дня";
  return "дней";
}

export function dueLabel(days) {
  if (days < 0) return `Просрочено на ${Math.abs(days)} ${pluralDays(days)}`;
  if (days === 0) return "Спишется сегодня";
  if (days === 1) return "Спишется завтра";
  return `Спишется через ${days} ${pluralDays(days)}`;
}

export function monthsBetween(fromIso, to = new Date()) {
  const from = startOfDay(fromIso);
  const now = startOfDay(to);
  const months =
    (now.getFullYear() - from.getFullYear()) * 12 +
    (now.getMonth() - from.getMonth()) +
    (now.getDate() >= from.getDate() ? 0 : -1);
  return Math.max(0, months);
}
