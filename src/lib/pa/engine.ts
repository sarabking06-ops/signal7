export type Bias = "bull" | "bear" | "range";
export type Side = "long" | "short";
export type Grade = "A" | "armed" | "watch" | "flat";
export type PatternName = "sweep" | "engulf" | "pin" | "inside";

export type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type Gate = {
  id: string;
  label: string;
  ok: boolean;
  hard: boolean;
  weight: number;
  detail: string;
};

export type Plan = {
  side: Side;
  entry: number;
  stop: number;
  tp1: number;
  tp2: number;
  risk: number;
  riskPct: number;
  pattern: PatternName;
  patternLabel: string;
  stale: boolean;
  obstacle: number | null;
  roomR: number | null;
};

export type Stats = {
  n: number;
  tp: number;
  sl: number;
  timeout: number;
  hitRate: number | null;
  expectancy: number | null;
  profitFactor: number | null;
  avgBars: number | null;
  recent: number[];
};

export type TfSnap = {
  bias: Bias;
  close: number;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  atr: number | null;
  rsi: number | null;
  swingHigh: number | null;
  swingLow: number | null;
  retrace: number | null;
};

export type ChartPoint = {
  i: number;
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  ema20: number | null;
  ema50: number | null;
};

export type Level = {
  price: number;
  kind: "entry" | "stop" | "tp" | "high" | "low";
  label: string;
};

export type ChartPack = { points: ChartPoint[]; levels: Level[] };

export type SymbolReport = {
  symbol: string;
  base: string;
  last: number;
  changePct: number;
  quoteVolume: number;
  side: Side | null;
  grade: Grade;
  score: number;
  headline: string;
  gates: Gate[];
  plan: Plan | null;
  stats: Stats;
  daily: TfSnap;
  h4: TfSnap;
  h1: TfSnap;
  charts: { h1: ChartPack; h4: ChartPack; d1: ChartPack };
  formingHint: string | null;
  hotVol: boolean;
  asOf: number | null;
  checked: { pass: number; total: number };
  pullback: number | null;
};

export type MarketInput = {
  symbol: string;
  last: number;
  changePct: number;
  quoteVolume: number;
  h1: Candle[];
  h4: Candle[];
  d1: Candle[];
  now?: number;
};

const H1 = 3_600_000;
const H4 = 14_400_000;
const D1 = 86_400_000;

type Swing = { index: number; price: number; kind: "high" | "low" };
type Pattern = { name: PatternName; dir: Side; label: string; level: number | null };

const EMPTY_STATS: Stats = {
  n: 0,
  tp: 0,
  sl: 0,
  timeout: 0,
  hitRate: null,
  expectancy: null,
  profitFactor: null,
  avgBars: null,
  recent: [],
};

function finite(n: number): number | null {
  return Number.isFinite(n) ? n : null;
}

function closedOnly(candles: Candle[], duration: number, now: number): Candle[] {
  if (candles.length === 0) return candles;
  const last = candles[candles.length - 1];
  if (last.t + duration > now - 1500) return candles.slice(0, -1);
  return candles.slice();
}

function emaSeries(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  let prev = sum / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

function atrSeries(c: Candle[], period = 14): number[] {
  const out = new Array<number>(c.length).fill(NaN);
  if (c.length <= period) return out;
  const trs = new Array<number>(c.length);
  trs[0] = c[0].h - c[0].l;
  for (let i = 1; i < c.length; i++) {
    trs[i] = Math.max(
      c[i].h - c[i].l,
      Math.abs(c[i].h - c[i - 1].c),
      Math.abs(c[i].l - c[i - 1].c),
    );
  }
  let atr = 0;
  for (let i = 0; i < period; i++) atr += trs[i];
  atr /= period;
  out[period - 1] = atr;
  for (let i = period; i < c.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
    out[i] = atr;
  }
  return out;
}

function rsiSeries(closes: number[], period = 14): number[] {
  const out = new Array<number>(closes.length).fill(NaN);
  if (closes.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let ag = gain / period;
  let al = loss / period;
  out[period] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    ag = (ag * (period - 1) + g) / period;
    al = (al * (period - 1) + l) / period;
    out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  }
  return out;
}

function findSwings(c: Candle[], wing: number): Swing[] {
  const raw: Swing[] = [];
  for (let i = wing; i < c.length - wing; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = i - wing; j <= i + wing; j++) {
      if (j === i) continue;
      if (c[j].h >= c[i].h) isHigh = false;
      if (c[j].l <= c[i].l) isLow = false;
      if (!isHigh && !isLow) break;
    }
    if (isHigh && isLow) {
      raw.push(c[i].c >= c[i].o ? { index: i, price: c[i].h, kind: "high" } : { index: i, price: c[i].l, kind: "low" });
    } else if (isHigh) raw.push({ index: i, price: c[i].h, kind: "high" });
    else if (isLow) raw.push({ index: i, price: c[i].l, kind: "low" });
  }
  const out: Swing[] = [];
  for (const s of raw) {
    const prev = out[out.length - 1];
    if (prev && prev.kind === s.kind) {
      if (s.kind === "high" && s.price >= prev.price) out[out.length - 1] = s;
      else if (s.kind === "low" && s.price <= prev.price) out[out.length - 1] = s;
    } else out.push(s);
  }
  return out;
}

