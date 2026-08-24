import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  ArrowDownWideNarrow,
  CalendarClock,
  Check,
  Plus,
  Sparkles,
  Trash2,
  TrendingDown,
  Wallet,
  X,
} from "lucide-react";
import { html } from "./html.js";
import { CANCEL_GUIDES } from "./data.js";
import { loadSubscriptions, saveSubscriptions } from "./storage.js";
import { ICON_OPTIONS, guessIcon, iconMeta } from "./icons.js";
import {
  CATEGORIES,
  CURRENCIES,
  PERIODS,
  categoryMeta,
  currencyMeta,
  daysUntil,
  dueLabel,
  formatDate,
  formatMoney,
  monthsBetween,
  toMonthlyRub,
} from "./utils.js";

const emptyForm = () => ({
  name: "",
  price: "",
  currency: "RUB",
  nextBilling: "",
  category: "entertainment",
  period: "month",
  icon: "plus",
});

export default function App() {
  const [items, setItems] = useState(() => loadSubscriptions());
  const [sort, setSort] = useState("date");
  const [tab, setTab] = useState("active");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState("");
  
  // Состояние тумблера уведомлений
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem("tg_notifications");
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  // Функция синхронизации с бэкендом (Render)
  const syncWithServer = (enabledState, currentItems) => {
    try {
      const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      if (!tgUser) return; // Если открыто не в Telegram, просто пропускаем

      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram_id: tgUser.id,
          notifications_enabled: enabledState,
          subscriptions: currentItems,
        }),
      }).catch((err) => console.log("Sync error:", err));
    } catch (e) {
      console.log("Telegram WebApp not available");
    }
  };

  // Обработка переключения тумблера уведомлений
  const handleToggleNotifications = () => {
    const nextState = !notificationsEnabled;
    setNotificationsEnabled(nextState);
    
    try {
      localStorage.setItem("tg_notifications", JSON.stringify(nextState));
    } catch {}

    // Отправляем на сервер актуальный статус и список подписок
    syncWithServer(nextState, items);
  };

  // Сохраняем локально и отправляем на сервер при изменении подписок (если уведомления включены)
  useEffect(() => {
    saveSubscriptions(items);
    if (notificationsEnabled) {
      syncWithServer(true, items);
    }
  }, [items]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const active = items.filter((s) => s.status !== "archived");
  const archived = items.filter((s) => s.status === "archived");

  const monthlyTotal = useMemo(
    () => active.reduce((sum, s) => sum + toMonthlyRub(s.price, s.currency, s.period), 0),
    [active]
  );

  const yearlyTotal = monthlyTotal * 12;

  const upcoming = active.filter((s) => {
    const d = daysUntil(s.nextBilling);
    return d >= 0 && d <= 3;
  });

  const savedMonthly = archived.reduce(
    (sum, s) => sum + toMonthlyRub(s.price, s.currency, s.period),
    0
  );
  const savedAccrued = archived.reduce((sum, s) => {
    const monthly = toMonthlyRub(s.price, s.currency, s.period);
    return sum + monthly * (monthsBetween(s.archivedAt) + 1);
  }, 0);

  const byCategory = CATEGORIES.map((cat) => {
    const value = active
      .filter((s) => s.category === cat.id)
      .reduce((sum, s) => sum + toMonthlyRub(s.price, s.currency, s.period), 0);
    return { ...cat, value, pct: monthlyTotal ? (value / monthlyTotal) * 100 : 0 };
  });

  const donutStops = buildDonutStops(byCategory, monthlyTotal);

  const visible = (tab === "active" ? active : archived).slice().sort((a, b) => {
    if (sort === "price") {
      return toMonthlyRub(b.price, b.currency, b.period) - toMonthlyRub(a.price, a.currency, a.period);
    }
    return daysUntil(a.nextBilling) - daysUntil(b.nextBilling);
  });

  function openAdd() {
    setForm(emptyForm());
    setModal("add");
  }

  function submitAdd(e) {
    e.preventDefault();
    const price = Number(String(form.price).replace(",", "."));
    if (!form.name.trim() || !price || price <= 0 || !form.nextBilling) return;
    const next = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      price,
      currency: form.currency,
      nextBilling: form.nextBilling,
      category: form.category,
      period: form.period,
      icon: form.icon || guessIcon(form.name),
      status: "active",
    };
    setItems((prev) => [next, ...prev]);
    setModal(null);
    setToast("Подписка добавлена");
  }

  function archiveItem(id) {
    setItems((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: "archived", archivedAt: new Date().toISOString().slice(0, 10) }
          : s
      )
    );
    setModal(null);
    setToast("Подписка в архиве — экономия посчитана");
  }

  function restoreItem(id) {
    setItems((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "active", archivedAt: undefined } : s))
    );
    setToast("Подписка снова активна");
  }

  function deleteItem(id) {
    setItems((prev) => prev.filter((s) => s.id !== id));
    setToast("Подписка полностью удалена");
  }

  const cancelTarget = modal && typeof modal === "object" && modal.type === "cancel" ? modal.item : null;

  return html`
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-mint-400">
              <${Sparkles} className="h-3.5 w-3.5" />
              Folio
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Личные подписки
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
              Сколько уходит каждый месяц, что спишется на днях и где можно отменить.
            </p>
          </div>
          
          <div className="flex flex-col items-start gap-3 sm:items-end">
            {/* Блок переключателя уведомлений */}
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-left">
                <p className="text-xs font-bold text-white">Уведомления в Telegram</p>
                <p className="text-[10px] text-zinc-400">Напоминать о платежах</p>
              </div>
              <button
                type="button"
                onClick=${handleToggleNotifications}
                className=${`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notificationsEnabled ? "bg-mint-400" : "bg-zinc-700"
                }`}
              >
                <span
                  className=${`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    notificationsEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <button
              type="button"
              onClick=${openAdd}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-mint-400 px-5 py-3 text-sm font-bold text-ink-950 shadow-glow transition hover:bg-mint-300"
            >
              <${Plus} className="h-4 w-4" />
              Добавить подписку
            </button>
          </div>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <${StatCard}
            label="В месяц"
            hint="все активные, в ₽"
            value=${formatMoney(monthlyTotal, "RUB")}
            icon=${Wallet}
          />
          <${StatCard}
            label="В год"
            hint="× 12 месяцев"
            value=${formatMoney(yearlyTotal, "RUB")}
            icon=${CalendarClock}
            tone="champagne"
          />
          <${StatCard}
            label="Скоро спишется"
            hint="ближайшие 3 дня"
            value=${String(upcoming.length)}
            suffix=${pluralPayments(upcoming.length)}
            icon=${AlertTriangle}
            tone=${upcoming.length ? "alert" : "ok"}
          />
          <${StatCard}
            label="Экономия из архива"
            hint=${`${formatMoney(savedMonthly, "RUB")}/мес освобождено`}
            value=${formatMoney(savedAccrued, "RUB")}
            icon=${TrendingDown}
            tone="mint"
          />
        </section>

        <section className="mb-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="glass shadow-card rounded-3xl border border-white/10 p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Траты по категориям</h2>
              <span className="text-xs text-zinc-500">доля от месячного бюджета</span>
            </div>
            <div className="space-y-4">
              ${byCategory.map(
                (cat) => html`
                  <div key=${cat.id}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="text-zinc-300">${cat.label}</span>
                      <span className="tabular text-zinc-400">
                        ${formatMoney(cat.value, "RUB")}
                        <span className="ml-2 text-zinc-600">${Math.round(cat.pct)}%</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style=${{
                          width: `${Math.max(cat.pct, cat.value ? 2 : 0)}%`,
                          background: cat.color,
                        }}
                      />
                    </div>
                  </div>
                `
              )}
            </div>
          </div>

          <div className="glass shadow-card flex flex-col justify-between rounded-3xl border border-white/10 p-5 sm:p-6">
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-white">Структура месяца</h2>
              <p className="mt-1 text-xs text-zinc-500">Условный курс: $1 = 92 ₽, €1 = 100 ₽</p>
            </div>
            <div className="flex items-center gap-6">
              <div
                className="donut relative h-36 w-36 shrink-0 rounded-full"
                style=${{ "--stops": donutStops }}
              >
                <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-ink-900 text-center">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">всего</span>
                  <span className="tabular text-sm font-bold text-white">${formatMoney(monthlyTotal, "RUB")}</span>
                </div>
              </div>
              <ul className="space-y-2 text-sm">
                ${byCategory.map(
                  (cat) => html`
                    <li key=${"l-" + cat.id} className="flex items-center gap-2 text-zinc-400">
                      <span className="h-2.5 w-2.5 rounded-full" style=${{ background: cat.color }} />
                      ${cat.label}
                    </li>
                  `
                )}
              </ul>
            </div>
          </div>
        </section>

        ${upcoming.length > 0 &&
        html`
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-100">
            <${AlertTriangle} className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p>
              <span className="font-semibold">Внимание:</span>
              ${" "}
              ${upcoming.length === 1
                ? `«${upcoming[0].name}» спишется ${dueLabel(daysUntil(upcoming[0].nextBilling)).toLowerCase()}.`
                : `${upcoming.length} подписки спишутся в ближайшие 3 дня.`}
            </p>
          </div>
        `}

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex rounded-2xl border border-white/10 bg-white/[0.03] p-1">
            <${TabBtn} active=${tab === "active"} onClick=${() => setTab("active")} label=${`Активные (${active.length})`} />
            <${TabBtn} active=${tab === "archived"} onClick=${() => setTab("archived")} label=${`Архив (${archived.length})`} />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-400">
            <${ArrowDownWideNarrow} className="h-4 w-4" />
            <select
              value=${sort}
              onChange=${(e) => setSort(e.target.value)}
              className="rounded-xl border border-white/10 bg-ink-800 px-3 py-2 text-sm text-white outline-none focus:border-mint-400/50"
            >
              <option value="date">По ближайшему платежу</option>
              <option value="price">По цене (мес.)</option>
            </select>
          </label>
        </div>

        ${visible.length === 0
          ? html`
              <div className="rounded-3xl border border-dashed border-white/15 px-6 py-16 text-center text-zinc-500">
                ${tab === "active" ? "Нет активных подписок — добавьте первую." : "Архив пуст."}
              </div>
            `
          : html`
              <div className="grid gap-4 md:grid-cols-2">
                ${visible.map(
                  (item) => html`
                    <${SubscriptionCard}
                      key=${item.id}
                      item=${item}
                      onCancel=${() => setModal({ type: "cancel", item })}
                      onRestore=${() => restoreItem(item.id)}
                      onDelete=${() => deleteItem(item.id)}
                    />
                  `
                )}
              </div>
            `}
      </div>

      ${modal === "add" &&
      html`
        <${Modal} title="Новая подписка" onClose=${() => setModal(null)}>
          <form className="space-y-4" onSubmit=${submitAdd}>
            <${Field} label="Название сервиса">
              <input
                required
                value=${form.name}
                onChange=${(e) => {
                  const name = e.target.value;
                  setForm((f) => ({ ...f, name, icon: guessIcon(name) }));
                }}
                placeholder="Netflix, Spotify, iCloud…"
                className=${inputCls}
              />
            </${Field}>
            <div className="grid grid-cols-2 gap-3">
              <${Field} label="Стоимость">
                <input
                  required
                  inputMode="decimal"
                  value=${form.price}
                  onChange=${(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="899"
                  className=${inputCls}
                />
              </${Field}>
              <${Field} label="Валюта">
                <select
                  value=${form.currency}
                  onChange=${(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  className=${inputCls}
                >
                  ${CURRENCIES.map(
                    (c) => html`<option key=${c.id} value=${c.id}>${c.symbol} ${c.id}</option>`
                  )}
                </select>
              </${Field}>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <${Field} label="Дата следующего списания">
                <input
                  required
                  type="date"
                  value=${form.nextBilling}
                  onChange=${(e) => setForm((f) => ({ ...f, nextBilling: e.target.value }))}
                  className=${inputCls}
                />
              </${Field}>
              <${Field} label="Период">
                <select
                  value=${form.period}
                  onChange=${(e) => setForm((f) => ({ ...f, period: e.target.value }))}
                  className=${inputCls}
                >
                  ${PERIODS.map((p) => html`<option key=${p.id} value=${p.id}>${p.label}</option>`)}
                </select>
              </${Field}>
            </div>
            <${Field} label="Категория">
              <div className="grid grid-cols-2 gap-2">
                ${CATEGORIES.map(
                  (c) => html`
                    <button
                      key=${c.id}
                      type="button"
                      onClick=${() => setForm((f) => ({ ...f, category: c.id }))}
                      className=${`rounded-xl border px-3 py-2 text-left text-sm transition ${
                        form.category === c.id
                          ? "border-mint-400/40 bg-mint-400/10 text-white"
                          : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20"
                      }`}
                    >
                      ${c.label}
                    </button>
                  `
                )}
              </div>
            </${Field}>
            <${Field} label="Иконка сервиса">
              <div className="flex flex-wrap gap-2">
                ${ICON_OPTIONS.map((opt) => {
                  const Icon = opt.Icon;
                  return html`
                    <button
                      key=${opt.id}
                      type="button"
                      onClick=${() => setForm((f) => ({ ...f, icon: opt.id }))}
                      className=${`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                        form.icon === opt.id
                          ? "border-mint-400/50 bg-white/10"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20"
                      }`}
                    >
                      <${Icon} className=${`h-4 w-4 ${opt.fg}`} />
                    </button>
                  `;
                })}
              </div>
            </${Field}>
            <button
              type="submit"
              className="w-full rounded-2xl bg-mint-400 py-3 text-sm font-bold text-ink-950 transition hover:bg-mint-300"
            >
              Сохранить
            </button>
          </form>
        </${Modal}>
      `}

      ${cancelTarget &&
      html`
        <${CancelModal}
          item=${cancelTarget}
          onClose=${() => setModal(null)}
          onArchive=${() => archiveItem(cancelTarget.id)}
        />
      `}

      ${toast &&
      html`
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-white/10 bg-ink-800 px-4 py-2.5 text-sm text-white shadow-card">
          ${toast}
        </div>
      `}
    </div>
  `;
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-mint-400/40";

function StatCard({ label, hint, value, suffix, icon: Icon, tone = "default" }) {
  const tones = {
    default: "text-white",
    champagne: "text-champagne",
    mint: "text-mint-400",
    alert: "text-amber-300",
    ok: "text-zinc-300",
  };
  return html`
    <div className="glass shadow-card rounded-3xl border border-white/10 p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">${label}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5">
          <${Icon} className="h-4 w-4 text-zinc-300" />
        </div>
      </div>
      <p className=${`tabular text-2xl font-extrabold tracking-tight sm:text-[28px] ${tones[tone]}`}>
        ${value}
        ${suffix && html`<span className="ml-1 text-sm font-semibold text-zinc-500">${suffix}</span>`}
      </p>
      <p className="mt-1 text-xs text-zinc-500">${hint}</p>
    </div>
  `;
}

function TabBtn({ active, onClick, label }) {
  return html`
    <button
      type="button"
      onClick=${onClick}
      className=${`rounded-xl px-4 py-2 text-sm font-semibold transition ${
        active ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      ${label}
    </button>
  `;
}

