import { useEffect, useState } from "react";
import { Check, Minus, TriangleAlert, X } from "lucide-react";
import type { Bias, Grade, Level, Side, Stats, SymbolReport } from "@/lib/pa/engine";
import { weakEdge } from "@/lib/pa/engine";
import { formatHit, formatPct, formatPx, formatR, formatVol, formatWhen } from "@/lib/pa/format";
import { coinName } from "@/lib/pa/names";
import { PaChart } from "@/components/pa-chart";

const GRADE_LABEL: Record<Grade, string> = {
  A: "ستاپ A",
  armed: "هندسه ناقص",
  watch: "در کمین",
  flat: "فقط زمینه",
};

const BIAS_LABEL: Record<Bias, string> = {
  bull: "صعودی",
  bear: "نزولی",
  range: "رنج",
};

function biasClass(bias: Bias): string {
  if (bias === "bull") return "text-up";
  if (bias === "bear") return "text-down";
  return "text-muted";
}

function sideWord(side: Side | null): string {
  if (side === "long") return "خرید";
  if (side === "short") return "فروش";
  return "بدون جهت";
}

function edgeNote(stats: Stats): string {
  if (stats.n === 0) return "در حدود سه هفته اخیر، این قانون دقیق روی این نماد معامله‌ای نساخته.";
  if (stats.n < 5) return "نمونه کمتر از ۵ است. درصد را به‌چشم آمار قطعی نبین.";
  if ((stats.expectancy ?? 0) > 0.15) return "انتظار R در همین پنجره مثبت است. این لبه آینده را تضمین نمی‌کند.";
  if ((stats.expectancy ?? 0) <= 0) return "حتی با همین فیلتر، نتیجه اخیر این نماد منفی بوده.";
  return "انتظار نزدیک صفر است؛ مزیت واضحی در این پنجره دیده نمی‌شود.";
}