function lastOf(swings: Swing[], kind: Swing["kind"]): Swing | null {
  for (let i = swings.length - 1; i >= 0; i--) if (swings[i].kind === kind) return swings[i];
  return null;
}

function biasOf(swings: Swing[]): Bias {
  const highs = swings.filter((s) => s.kind === "high");
  const lows = swings.filter((s) => s.kind === "low");
  if (highs.length < 2 || lows.length < 2) return "range";
  const h1 = highs[highs.length - 2];
  const h2 = highs[highs.length - 1];
  const l1 = lows[lows.length - 2];
  const l2 = lows[lows.length - 1];
  const hh = h2.price > h1.price;
  const hl = l2.price > l1.price;
  const lh = h2.price < h1.price;
  const ll = l2.price < l1.price;
  if (hh && hl) return "bull";
  if (lh && ll) return "bear";
  return "range";
}

function retraceOf(swings: Swing[], close: number, side: Side): number | null {
  if (side === "long") {
    let high: Swing | null = null;
    for (let i = swings.length - 1; i >= 0; i--) {
      if (swings[i].kind === "high") {
        high = swings[i];
        break;
      }
    }
    if (!high) return null;
    let low: Swing | null = null;
    for (let i = swings.length - 1; i >= 0; i--) {
      if (swings[i].index < high.index && swings[i].kind === "low") {
        low = swings[i];
        break;
      }
    }
    if (!low) return null;
    const span = high.price - low.price;
    if (!(span > 0)) return null;
    return (high.price - close) / span;
  }
  let low: Swing | null = null;
  for (let i = swings.length - 1; i >= 0; i--) {
    if (swings[i].kind === "low") {
      low = swings[i];
      break;
    }
  }
  if (!low) return null;
  let high: Swing | null = null;
  for (let i = swings.length - 1; i >= 0; i--) {
    if (swings[i].index < low.index && swings[i].kind === "high") {
      high = swings[i];
      break;
    }
  }
  if (!high) return null;
  const span = high.price - low.price;
  if (!(span > 0)) return null;
  return (close - low.price) / span;
}

function chochAgainst(swings: Swing[], close: number, side: Side): boolean {
  if (side === "long") {
    const low = lastOf(swings, "low");
    return Boolean(low && close < low.price);
  }
  const high = lastOf(swings, "high");
  return Boolean(high && close > high.price);
}

function obstacleOf(swings: Swing[], side: Side, entry: number): number | null {
  if (side === "long") {
    for (let i = swings.length - 1; i >= 0; i--) {
      if (swings[i].kind === "high" && swings[i].price > entry) return swings[i].price;
    }
    return null;
  }
  for (let i = swings.length - 1; i >= 0; i--) {
    if (swings[i].kind === "low" && swings[i].price < entry) return swings[i].price;
  }
  return null;
}

function recentSwing(swings: Swing[], kind: Swing["kind"], i: number, maxAge: number): Swing | null {
  for (let k = swings.length - 1; k >= 0; k--) {
    const s = swings[k];
    if (s.kind !== kind || s.index >= i) continue;
    if (i - s.index > maxAge) return null;
    return s;
  }
  return null;
}

