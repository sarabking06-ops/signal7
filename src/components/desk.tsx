import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ChartCandlestick, Minus, RefreshCw, Search, Star } from "lucide-react";
import { analyzeSymbol, weakEdge, type Bias, type Grade, type SymbolReport } from "@/lib/pa/engine";
import { formatHit, formatPct, formatPx, formatR, formatVol } from "@/lib/pa/format";
import { coinName } from "@/lib/pa/names";
import { fetchBundle, fetchUniverse, type UniverseItem } from "@/lib/market.functions";
import { SetupPanel } from "@/components/setup-panel";

type Status = "pending" | "ready" | "error";

type Row = UniverseItem & {
  status: Status;
  report?: SymbolReport;
  error?: string;
};

type FilterId = "picked" | "A" | "armed" | "watch" | "long" | "short" | "edge" | "star" | "all";
type SortId = "grade" | "wr" | "volume" | "change";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "picked", label: "رونددار" },
  { id: "A", label: "ستاپ A" },
  { id: "watch", label: "در کمین" },
  { id: "armed", label: "هندسه ناقص" },
  { id: "edge", label: "لبه مثبت" },
  { id: "long", label: "خرید" },
  { id: "short", label: "فروش" },
  { id: "star", label: "نشان" },
  { id: "all", label: "هر ۱۰۰" },
];

const LOCKS = [
  {
    n: "۰۱",
    title: "روزانه",
    body: "سقف و کف باید روند بسازند و قیمت همان سمت میانگین ۵۰ باشد.",
  },
  {
    n: "۰۲",
    title: "چهارساعته",
    body: "اصلاح ۳۸ تا ۶۲ درصد موج قبل، یا سوئیپ سطح و پس‌گرفتن آن.",
  },
  {
    n: "۰۳",
    title: "یک‌ساعته",
    body: "فقط کندل بسته: سوئیپ، اینگالف، پین بار، یا شکست اینسایدبار.",
  },
  {
    n: "۰۴",
    title: "فضای ۲R",
    body: "تا دو برابر ریسک، مانع چهارساعته نباشد. حد بین ۰٫۳ تا ۱٫۷ ATR.",
  },
];

const GRADE_RANK: Record<Grade, number> = { A: 0, armed: 1, watch: 2, flat: 3 };

function biasColor(bias: Bias): string {
  if (bias === "bull") return "text-up";
  if (bias === "bear") return "text-down";
  return "text-muted";
}

