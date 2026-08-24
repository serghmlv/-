const KEY = "folio-subscriptions-v1";

export function loadSubscriptions() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveSubscriptions(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
}