function SubscriptionCard({ item, onCancel, onRestore, onDelete }) {
  const days = daysUntil(item.nextBilling);
  const warn = item.status !== "archived" && days <= 3;
  const cat = categoryMeta(item.category);
  const cur = currencyMeta(item.currency);
  const monthly = toMonthlyRub(item.price, item.currency, item.period);
  const meta = iconMeta(item.icon);
  const Icon = meta.Icon;
  const original =
    item.period === "year"
      ? `${formatMoney(item.price, item.currency, item.currency === "RUB" ? 0 : 2)} / год`
      : `${formatMoney(item.price, item.currency, item.currency === "RUB" ? 0 : 2)} / мес`;

  return html`
    <article
      className=${`shadow-card relative overflow-hidden rounded-3xl border p-5 ${
        warn ? "border-amber-400/25 bg-amber-400/[0.04]" : "border-white/10 bg-ink-800/80"
      }`}
    >
      <div className="flex gap-4">
        <div
          className=${`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.tint}`}
        >
          <${Icon} className=${`h-5 w-5 ${meta.fg}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="truncate font-bold text-white">${item.name}</h3>
              <p className="mt-0.5 text-xs text-zinc-500">${cat.label} · ${item.period === "year" ? "год" : "месяц"}</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="text-right">
                <p className="tabular text-lg font-extrabold text-white">
                  ${formatMoney(item.price, item.currency, item.currency === "RUB" ? 0 : 2)}
                </p>
                <p className="text-[11px] text-zinc-500">${cur.id}${item.period === "year" ? " / год" : " / мес"}</p>
              </div>
              <button
                type="button"
                onClick=${onDelete}
                title="Удалить навсегда"
                className="rounded-xl border border-white/10 p-1.5 text-zinc-500 transition hover:border-rose-400/30 hover:bg-rose-400/10 hover:text-rose-300"
              >
                <${Trash2} className="h-4 w-4" />
              </button>
            </div>
          </div>

          ${warn &&
          html`
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
              <${AlertTriangle} className="h-3 w-3" />
              Внимание, ${dueLabel(days).toLowerCase()}!
            </div>
          `}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
            <span>${item.status === "archived" ? "Было списание" : "Следующее"}: ${formatDate(item.nextBilling)}</span>
            <span className="tabular">≈ ${formatMoney(monthly, "RUB")}/мес</span>
          </div>

          ${item.status === "archived"
            ? html`
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-mint-400">
                    В архиве с ${formatDate(item.archivedAt)} · не платите ${original}
                  </p>
                  <button
                    type="button"
                    onClick=${onRestore}
                    className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/5"
                  >
                    Вернуть
                  </button>
                </div>
              `
            : html`
                <button
                  type="button"
                  onClick=${onCancel}
                  className="mt-4 w-full rounded-xl border border-white/10 py-2.5 text-xs font-semibold text-zinc-300 transition hover:border-rose-400/30 hover:bg-rose-400/5 hover:text-rose-200"
                >
                  Отменить подписку
                </button>
              `}
        </div>
      </div>
    </article>
  `;
}

function Modal({ title, onClose, children }) {
  return html`
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/70" onClick=${onClose} />
      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/10 bg-ink-800 p-5 shadow-card sm:rounded-3xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-white">${title}</h2>
          <button
            type="button"
            onClick=${onClose}
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"
          >
            <${X} className="h-5 w-5" />
          </button>
        </div>
        ${children}
      </div>
    </div>
  `;
}

function Field({ label, children }) {
  return html`
    <div className="block">
      <span className="mb-1.5 block text-xs font-medium text-zinc-400">${label}</span>
      ${children}
    </div>
  `;
}

function CancelModal({ item, onClose, onArchive }) {
  const guide = CANCEL_GUIDES[item.name];
  const monthly = toMonthlyRub(item.price, item.currency, item.period);

  return html`
    <${Modal} title=${`Отмена: ${item.name}`} onClose=${onClose}>
      ${guide
        ? html`
            <ol className="mb-4 list-decimal space-y-2 pl-4 text-sm leading-relaxed text-zinc-300">
              ${guide.steps.map((step, i) => html`<li key=${i}>${step}</li>`)}
            </ol>
            <a
              href=${guide.url}
              target="_blank"
              rel="noreferrer"
              className="mb-5 inline-flex text-sm font-semibold text-mint-400 hover:text-mint-300"
            >
              Открыть страницу отмены →
            </a>
          `
        : html`
            <p className="mb-4 text-sm leading-relaxed text-zinc-300">
              Зайдите в аккаунт сервиса → раздел подписки / billing → Cancel или «Отменить автопродление».
              Если оплата шла через Apple или Google, отменяйте в их магазине приложений.
            </p>
          `}

      <div className="mb-4 rounded-2xl border border-mint-400/20 bg-mint-400/5 p-4">
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-mint-400">
          <${Archive} className="h-3.5 w-3.5" />
          Экономия
        </div>
        <p className="text-sm text-zinc-300">
          Если убрать ${`«${item.name}»`} из активных, бюджет станет легче на
          <span className="font-bold text-white"> ${formatMoney(monthly, "RUB")}</span> каждый месяц
          (${formatMoney(monthly * 12, "RUB")} в год).
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick=${onArchive}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-mint-400 py-3 text-sm font-bold text-ink-950 hover:bg-mint-300"
        >
          <${Check} className="h-4 w-4" />
          Я отменил — в архив
        </button>
        <button
          type="button"
          onClick=${onClose}
          className="flex-1 rounded-2xl border border-white/10 py-3 text-sm font-semibold text-zinc-300 hover:bg-white/5"
        >
          Позже
        </button>
      </div>
    </${Modal}>
  `;
}

function pluralPayments(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "платёж";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "платежа";
  return "платежей";
}

function buildDonutStops(cats, total) {
  if (!total) return "#1a1e28 0 100%";
  let cursor = 0;
  const parts = [];
  for (const cat of cats) {
    const next = cursor + cat.pct;
    parts.push(`${cat.color} ${cursor}% ${next}%`);
    cursor = next;
  }
  return parts.join(", ");
}