function patternAt(c: Candle[], i: number, atr: number, swings: Swing[]): Pattern | null {
  if (i < 3 || !Number.isFinite(atr) || atr <= 0) return null;
  const cur = c[i];
  const prev = c[i - 1];
  const mother = c[i - 2];
  const range = cur.h - cur.l;
  if (!(range > 0)) return null;
  const body = Math.abs(cur.c - cur.o);
  const upper = cur.h - Math.max(cur.c, cur.o);
  const lower = Math.min(cur.c, cur.o) - cur.l;
  const bull = cur.c > cur.o;
  const bear = cur.c < cur.o;

  const swingLow = recentSwing(swings, "low", i, 36);
  if (
    swingLow &&
    cur.l < swingLow.price &&
    cur.c > swingLow.price &&
    bull &&
    lower >= body * 0.8 &&
    range >= atr * 0.35
  ) {
    return { name: "sweep", dir: "long", label: "سوئیپ کف و پس‌گرفتن", level: swingLow.price };
  }
  const swingHigh = recentSwing(swings, "high", i, 36);
  if (
    swingHigh &&
    cur.h > swingHigh.price &&
    cur.c < swingHigh.price &&
    bear &&
    upper >= body * 0.8 &&
    range >= atr * 0.35
  ) {
    return { name: "sweep", dir: "short", label: "سوئیپ سقف و پس‌گرفتن", level: swingHigh.price };
  }

  const prevBody = Math.abs(prev.c - prev.o);
  const prevBear = prev.c < prev.o;
  const prevBull = prev.c > prev.o;
  if (prevBear && bull && cur.o <= prev.c && cur.c >= prev.o && body > prevBody && body >= range * 0.45 && body >= atr * 0.28) {
    return { name: "engulf", dir: "long", label: "اینگالف صعودی", level: null };
  }
  if (prevBull && bear && cur.o >= prev.c && cur.c <= prev.o && body > prevBody && body >= range * 0.45 && body >= atr * 0.28) {
    return { name: "engulf", dir: "short", label: "اینگالف نزولی", level: null };
  }

  if (
    lower >= body * 2 &&
    lower >= range * 0.55 &&
    upper <= range * 0.22 &&
    cur.l < prev.l &&
    cur.c > prev.c &&
    range >= atr * 0.4
  ) {
    return { name: "pin", dir: "long", label: "پین بار صعودی", level: null };
  }
  if (
    upper >= body * 2 &&
    upper >= range * 0.55 &&
    lower <= range * 0.22 &&
    cur.h > prev.h &&
    cur.c < prev.c &&
    range >= atr * 0.4
  ) {
    return { name: "pin", dir: "short", label: "پین بار نزولی", level: null };
  }

  const inside = prev.h <= mother.h && prev.l >= mother.l;
  const motherRange = mother.h - mother.l;
  if (inside && motherRange >= atr * 0.45 && bull && cur.c > mother.h && body >= range * 0.35) {
    return { name: "inside", dir: "long", label: "شکست اینسایدبار به بالا", level: mother.h };
  }
  if (inside && motherRange >= atr * 0.45 && bear && cur.c < mother.l && body >= range * 0.35) {
    return { name: "inside", dir: "short", label: "شکست اینسایدبار به پایین", level: mother.l };
  }
  return null;
}

function atrRank(series: number[], index: number): number | null {
  const cur = series[index];
  if (!Number.isFinite(cur)) return null;
  const from = Math.max(0, index - 120);
  let n = 0;
  let le = 0;
  for (let i = from; i <= index; i++) {
    if (!Number.isFinite(series[i])) continue;
    n++;
    if (series[i] <= cur) le++;
  }
  if (n < 30) return null;
  return le / n;
}

type Frame = {
  snap: TfSnap;
  swings: Swing[];
  atr: number | null;
  close: number;
};

function frameOf(c: Candle[], wing: number): Frame | null {
  if (c.length < wing * 2 + 10) return null;
  const closes = c.map((x) => x.c);
  const ema20 = emaSeries(closes, 20);
  const ema50 = emaSeries(closes, 50);
  const ema200 = emaSeries(closes, 200);
  const atr = atrSeries(c);
  const rsi = rsiSeries(closes);
  const swings = findSwings(c, wing);
  const i = c.length - 1;
  const bias = biasOf(swings);
  const side: Side | null = bias === "bull" ? "long" : bias === "bear" ? "short" : null;
  const high = lastOf(swings, "high");
  const low = lastOf(swings, "low");
  const snap: TfSnap = {
    bias,
    close: c[i].c,
    ema20: finite(ema20[i]),
    ema50: finite(ema50[i]),
    ema200: finite(ema200[i]),
    atr: finite(atr[i]),
    rsi: finite(rsi[i]),
    swingHigh: high?.price ?? null,
    swingLow: low?.price ?? null,
    retrace: side ? retraceOf(swings, c[i].c, side) : null,
  };
  return { snap, swings, atr: snap.atr, close: c[i].c };
}