function BiasMark({ label, bias }: { label: string; bias: Bias }) {
  const Icon = bias === "bull" ? ArrowUp : bias === "bear" ? ArrowDown : Minus;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${biasColor(bias)}`}>
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}

function gradeClass(grade: Grade): string {
  if (grade === "A") return "bg-brass text-bg";
  if (grade === "armed") return "border border-brass text-brass";
  if (grade === "watch") return "border border-line text-fg";
  return "border border-line text-muted";
}

const GRADE_LABEL: Record<Grade, string> = {
  A: "ستاپ A",
  armed: "هندسه ناقص",
  watch: "در کمین",
  flat: "زمینه",
};

export function Desk() {
  const [rows, setRows] = useState<Row[]>([]);
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>("all");
  const [sort, setSort] = useState<SortId>("grade");
  const [query, setQuery] = useState("");
  const [stars, setStars] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const userChose = useRef(false);

  useEffect(() => {
    const raw = localStorage.getItem("sakhtar-stars");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) setStars(parsed.filter((item) => typeof item === "string"));
    } catch {
      /* ignore broken local stars */
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    void runScan(ctrl.signal, false);
    return () => ctrl.abort();
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runScan(signal: AbortSignal, fresh: boolean) {
    setScanning(true);
    setError(null);
    setDone(0);
    try {
      const universe = await fetchUniverse();
      if (signal.aborted) return;
      setRows(universe.map((item) => ({ ...item, status: "pending" })));
      setTotal(universe.length);
      let cursor = 0;
      async function worker() {
        while (!signal.aborted) {
          const index = cursor++;
          if (index >= universe.length) return;
          const item = universe[index];
          try {
            const bundle = await fetchBundle({ data: { symbol: item.symbol, fresh } });
            if (signal.aborted) return;
            const report = analyzeSymbol({
              symbol: item.symbol,
              last: item.last,
              changePct: item.changePct,
              quoteVolume: item.quoteVolume,
              h1: bundle.h1,
              h4: bundle.h4,
              d1: bundle.d1,
            });
            if (signal.aborted) return;
            setRows((prev) =>
              prev.map((row) => (row.symbol === item.symbol ? { ...row, ...item, status: "ready", report } : row)),
            );
          } catch (err) {
            if (signal.aborted) return;
            const message = err instanceof Error ? err.message : "خطا";
            setRows((prev) =>
              prev.map((row) => (row.symbol === item.symbol ? { ...row, status: "error", error: message } : row)),
            );
          } finally {
            if (!signal.aborted) setDone((value) => value + 1);
          }
        }
      }
      await Promise.all([worker(), worker(), worker(), worker()]);
    } catch (err) {
      if (!signal.aborted) setError(err instanceof Error ? err.message : "دریافت بازار ممکن نشد");
    } finally {
      if (!signal.aborted) setScanning(false);
    }
  }

  function rescan() {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    userChose.current = false;
    void runScan(ctrl.signal, true);
  }

  function toggleStar(symbol: string) {
    setStars((prev) => {
      const next = prev.includes(symbol) ? prev.filter((item) => item !== symbol) : [...prev, symbol];
      localStorage.setItem("sakhtar-stars", JSON.stringify(next));
      return next;
    });
  }

  const reports = rows.map((row) => row.report).filter((item): item is SymbolReport => Boolean(item));
  const countA = reports.filter((item) => item.grade === "A").length;
  const countWatch = reports.filter((item) => item.grade === "watch").length;
  const countFlat = reports.filter((item) => item.grade === "flat").length;
  const sampled = reports.filter((item) => item.stats.n >= 5 && item.stats.hitRate != null);
  const avgHit = sampled.length
    ? sampled.reduce((sum, item) => sum + (item.stats.hitRate ?? 0), 0) / sampled.length
    : null;
  const bullish = reports.filter((item) => item.daily.bias === "bull").length;
  const bearish = reports.filter((item) => item.daily.bias === "bear").length;
  const breadth = reports.length ? Math.round((bullish / reports.length) * 100) : 0;
  const bearBreadth = reports.length ? Math.round((bearish / reports.length) * 100) : 0;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((row) => {
      if (q) {
        const name = coinName(row.base).toLowerCase();
        if (!row.base.toLowerCase().includes(q) && !row.symbol.toLowerCase().includes(q) && !name.includes(q)) {
          return false;
        }
      }
      const report = row.report;
      if (filter === "all") return true;
      if (filter === "star") return stars.includes(row.symbol);
      if (!report) return filter === "picked" ? false : false;
      if (filter === "picked") return report.grade !== "flat";
      if (filter === "A") return report.grade === "A";
      if (filter === "armed") return report.grade === "armed";
      if (filter === "watch") return report.grade === "watch";
      if (filter === "long") return report.side === "long";
      if (filter === "short") return report.side === "short";
      if (filter === "edge") return report.stats.n >= 5 && (report.stats.expectancy ?? 0) > 0;
      return true;
    });
    const copy = [...list];
    copy.sort((a, b) => {
      if (sort === "volume") return b.quoteVolume - a.quoteVolume;
      if (sort === "change") return Math.abs(b.changePct) - Math.abs(a.changePct);
      if (sort === "wr") {
        const aw = a.report && a.report.stats.n > 0 ? (a.report.stats.expectancy ?? -99) : -99;
        const bw = b.report && b.report.stats.n > 0 ? (b.report.stats.expectancy ?? -99) : -99;
        return bw - aw;
      }
      const ar = a.report ? GRADE_RANK[a.report.grade] : 9;
      const br = b.report ? GRADE_RANK[b.report.grade] : 9;
      if (ar !== br) return ar - br;
      return (b.report?.score ?? 0) - (a.report?.score ?? 0);
    });
    return copy;
  }, [rows, filter, sort, query, stars]);

  useEffect(() => {
    if (userChose.current) return;
    const ready = rows.filter((row) => row.report);
    if (!ready.length) return;
    const best = [...ready].sort((a, b) => {
      const ar = a.report ? GRADE_RANK[a.report.grade] : 9;
      const br = b.report ? GRADE_RANK[b.report.grade] : 9;
      if (ar !== br) return ar - br;
      return (b.report?.score ?? 0) - (a.report?.score ?? 0);
    })[0];
    if (best) setSelected(best.symbol);
  }, [rows]);

  const selectedRow = rows.find((row) => row.symbol === selected);
  const progress = total ? Math.min(100, Math.round((done / total) * 100)) : 0;

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <ChartCandlestick className="size-7 text-brass" aria-hidden />
              <h1 className="text-3xl font-semibold tracking-tight">ساختار</h1>
            </div>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              میز پرایس‌اکشن برای ۱۰۰ جفت پرمعامله تتر. ستاپ کم صادر می‌شود، چون وین‌ریت از شلوغ معامله کردن نمی‌آید.
            </p>
          </div>
          <button
            type="button"
            onClick={rescan}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brass px-4 text-sm font-medium text-bg"
          >
            <RefreshCw className={`size-4 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "در حال خواندن بازار" : "اسکن تازه"}
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5">
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LOCKS.map((lock) => (
            <li key={lock.n} className="border border-line bg-surface px-3 py-2">
              <div className="font-num text-xs text-brass">{lock.n}</div>
              <h2 className="mt-1 text-sm font-medium">{lock.title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">{lock.body}</p>
            </li>
          ))}
        </ol>

        <section className="grid gap-3 border border-line bg-surface px-3 py-3 sm:grid-cols-4">
          <Stat label="ستاپ A" value={String(countA)} />
          <Stat label="در کمین" value={String(countWatch)} />
          <Stat label="فقط زمینه یا رنج" value={String(countFlat)} />
          <Stat label="میانگین ۲R، نمونه ≥۵" value={avgHit == null ? "—" : formatHit(avgHit)} />
          <div className="sm:col-span-4">
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>عرضه روزانه خوانده‌شده</span>
              <bdi className="font-num">
                {bullish} صعودی · {bearish} نزولی
              </bdi>
            </div>
            <div className="flex h-2 overflow-hidden bg-surface-2">
              <div className="bg-up" style={{ width: `${breadth}%` }} />
              <div className="bg-down" style={{ width: `${bearBreadth}%` }} />
            </div>
          </div>
        </section>

        {scanning ? (
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>خواندن کندل روزانه، چهارساعته و یک‌ساعته</span>
              <bdi className="font-num">
                {done}/{total || "…"}
              </bdi>
            </div>
            <div
              className="h-1 bg-surface-2"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full bg-brass" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="border border-line bg-down-soft px-3 py-3 text-sm text-down">{error}</p>
        ) : null}
        {!scanning && rows.length > 0 && countA === 0 ? (
          <p className="text-sm leading-relaxed text-muted">
            الان ستاپ A نیست. فیلتر فقط وقتی هر چهار قفل با هم بسته باشند برگه می‌دهد؛ در بازار رنج یا دور از منطقه ارزش، سکوت عمدی است.
          </p>
        ) : null}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={
                  filter === item.id
                    ? "min-h-11 rounded-md bg-brass px-3 text-sm text-bg"
                    : "min-h-11 rounded-md border border-line px-3 text-sm text-fg"
                }
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block min-w-0 sm:w-56">
              <span className="sr-only">جستجوی نماد</span>
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="BTC یا بیت‌کوین"
                className="min-h-11 w-full rounded-md border border-line bg-surface ps-10 pe-3 text-sm text-fg"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["grade", "اولویت"],
                  ["wr", "انتظار R"],
                  ["volume", "حجم"],
                  ["change", "نوسان ۲۴س"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSort(id)}
                  className={
                    sort === id
                      ? "min-h-11 rounded-md bg-surface-2 px-3 text-sm text-fg"
                      : "min-h-11 rounded-md px-3 text-sm text-muted"
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-5">
          <section className="min-w-0 border border-line lg:col-span-3">
            {visible.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted">
                {scanning ? "هنوز نمادی برای این فیلتر آماده نشده." : "با این فیلتر چیزی نیست. «هر ۱۰۰» همه زمینه‌ها را نشان می‌دهد."}
              </p>
            ) : (
              <ul>
                {visible.map((row) => {
                  const report = row.report;
                  const active = row.symbol === selected;
                  return (
                    <li key={row.symbol} className={active ? "bg-surface-2" : "bg-bg"}>
                      <div className="flex border-b border-line">
                        <button
                          type="button"
                          aria-label={stars.includes(row.symbol) ? "برداشتن نشان" : "نشان کردن"}
                          aria-pressed={stars.includes(row.symbol)}
                          onClick={() => toggleStar(row.symbol)}
                          className="inline-flex w-11 shrink-0 items-center justify-center text-brass"
                        >
                          <Star className="size-4" fill={stars.includes(row.symbol) ? "currentColor" : "none"} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            userChose.current = true;
                            setSelected(row.symbol);
                            setMobileOpen(true);
                          }}
                          className="flex min-w-0 flex-1 flex-col gap-2 py-3 pe-3 text-start"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-baseline gap-2">
                                <bdi className="font-num text-base font-semibold">{row.base}</bdi>
                                {coinName(row.base) !== row.base ? (
                                  <span className="truncate text-sm text-muted">{coinName(row.base)}</span>
                                ) : null}
                              </div>
                              {report ? (
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  <span className={`rounded-md px-2 py-0.5 text-xs ${gradeClass(report.grade)}`}>
                                    {GRADE_LABEL[report.grade]}
                                  </span>
                                  <bdi className="font-num text-xs text-muted">{report.score}</bdi>
                                  <span className="text-xs text-muted">
                                    {report.checked.pass} از {report.checked.total}
                                  </span>
                                  {report.stats.n > 0 ? (
                                    <bdi
                                      className={`font-num text-xs ${(report.stats.expectancy ?? 0) > 0 ? "text-up" : "text-down"}`}
                                    >
                                      {formatHit(report.stats.hitRate)} · {formatR(report.stats.expectancy)} · n{report.stats.n}
                                    </bdi>
                                  ) : null}
                                  {report.grade === "A" && weakEdge(report.stats) ? (
                                    <span className="text-xs text-down">لبه اخیر منفی</span>
                                  ) : null}
                                </div>
                              ) : (
                                <p className="mt-1 text-xs text-muted">
                                  {row.status === "error" ? row.error || "داده نیامد" : "در صف کندل‌ها"}
                                </p>
                              )}
                            </div>
                            <div className="text-end">
                              <div className="font-num text-sm">{formatPx(row.last)}</div>
                              <div className={`font-num text-xs ${row.changePct >= 0 ? "text-up" : "text-down"}`}>
                                {formatPct(row.changePct)}
                              </div>
                              <div className="font-num text-xs text-muted">{formatVol(row.quoteVolume)}</div>
                            </div>
                          </div>
                          {report ? (
                            <>
                              <div className="flex flex-wrap gap-3">
                                <BiasMark label="روز" bias={report.daily.bias} />
                                <BiasMark label="۴س" bias={report.h4.bias} />
                                <BiasMark label="۱س" bias={report.h1.bias} />
                                {report.pullback != null ? (
                                  <bdi className="font-num text-xs text-muted">
                                    اصلاح {Math.round(report.pullback * 100)}%
                                  </bdi>
                                ) : null}
                              </div>
                              <p className="line-clamp-2 text-sm leading-relaxed text-fg">{report.headline}</p>
                            </>
                          ) : null}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <aside className="hidden min-w-0 border border-line lg:col-span-2 lg:sticky lg:top-4 lg:block lg:max-h-screen lg:overflow-y-auto">
            {selectedRow?.report ? (
              <SetupPanel report={selectedRow.report} />
            ) : (
              <p className="px-4 py-8 text-sm leading-relaxed text-muted">
                با آماده شدن اولین نماد، خوانش این‌جا می‌نشیند. رنج روزانه عمداً ستاپ نمی‌گیرد.
              </p>
            )}
          </aside>
        </div>

        <details className="border border-line bg-surface px-3 py-3 text-sm">
          <summary className="cursor-pointer text-sm font-medium">چرا تعداد سیگنال کم است</summary>
          <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
            <p>
              وین‌ریت بالا از پیش‌بینی همیشگی بازار نمی‌آید. از این می‌آید که بیشتر وقت‌ها هیچ کاری نکنی. چهار قفل باید با هم بسته باشند وگرنه برگه ورود صادر نمی‌شود.
            </p>
            <p>
              نرخ روی کارت، درصد دفعاتی است که قیمت در آزمون اخیر به هدف ۲R رسیده، نه یک عدد تبلیغاتی. سیستم ۲R از حدود ۳۵ درصد به بالا، اگر باخت‌ها نزدیک ۱R بمانند، انتظار مثبت دارد. برای همین هم «درصد برد» را تنها نمی‌گذاریم و انتظار R را کنارش می‌آوریم.
            </p>
            <p>
              اگر نمونه یک نماد از ۸ معامله گذشته و انتظارش منفی است، حتی ستاپ A را با برچسب لبه منفی نشان می‌دهیم. این میز توصیه خرید و فروش نیست.
            </p>
          </div>
        </details>
      </main>

      {mobileOpen && selectedRow?.report ? (
        <div className="fixed inset-0 z-30 overflow-y-auto bg-bg lg:hidden" role="dialog" aria-modal="true">
          <SetupPanel report={selectedRow.report} onClose={() => setMobileOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 font-num text-xl">{value}</div>
    </div>
  );
}