export function SetupPanel({
  report,
  onClose,
}: {
  report: SymbolReport;
  onClose?: () => void;
}) {
  const [tf, setTf] = useState<"h1" | "h4" | "d1">("h1");
  const [balance, setBalance] = useState("");
  const [riskPct, setRiskPct] = useState("1");

  useEffect(() => {
    setTf("h1");
  }, [report.symbol]);

  useEffect(() => {
    const savedBalance = localStorage.getItem("sakhtar-balance");
    const savedRisk = localStorage.getItem("sakhtar-risk");
    if (savedBalance) setBalance(savedBalance);
    if (savedRisk) setRiskPct(savedRisk);
  }, []);

  const pack = report.charts[tf];
  const plan = report.plan;
  const balanceNum = Number(balance);
  const riskNum = Number(riskPct);
  const size =
    plan && balanceNum > 0 && riskNum > 0
      ? {
          quote: (balanceNum * riskNum) / 100,
          units: (balanceNum * riskNum) / 100 / plan.risk,
        }
      : null;

  function persistBalance(value: string) {
    setBalance(value);
    localStorage.setItem("sakhtar-balance", value);
  }
  function persistRisk(value: string) {
    setRiskPct(value);
    localStorage.setItem("sakhtar-risk", value);
  }

  const tfButton = (id: "h1" | "h4" | "d1", label: string) => (
    <button
      type="button"
      onClick={() => setTf(id)}
      className={
        tf === id
          ? "min-h-11 rounded-md bg-brass px-3 text-sm font-medium text-bg"
          : "min-h-11 rounded-md border border-line px-3 text-sm text-fg"
      }
    >
      {label}
    </button>
  );

  return (
    <article className="flex flex-col gap-5 px-4 py-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-brass">{GRADE_LABEL[report.grade]}</p>
          <h2 className="mt-1 text-2xl font-semibold">
            <bdi className="font-num">{report.base}</bdi>
            {coinName(report.base) !== report.base ? (
              <span className="ms-2 text-base font-normal text-muted">{coinName(report.base)}</span>
            ) : null}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-fg">{report.headline}</p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-11 items-center justify-center rounded-md border border-line text-fg lg:hidden"
            aria-label="بستن"
          >
            <X className="size-5" />
          </button>
        ) : null}
      </header>

      <div className="grid grid-cols-3 gap-2 text-center">
        {(
          [
            ["روزانه", report.daily.bias],
            ["چهارساعته", report.h4.bias],
            ["یک‌ساعته", report.h1.bias],
          ] as const
        ).map(([label, bias]) => (
          <div key={label} className="border border-line bg-surface px-2 py-2">
            <div className="text-xs text-muted">{label}</div>
            <div className={`mt-1 text-sm font-medium ${biasClass(bias)}`}>{BIAS_LABEL[bias]}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {tfButton("d1", "روزانه")}
        {tfButton("h4", "چهارساعته")}
        {tfButton("h1", "یک‌ساعته")}
      </div>

      <PaChart pack={pack} />
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <li className="text-brass">میانگین ۲۰</li>
        {pack.levels.map((level: Level) => (
          <li key={`${level.kind}-${level.label}`} className="font-num">
            {level.label} {formatPx(level.price)}
          </li>
        ))}
      </ul>

      {report.formingHint ? (
        <p className="border border-line bg-surface px-3 py-2 text-sm leading-relaxed text-fg">
          {report.formingHint}
        </p>
      ) : null}
      {report.hotVol ? (
        <p className="flex items-start gap-2 bg-down-soft px-3 py-2 text-sm text-down">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          نوسان یک‌ساعته نسبت به هفته‌های اخیر بالاست. حد ممکن است زودتر از حد معمول لمس شود.
        </p>
      ) : null}

      <section>
        <h3 className="text-sm font-medium">قفل‌ها</h3>
        <ul className="mt-2 divide-y divide-line border-y border-line">
          {report.gates.map((item) => {
            const Icon = item.ok ? Check : item.hard ? X : Minus;
            const color = item.ok ? "text-up" : item.hard ? "text-down" : "text-muted";
            return (
              <li key={item.id} className="flex gap-3 py-2.5">
                <Icon className={`mt-0.5 size-4 shrink-0 ${color}`} aria-hidden />
                <div>
                  <div className="text-sm">{item.label}</div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{item.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {plan ? (
        <section className="border border-line bg-surface px-3 py-3">
          <h3 className="text-sm font-medium">
            برگه {sideWord(plan.side)} · {plan.patternLabel}
          </h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted">ورود، کلوز تأیید</dt>
              <dd className="font-num">{formatPx(plan.entry)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">حد ضرر</dt>
              <dd className="font-num text-down">{formatPx(plan.stop)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">هدف اول ۲R</dt>
              <dd className="font-num text-up">{formatPx(plan.tp1)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">هدف دوم ۳R</dt>
              <dd className="font-num text-up">{formatPx(plan.tp2)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">فاصله حد</dt>
              <dd className="font-num">{formatPct(plan.riskPct)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">فضا تا مانع</dt>
              <dd className="font-num">{plan.roomR == null ? "باز" : formatR(plan.roomR)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            نصف حجم را در ۲R ببند و حد بقیه را به ورود ببر. اگر قیمت بیش از نیم‌R از این ورود جلو رفته، ستاپ را تعقیب نکن.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-muted">
              موجودی تتر
              <input
                inputMode="decimal"
                value={balance}
                onChange={(event) => persistBalance(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 font-num text-sm text-fg"
                placeholder="1000"
              />
            </label>
            <label className="text-xs text-muted">
              ریسک هر معامله، درصد
              <input
                inputMode="decimal"
                value={riskPct}
                onChange={(event) => persistRisk(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 font-num text-sm text-fg"
              />
            </label>
          </div>
          {size ? (
            <p className="mt-3 font-num text-sm text-fg">
              ریسک {formatPx(size.quote)} USDT · حجم {size.units >= 1 ? size.units.toFixed(3) : size.units.toFixed(4)} {report.base}
            </p>
          ) : (
            <p className="mt-3 text-xs text-muted">موجودی را بنویس تا اندازه پوزیشن از روی فاصله حد حساب شود.</p>
          )}
        </section>
      ) : (
        <p className="text-sm text-muted">هنوز برگه ورود صادر نشده. قفل‌های بالا باید با هم سبز شوند.</p>
      )}

      <section>
        <h3 className="text-sm font-medium">آزمون همین قانون روی کندل‌های اخیر</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted">{edgeNote(report.stats)}</p>
        {weakEdge(report.stats) ? (
          <p className="mt-2 text-sm text-down">این نماد با همین فیلتر در پنجره اخیر لبه منفی داشته است.</p>
        ) : null}
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted">رسیدن به ۲R</dt>
            <dd className="font-num">{formatHit(report.stats.hitRate)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">انتظار</dt>
            <dd className="font-num">{formatR(report.stats.expectancy)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">تعداد</dt>
            <dd className="font-num">{report.stats.n}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">ضریب سود</dt>
            <dd className="font-num">{report.stats.profitFactor == null ? "—" : report.stats.profitFactor.toFixed(2)}</dd>
          </div>
        </dl>
        {report.stats.recent.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {report.stats.recent.map((value, index) => (
              <li
                key={`${value}-${index}`}
                className={`font-num rounded-md px-2 py-1 text-xs ${value > 0 ? "bg-up-soft text-up" : "bg-down-soft text-down"}`}
              >
                {formatR(value)}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-3 text-xs leading-relaxed text-muted">
          ورود فرضی: قیمت باز شدن کندل بعد. اگر حد و هدف در یک کندل باشند، باخت حساب شده. خروج زمانی بعد از ۳۶ کندل یک‌ساعته. ساعت‌ها به وقت تهران‌اند
          {report.asOf ? ` · آخرین کندل بسته ${formatWhen(report.asOf)}` : ""}. حجم ۲۴ساعته <bdi className="font-num">{formatVol(report.quoteVolume)}</bdi>.
        </p>
      </section>
    </article>
  );
}