function emptySnap(close = 0): TfSnap {
  return {
    bias: "range",
    close,
    ema20: null,
    ema50: null,
    ema200: null,
    atr: null,
    rsi: null,
    swingHigh: null,
    swingLow: null,
    retrace: null,
  };
}

function gate(
  id: string,
  label: string,
  ok: boolean,
  hard: boolean,
  weight: number,
  detail: string,
): Gate {
  return { id, label, ok, hard, weight, detail };
}

type Eval = {
  side: Side | null;
  grade: Grade;
  score: number;
  gates: Gate[];
  plan: Plan | null;
  daily: TfSnap;
  h4: TfSnap;
  h1: TfSnap;
  headline: string;
  near: boolean;
  pullback: number | null;
};

function evaluateSetup(d1: Candle[], h4: Candle[], h1: Candle[], live: number): Eval {
  const dailyF = frameOf(d1, 3);
  const h4F = frameOf(h4, 3);
  const h1F = frameOf(h1, 2);
  const daily = dailyF?.snap ?? emptySnap();
  const h4s = h4F?.snap ?? emptySnap();
  const h1s = h1F?.snap ?? emptySnap();
  const blank = (headline: string): Eval => ({
    side: null,
    grade: "flat",
    score: 0,
    gates: [gate("daily", "روند روزانه", false, true, 16, headline)],
    plan: null,
    daily,
    h4: h4s,
    h1: h1s,
    headline,
    near: false,
    pullback: null,
  });
  if (!dailyF || !h4F || !h1F) return blank("داده این نماد برای خواندن ساختار کافی نیست.");

  const side: Side | null = daily.bias === "bull" ? "long" : daily.bias === "bear" ? "short" : null;
  if (!side) {
    return blank("ساختار روزانه رنج است. تا وقتی سقف و کف‌ها روند نسازند، ستاپی صادر نمی‌شود.");
  }

  const up = side === "long";
  const dirWord = up ? "صعودی" : "نزولی";
  const buyWord = up ? "خرید" : "فروش";
  const i = h1.length - 1;
  const atr1 = h1F.atr ?? NaN;
  const pattern = patternAt(h1, i, atr1, h1F.swings);
  const aligned = pattern && pattern.dir === side ? pattern : null;

  const ema50 = daily.ema50;
  const ema200 = daily.ema200;
  const emaSideOk = ema50 != null && (up ? daily.close > ema50 : daily.close < ema50);
  const stacked = ema50 != null && ema200 != null && (up ? ema50 > ema200 : ema50 < ema200);

  const h4Opposed = (up && h4s.bias === "bear") || (!up && h4s.bias === "bull");
  const broke = chochAgainst(h4F.swings, h4F.close, side);
  const retrace = retraceOf(h4F.swings, h4F.close, side);
  const fibIn = retrace != null && retrace >= 0.34 && retrace <= 0.66;
  const near = retrace != null && retrace >= 0.18 && retrace <= 0.82;
  const sweepOk =
    aligned?.name === "sweep" &&
    aligned.level != null &&
    h4F.atr != null &&
    ((up && h4s.swingLow != null && Math.abs(aligned.level - h4s.swingLow) <= h4F.atr * 0.9) ||
      (!up && h4s.swingHigh != null && Math.abs(aligned.level - h4s.swingHigh) <= h4F.atr * 0.9));
  const inValue = fibIn || Boolean(sweepOk);

  const signal = h1[i];
  let plan: Plan | null = null;
  let tooWide = false;
  if (aligned && Number.isFinite(atr1) && atr1 > 0) {
    const buffer = atr1 * 0.08;
    const natural = up ? signal.c - (signal.l - buffer) : signal.h + buffer - signal.c;
    const stop = natural < atr1 * 0.3 ? (up ? signal.c - atr1 * 0.3 : signal.c + atr1 * 0.3) : up ? signal.l - buffer : signal.h + buffer;
    const risk = Math.abs(signal.c - stop);
    tooWide = !(risk > 0) || risk > atr1 * 1.7;
    if (risk > 0) {
      const obstacle = obstacleOf(h4F.swings, side, signal.c);
      const roomR =
        obstacle == null ? null : up ? (obstacle - signal.c) / risk : (signal.c - obstacle) / risk;
      const progressed = up ? (live - signal.c) / risk : (signal.c - live) / risk;
      plan = {
        side,
        entry: signal.c,
        stop,
        tp1: up ? signal.c + 2 * risk : signal.c - 2 * risk,
        tp2: up ? signal.c + 3 * risk : signal.c - 3 * risk,
        risk,
        riskPct: (risk / signal.c) * 100,
        pattern: aligned.name,
        patternLabel: aligned.label,
        stale: progressed > 0.5,
        obstacle,
        roomR,
      };
    }
  }

  const roomPass = plan != null && (plan.roomR == null || plan.roomR >= 2);
  const stopPass = plan != null && !tooWide;
  const rsi = h1s.rsi;
  const rsiOk = rsi == null ? false : up ? rsi <= 74 : rsi >= 26;
  const geometryHard = Boolean(aligned);

  const retraceTxt =
    retrace == null ? "اصلاح موج چهارساعته خوانده نشد" : `اصلاح چهارساعته ${Math.round(retrace * 100)}٪ موج قبل`;

  const gates: Gate[] = [
    gate(
      "daily",
      "ساختار روزانه",
      true,
      true,
      16,
      up
        ? "ساختار روزانه صعودی است: سقف بالاتر و کف بالاتر."
        : "ساختار روزانه نزولی است: سقف پایین‌تر و کف پایین‌تر.",
    ),
    gate(
      "ema",
      "میانگین ۵۰",
      emaSideOk,
      true,
      10,
      emaSideOk
        ? `قیمت روزانه ${up ? "بالای" : "پایین"} میانگین ۵۰ است.`
        : up
          ? "قیمت روزانه هنوز زیر میانگین ۵۰ است."
          : "قیمت روزانه هنوز بالای میانگین ۵۰ است.",
    ),
    gate(
      "stack",
      "چینش ۲۰۰",
      stacked,
      false,
      4,
      stacked
        ? "میانگین ۵۰ و ۲۰۰ روزانه هم‌جهت‌اند؛ روند بالغ‌تر است."
        : "میانگین ۵۰ هنوز از ۲۰۰ عبور نکرده. روند جوان‌تر است و وزن کمتری دارد.",
    ),
    gate(
      "h4",
      "ساختار چهارساعته",
      !h4Opposed,
      true,
      12,
      h4Opposed
        ? "ساختار چهارساعته خلاف روند روزانه است."
        : "چهارساعته خلاف روند روزانه نشکسته است.",
    ),
    gate(
      "choch",
      "شکست ساختار",
      !broke,
      true,
      12,
      broke
        ? up
          ? "کلوز چهارساعته آخرین کف حمایتی را از دست داده."
          : "کلوز چهارساعته آخرین سقف نزولی را پس گرفته."
        : "کلوز چهارساعته سطح محافظ روند را نشکسته.",
    ),
    gate(
      "value",
      "منطقه ارزش",
      inValue,
      true,
      16,
      inValue
        ? sweepOk && !fibIn
          ? "ورود روی سوئیپ سطح چهارساعته و پس‌گرفتن آن است."
          : `${retraceTxt} و داخل منطقه ۳۸ تا ۶۲ درصد است.`
        : `${retraceTxt}. منطقه ارزش ۳۸ تا ۶۲ درصد یا سوئیپ معتبر هنوز کامل نیست.`,
    ),
    gate(
      "trigger",
      "تأیید یک‌ساعته",
      Boolean(aligned),
      true,
      10,
      aligned
        ? `کندل بستهٔ یک‌ساعته: ${aligned.label}.`
        : pattern && pattern.dir !== side
          ? "آخرین الگوی یک‌ساعته خلاف جهت روزانه است و نادیده گرفته شد."
          : "کندل یک‌ساعتهٔ بسته هنوز سوئیپ، اینگالف، پین یا شکست اینسایدبار نداده.",
    ),
    gate(
      "stop",
      "اندازه حد",
      stopPass,
      geometryHard,
      8,
      !aligned
        ? "بعد از کندل تأیید سنجیده می‌شود."
        : stopPass
          ? "حد پشت فتیله کندل تأیید است و از ۰٫۳ تا ۱٫۷ برابر ATR یک‌ساعته خارج نیست."
          : "حد طبیعی کندل نسبت به نوسان یک‌ساعته بیش از حد پهن است.",
    ),
    gate(
      "room",
      "فضای ۲R",
      roomPass,
      geometryHard,
      8,
      !aligned
        ? "بعد از کندل تأیید سنجیده می‌شود."
        : roomPass
          ? plan?.obstacle == null
            ? "سقف یا کف چهارساعتهٔ بازی جلوی هدف ۲R نیست."
            : "فاصله تا مانع چهارساعته دست‌کم ۲ برابر ریسک است."
          : "مانع چهارساعته قبل از هدف ۲R نشسته؛ فضا برای این حد کافی نیست.",
    ),
    gate(
      "rsi",
      "تعقیب ممنوع",
      Boolean(aligned) && rsiOk,
      geometryHard,
      4,
      !aligned
        ? "بعد از کندل تأیید سنجیده می‌شود."
        : rsiOk
          ? "RSI یک‌ساعته در منطقه تعقیب هیجانی نیست."
          : up
            ? "RSI یک‌ساعته بالای ۷۴ است؛ ورود دیر شده."
            : "RSI یک‌ساعته زیر ۲۶ است؛ ورود دیر شده.",
    ),
  ];

  const score = Math.min(
    100,
    gates.reduce((sum, g) => sum + (g.ok ? g.weight : 0), 0),
  );
  const failed = new Set(gates.filter((g) => g.hard && !g.ok).map((g) => g.id));
  const htfBroken = ["daily", "ema", "h4", "choch"].some((id) => failed.has(id));
  let grade: Grade = "flat";
  if (failed.size === 0 && plan && !plan.stale) grade = "A";
  else if (plan?.stale && !htfBroken && !failed.has("value")) grade = "armed";
  else if (plan && !plan.stale && !htfBroken && !failed.has("value") && (failed.has("room") || failed.has("stop") || failed.has("rsi")))
    grade = "armed";
  else if (!htfBroken && !failed.has("value") && failed.has("trigger")) grade = "watch";
  else if (!htfBroken && failed.has("value")) grade = "watch";

  let headline: string;
  if (grade === "A" && plan) headline = `ستاپ A ${buyWord} — ${plan.patternLabel}، منطقه ارزش، فضای حداقل ۲R.`;
  else if (plan?.stale) headline = `الگوی ${plan.patternLabel} بسته شده اما قیمت بیش از نیم‌R از ورود جلو رفته؛ تعقیب نکن.`;
  else if (grade === "armed" && plan) headline = `${plan.patternLabel} هست، ولی حد یا فضای هدف استاندارد ۲R را ندارد.`;
  else if (grade === "watch" && failed.has("trigger") && !failed.has("value"))
    headline = `زمینه ${buyWord} آماده است. منتظر کندل تأیید یک‌ساعته بمان.`;
  else if (grade === "watch" && failed.has("value") && !near)
    headline = `روند روزانه ${dirWord} است ولی قیمت از منطقه ارزش دور است؛ تعقیب نکن، منتظر اصلاح بمان.`;
  else if (grade === "watch") headline = `روند روزانه ${dirWord} است ولی قیمت هنوز وسط منطقه ارزش ننشسته.`;
  else headline = gates.find((g) => g.hard && !g.ok)?.detail ?? "قفل‌های روند با هم بسته نیستند.";

  return { side, grade, score, gates, plan, daily, h4: h4s, h1: h1s, headline, near, pullback: retrace };
}

function sliceClosed(candles: Candle[], duration: number, timeClose: number): Candle[] {
  let end = candles.length;
  while (end > 0 && candles[end - 1].t + duration > timeClose) end--;
  return end === candles.length ? candles : candles.slice(0, end);
}

type Sim = { r: number; exitIndex: number; counted: boolean; kind: "tp" | "sl" | "timeout" | "skip"; bars: number };

function simulate(h1: Candle[], signalIndex: number, side: Side, atr: number): Sim {
  const skip = (exitIndex: number): Sim => ({ r: 0, exitIndex, counted: false, kind: "skip", bars: 0 });
  const sig = h1[signalIndex];
  const next = h1[signalIndex + 1];
  if (!next || !(atr > 0)) return skip(signalIndex);
  const buffer = atr * 0.08;
  const natural = side === "long" ? sig.c - (sig.l - buffer) : sig.h + buffer - sig.c;
  const stop =
    natural < atr * 0.3
      ? side === "long"
        ? sig.c - atr * 0.3
        : sig.c + atr * 0.3
      : side === "long"
        ? sig.l - buffer
        : sig.h + buffer;
  const risk = Math.abs(sig.c - stop);
  if (!(risk > 0) || risk > atr * 1.7) return skip(signalIndex);
  const entry = next.o;
  const progressed = side === "long" ? (entry - sig.c) / risk : (sig.c - entry) / risk;
  if (progressed > 0.45) return skip(signalIndex);
  if (side === "long" && entry <= stop) return skip(signalIndex);
  if (side === "short" && entry >= stop) return skip(signalIndex);
  const tradeRisk = side === "long" ? entry - stop : stop - entry;
  if (!(tradeRisk > 0)) return skip(signalIndex);
  const tp = side === "long" ? entry + 2 * tradeRisk : entry - 2 * tradeRisk;
  const last = Math.min(h1.length - 1, signalIndex + 36);
  for (let j = signalIndex + 1; j <= last; j++) {
    const bar = h1[j];
    if (side === "long") {
      const hitStop = bar.l <= stop;
      const hitTp = bar.h >= tp;
      if (hitStop) return { r: -1, exitIndex: j, counted: true, kind: "sl", bars: j - signalIndex };
      if (hitTp) return { r: 2, exitIndex: j, counted: true, kind: "tp", bars: j - signalIndex };
    } else {
      const hitStop = bar.h >= stop;
      const hitTp = bar.l <= tp;
      if (hitStop) return { r: -1, exitIndex: j, counted: true, kind: "sl", bars: j - signalIndex };
      if (hitTp) return { r: 2, exitIndex: j, counted: true, kind: "tp", bars: j - signalIndex };
    }
  }
  const exit = h1[last].c;
  const r = side === "long" ? (exit - entry) / tradeRisk : (entry - exit) / tradeRisk;
  return { r, exitIndex: last, counted: true, kind: "timeout", bars: last - signalIndex };
}

function backtest(d1: Candle[], h4: Candle[], h1: Candle[]): Stats {
  if (h1.length < 180 || h4.length < 80 || d1.length < 80) return EMPTY_STATS;
  const atr = atrSeries(h1);
  const swings = findSwings(h1, 2);
  const start = Math.max(170, h1.length - 480);
  const trades: Sim[] = [];
  let i = start;
  while (i < h1.length - 2) {
    const pat = patternAt(h1, i, atr[i], swings.filter((s) => s.index + 2 <= i));
    if (!pat) {
      i++;
      continue;
    }
    const closeTime = h1[i].t + H1;
    const dSlice = sliceClosed(d1, D1, closeTime);
    const h4Slice = sliceClosed(h4, H4, closeTime);
    if (dSlice.length < 80 || h4Slice.length < 50) {
      i++;
      continue;
    }
    const ev = evaluateSetup(dSlice, h4Slice, h1.slice(0, i + 1), h1[i].c);
    if (ev.grade !== "A" || !ev.plan || !ev.h1.atr) {
      i++;
      continue;
    }
    const sim = simulate(h1, i, ev.plan.side, ev.h1.atr);
    if (!sim.counted) {
      i++;
      continue;
    }
    trades.push(sim);
    i = sim.exitIndex + 1;
  }
  if (trades.length === 0) return EMPTY_STATS;
  const n = trades.length;
  const tp = trades.filter((t) => t.kind === "tp").length;
  const sl = trades.filter((t) => t.kind === "sl").length;
  const timeout = trades.filter((t) => t.kind === "timeout").length;
  const expectancy = trades.reduce((s, t) => s + t.r, 0) / n;
  const gains = trades.filter((t) => t.r > 0).reduce((s, t) => s + t.r, 0);
  const losses = Math.abs(trades.filter((t) => t.r < 0).reduce((s, t) => s + t.r, 0));
  const profitFactor = losses === 0 ? (gains > 0 ? 9.9 : 0) : Math.min(9.9, gains / losses);
  const avgBars = trades.reduce((s, t) => s + t.bars, 0) / n;
  return {
    n,
    tp,
    sl,
    timeout,
    hitRate: tp / n,
    expectancy,
    profitFactor,
    avgBars,
    recent: trades.slice(-8).map((t) => t.r),
  };
}

function chartOf(c: Candle[], levels: Level[]): ChartPack {
  const closes = c.map((x) => x.c);
  const e20 = emaSeries(closes, 20);
  const e50 = emaSeries(closes, 50);
  const from = Math.max(0, c.length - 110);
  const points: ChartPoint[] = [];
  for (let i = from; i < c.length; i++) {
    points.push({
      i,
      t: c[i].t,
      o: c[i].o,
      h: c[i].h,
      l: c[i].l,
      c: c[i].c,
      ema20: finite(e20[i]),
      ema50: finite(e50[i]),
    });
  }
  return { points, levels };
}

function baseLevels(snap: TfSnap): Level[] {
  const levels: Level[] = [];
  if (snap.swingHigh != null) levels.push({ price: snap.swingHigh, kind: "high", label: "سقف ساختار" });
  if (snap.swingLow != null) levels.push({ price: snap.swingLow, kind: "low", label: "کف ساختار" });
  return levels;
}

function planLevels(plan: Plan | null): Level[] {
  if (!plan) return [];
  return [
    { price: plan.entry, kind: "entry", label: "ورود" },
    { price: plan.stop, kind: "stop", label: "حد" },
    { price: plan.tp1, kind: "tp", label: "هدف ۲R" },
  ];
}

export function analyzeSymbol(input: MarketInput): SymbolReport {
  const now = input.now ?? Date.now();
  const base = input.symbol.replace(/USDT$/, "");
  const h1 = closedOnly(input.h1, H1, now);
  const h4 = closedOnly(input.h4, H4, now);
  const d1 = closedOnly(input.d1, D1, now);
  const live = input.h1.length ? input.h1[input.h1.length - 1].c : input.last;
  const shell = (headline: string, daily: TfSnap, h4s: TfSnap, h1s: TfSnap): SymbolReport => ({
    symbol: input.symbol,
    base,
    last: live,
    changePct: input.changePct,
    quoteVolume: input.quoteVolume,
    side: null,
    grade: "flat",
    score: 0,
    headline,
    gates: [gate("daily", "داده", false, true, 16, headline)],
    plan: null,
    stats: EMPTY_STATS,
    daily,
    h4: h4s,
    h1: h1s,
    charts: {
      h1: chartOf(h1, []),
      h4: chartOf(h4, []),
      d1: chartOf(d1, []),
    },
    formingHint: null,
    hotVol: false,
    asOf: h1.length ? h1[h1.length - 1].t : null,
    checked: { pass: 0, total: 1 },
    pullback: null,
  });

  if (h1.length < 80 || h4.length < 40 || d1.length < 40) {
    return shell("داده این نماد برای خواندن ساختار کافی نیست.", emptySnap(), emptySnap(), emptySnap());
  }

  const ev = evaluateSetup(d1, h4, h1, live);
  const stats = ev.side ? backtest(d1, h4, h1) : EMPTY_STATS;
  const atrs = atrSeries(h1);
  const hot = atrRank(atrs, h1.length - 1);
  let formingHint: string | null = null;
  if (input.h1.length === h1.length + 1 && ev.side && ev.grade !== "A") {
    const swings = findSwings(h1, 2);
    const hint = patternAt(input.h1, input.h1.length - 1, atrs[h1.length - 1], swings);
    if (hint && hint.dir === ev.side) {
      formingHint = `کندل جاری هنوز باز است و شکل «${hint.label}» را می‌سازد. تا بسته‌شدن، سیگنال نیست.`;
    }
  }
  const hard = ev.gates.filter((g) => g.hard);
  const h1Levels = [...baseLevels(ev.h1), ...planLevels(ev.plan)];
  return {
    symbol: input.symbol,
    base,
    last: live,
    changePct: input.changePct,
    quoteVolume: input.quoteVolume,
    side: ev.side,
    grade: ev.grade,
    score: ev.score,
    headline: ev.headline,
    gates: ev.gates,
    plan: ev.plan,
    stats,
    daily: ev.daily,
    h4: ev.h4,
    h1: ev.h1,
    charts: {
      h1: chartOf(h1, h1Levels),
      h4: chartOf(h4, baseLevels(ev.h4)),
      d1: chartOf(d1, baseLevels(ev.daily)),
    },
    formingHint,
    hotVol: hot != null && hot >= 0.9,
    asOf: h1[h1.length - 1].t,
    checked: { pass: hard.filter((g) => g.ok).length, total: hard.length },
    pullback: ev.pullback,
  };
}

export function weakEdge(stats: Stats): boolean {
  return stats.n >= 8 && (stats.expectancy ?? 0) <= 0 && (stats.hitRate ?? 1) < 0.45;
}
