import { i as __toESM } from "../_runtime.mjs";
import { b as require_jsx_runtime, q as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { a as RefreshCw, c as ChartCandlestick, i as Search, l as ArrowUp, n as TriangleAlert, o as Minus, r as Star, s as Check, t as X, u as ArrowDown } from "../_libs/lucide-react.mjs";
import { a as CartesianGrid, c as ResponsiveContainer, i as Line, l as Tooltip, n as YAxis, o as ReferenceLine, r as XAxis, s as Customized, t as ComposedChart } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-ymGysepL.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var H1 = 36e5;
var H4 = 144e5;
var D1 = 864e5;
var EMPTY_STATS = {
	n: 0,
	tp: 0,
	sl: 0,
	timeout: 0,
	hitRate: null,
	expectancy: null,
	profitFactor: null,
	avgBars: null,
	recent: []
};
function finite(n) {
	return Number.isFinite(n) ? n : null;
}
function closedOnly(candles, duration, now) {
	if (candles.length === 0) return candles;
	if (candles[candles.length - 1].t + duration > now - 1500) return candles.slice(0, -1);
	return candles.slice();
}
function emaSeries(values, period) {
	const out = new Array(values.length).fill(NaN);
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
function atrSeries(c, period = 14) {
	const out = new Array(c.length).fill(NaN);
	if (c.length <= period) return out;
	const trs = new Array(c.length);
	trs[0] = c[0].h - c[0].l;
	for (let i = 1; i < c.length; i++) trs[i] = Math.max(c[i].h - c[i].l, Math.abs(c[i].h - c[i - 1].c), Math.abs(c[i].l - c[i - 1].c));
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
function rsiSeries(closes, period = 14) {
	const out = new Array(closes.length).fill(NaN);
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
function findSwings(c, wing) {
	const raw = [];
	for (let i = wing; i < c.length - wing; i++) {
		let isHigh = true;
		let isLow = true;
		for (let j = i - wing; j <= i + wing; j++) {
			if (j === i) continue;
			if (c[j].h >= c[i].h) isHigh = false;
			if (c[j].l <= c[i].l) isLow = false;
			if (!isHigh && !isLow) break;
		}
		if (isHigh && isLow) raw.push(c[i].c >= c[i].o ? {
			index: i,
			price: c[i].h,
			kind: "high"
		} : {
			index: i,
			price: c[i].l,
			kind: "low"
		});
		else if (isHigh) raw.push({
			index: i,
			price: c[i].h,
			kind: "high"
		});
		else if (isLow) raw.push({
			index: i,
			price: c[i].l,
			kind: "low"
		});
	}
	const out = [];
	for (const s of raw) {
		const prev = out[out.length - 1];
		if (prev && prev.kind === s.kind) {
			if (s.kind === "high" && s.price >= prev.price) out[out.length - 1] = s;
			else if (s.kind === "low" && s.price <= prev.price) out[out.length - 1] = s;
		} else out.push(s);
	}
	return out;
}
function lastOf(swings, kind) {
	for (let i = swings.length - 1; i >= 0; i--) if (swings[i].kind === kind) return swings[i];
	return null;
}
function biasOf(swings) {
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
function retraceOf(swings, close, side) {
	if (side === "long") {
		let high = null;
		for (let i = swings.length - 1; i >= 0; i--) if (swings[i].kind === "high") {
			high = swings[i];
			break;
		}
		if (!high) return null;
		let low = null;
		for (let i = swings.length - 1; i >= 0; i--) if (swings[i].index < high.index && swings[i].kind === "low") {
			low = swings[i];
			break;
		}
		if (!low) return null;
		const span = high.price - low.price;
		if (!(span > 0)) return null;
		return (high.price - close) / span;
	}
	let low = null;
	for (let i = swings.length - 1; i >= 0; i--) if (swings[i].kind === "low") {
		low = swings[i];
		break;
	}
	if (!low) return null;
	let high = null;
	for (let i = swings.length - 1; i >= 0; i--) if (swings[i].index < low.index && swings[i].kind === "high") {
		high = swings[i];
		break;
	}
	if (!high) return null;
	const span = high.price - low.price;
	if (!(span > 0)) return null;
	return (close - low.price) / span;
}
function chochAgainst(swings, close, side) {
	if (side === "long") {
		const low = lastOf(swings, "low");
		return Boolean(low && close < low.price);
	}
	const high = lastOf(swings, "high");
	return Boolean(high && close > high.price);
}
function obstacleOf(swings, side, entry) {
	if (side === "long") {
		for (let i = swings.length - 1; i >= 0; i--) if (swings[i].kind === "high" && swings[i].price > entry) return swings[i].price;
		return null;
	}
	for (let i = swings.length - 1; i >= 0; i--) if (swings[i].kind === "low" && swings[i].price < entry) return swings[i].price;
	return null;
}
function recentSwing(swings, kind, i, maxAge) {
	for (let k = swings.length - 1; k >= 0; k--) {
		const s = swings[k];
		if (s.kind !== kind || s.index >= i) continue;
		if (i - s.index > maxAge) return null;
		return s;
	}
	return null;
}
function patternAt(c, i, atr, swings) {
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
	if (swingLow && cur.l < swingLow.price && cur.c > swingLow.price && bull && lower >= body * .8 && range >= atr * .35) return {
		name: "sweep",
		dir: "long",
		label: "سوئیپ کف و پس‌گرفتن",
		level: swingLow.price
	};
	const swingHigh = recentSwing(swings, "high", i, 36);
	if (swingHigh && cur.h > swingHigh.price && cur.c < swingHigh.price && bear && upper >= body * .8 && range >= atr * .35) return {
		name: "sweep",
		dir: "short",
		label: "سوئیپ سقف و پس‌گرفتن",
		level: swingHigh.price
	};
	const prevBody = Math.abs(prev.c - prev.o);
	const prevBear = prev.c < prev.o;
	const prevBull = prev.c > prev.o;
	if (prevBear && bull && cur.o <= prev.c && cur.c >= prev.o && body > prevBody && body >= range * .45 && body >= atr * .28) return {
		name: "engulf",
		dir: "long",
		label: "اینگالف صعودی",
		level: null
	};
	if (prevBull && bear && cur.o >= prev.c && cur.c <= prev.o && body > prevBody && body >= range * .45 && body >= atr * .28) return {
		name: "engulf",
		dir: "short",
		label: "اینگالف نزولی",
		level: null
	};
	if (lower >= body * 2 && lower >= range * .55 && upper <= range * .22 && cur.l < prev.l && cur.c > prev.c && range >= atr * .4) return {
		name: "pin",
		dir: "long",
		label: "پین بار صعودی",
		level: null
	};
	if (upper >= body * 2 && upper >= range * .55 && lower <= range * .22 && cur.h > prev.h && cur.c < prev.c && range >= atr * .4) return {
		name: "pin",
		dir: "short",
		label: "پین بار نزولی",
		level: null
	};
	const inside = prev.h <= mother.h && prev.l >= mother.l;
	const motherRange = mother.h - mother.l;
	if (inside && motherRange >= atr * .45 && bull && cur.c > mother.h && body >= range * .35) return {
		name: "inside",
		dir: "long",
		label: "شکست اینسایدبار به بالا",
		level: mother.h
	};
	if (inside && motherRange >= atr * .45 && bear && cur.c < mother.l && body >= range * .35) return {
		name: "inside",
		dir: "short",
		label: "شکست اینسایدبار به پایین",
		level: mother.l
	};
	return null;
}
function atrRank(series, index) {
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
function frameOf(c, wing) {
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
	const side = bias === "bull" ? "long" : bias === "bear" ? "short" : null;
	const high = lastOf(swings, "high");
	const low = lastOf(swings, "low");
	const snap = {
		bias,
		close: c[i].c,
		ema20: finite(ema20[i]),
		ema50: finite(ema50[i]),
		ema200: finite(ema200[i]),
		atr: finite(atr[i]),
		rsi: finite(rsi[i]),
		swingHigh: high?.price ?? null,
		swingLow: low?.price ?? null,
		retrace: side ? retraceOf(swings, c[i].c, side) : null
	};
	return {
		snap,
		swings,
		atr: snap.atr,
		close: c[i].c
	};
}
function emptySnap(close = 0) {
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
		retrace: null
	};
}
function gate(id, label, ok, hard, weight, detail) {
	return {
		id,
		label,
		ok,
		hard,
		weight,
		detail
	};
}
function evaluateSetup(d1, h4, h1, live) {
	const dailyF = frameOf(d1, 3);
	const h4F = frameOf(h4, 3);
	const h1F = frameOf(h1, 2);
	const daily = dailyF?.snap ?? emptySnap();
	const h4s = h4F?.snap ?? emptySnap();
	const h1s = h1F?.snap ?? emptySnap();
	const blank = (headline) => ({
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
		pullback: null
	});
	if (!dailyF || !h4F || !h1F) return blank("داده این نماد برای خواندن ساختار کافی نیست.");
	const side = daily.bias === "bull" ? "long" : daily.bias === "bear" ? "short" : null;
	if (!side) return blank("ساختار روزانه رنج است. تا وقتی سقف و کف‌ها روند نسازند، ستاپی صادر نمی‌شود.");
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
	const h4Opposed = up && h4s.bias === "bear" || !up && h4s.bias === "bull";
	const broke = chochAgainst(h4F.swings, h4F.close, side);
	const retrace = retraceOf(h4F.swings, h4F.close, side);
	const fibIn = retrace != null && retrace >= .34 && retrace <= .66;
	const near = retrace != null && retrace >= .18 && retrace <= .82;
	const sweepOk = aligned?.name === "sweep" && aligned.level != null && h4F.atr != null && (up && h4s.swingLow != null && Math.abs(aligned.level - h4s.swingLow) <= h4F.atr * .9 || !up && h4s.swingHigh != null && Math.abs(aligned.level - h4s.swingHigh) <= h4F.atr * .9);
	const inValue = fibIn || Boolean(sweepOk);
	const signal = h1[i];
	let plan = null;
	let tooWide = false;
	if (aligned && Number.isFinite(atr1) && atr1 > 0) {
		const buffer = atr1 * .08;
		const stop = (up ? signal.c - (signal.l - buffer) : signal.h + buffer - signal.c) < atr1 * .3 ? up ? signal.c - atr1 * .3 : signal.c + atr1 * .3 : up ? signal.l - buffer : signal.h + buffer;
		const risk = Math.abs(signal.c - stop);
		tooWide = !(risk > 0) || risk > atr1 * 1.7;
		if (risk > 0) {
			const obstacle = obstacleOf(h4F.swings, side, signal.c);
			const roomR = obstacle == null ? null : up ? (obstacle - signal.c) / risk : (signal.c - obstacle) / risk;
			const progressed = up ? (live - signal.c) / risk : (signal.c - live) / risk;
			plan = {
				side,
				entry: signal.c,
				stop,
				tp1: up ? signal.c + 2 * risk : signal.c - 2 * risk,
				tp2: up ? signal.c + 3 * risk : signal.c - 3 * risk,
				risk,
				riskPct: risk / signal.c * 100,
				pattern: aligned.name,
				patternLabel: aligned.label,
				stale: progressed > .5,
				obstacle,
				roomR
			};
		}
	}
	const roomPass = plan != null && (plan.roomR == null || plan.roomR >= 2);
	const stopPass = plan != null && !tooWide;
	const rsi = h1s.rsi;
	const rsiOk = rsi == null ? false : up ? rsi <= 74 : rsi >= 26;
	const geometryHard = Boolean(aligned);
	const retraceTxt = retrace == null ? "اصلاح موج چهارساعته خوانده نشد" : `اصلاح چهارساعته ${Math.round(retrace * 100)}٪ موج قبل`;
	const gates = [
		gate("daily", "ساختار روزانه", true, true, 16, up ? "ساختار روزانه صعودی است: سقف بالاتر و کف بالاتر." : "ساختار روزانه نزولی است: سقف پایین‌تر و کف پایین‌تر."),
		gate("ema", "میانگین ۵۰", emaSideOk, true, 10, emaSideOk ? `قیمت روزانه ${up ? "بالای" : "پایین"} میانگین ۵۰ است.` : up ? "قیمت روزانه هنوز زیر میانگین ۵۰ است." : "قیمت روزانه هنوز بالای میانگین ۵۰ است."),
		gate("stack", "چینش ۲۰۰", stacked, false, 4, stacked ? "میانگین ۵۰ و ۲۰۰ روزانه هم‌جهت‌اند؛ روند بالغ‌تر است." : "میانگین ۵۰ هنوز از ۲۰۰ عبور نکرده. روند جوان‌تر است و وزن کمتری دارد."),
		gate("h4", "ساختار چهارساعته", !h4Opposed, true, 12, h4Opposed ? "ساختار چهارساعته خلاف روند روزانه است." : "چهارساعته خلاف روند روزانه نشکسته است."),
		gate("choch", "شکست ساختار", !broke, true, 12, broke ? up ? "کلوز چهارساعته آخرین کف حمایتی را از دست داده." : "کلوز چهارساعته آخرین سقف نزولی را پس گرفته." : "کلوز چهارساعته سطح محافظ روند را نشکسته."),
		gate("value", "منطقه ارزش", inValue, true, 16, inValue ? sweepOk && !fibIn ? "ورود روی سوئیپ سطح چهارساعته و پس‌گرفتن آن است." : `${retraceTxt} و داخل منطقه ۳۸ تا ۶۲ درصد است.` : `${retraceTxt}. منطقه ارزش ۳۸ تا ۶۲ درصد یا سوئیپ معتبر هنوز کامل نیست.`),
		gate("trigger", "تأیید یک‌ساعته", Boolean(aligned), true, 10, aligned ? `کندل بستهٔ یک‌ساعته: ${aligned.label}.` : pattern && pattern.dir !== side ? "آخرین الگوی یک‌ساعته خلاف جهت روزانه است و نادیده گرفته شد." : "کندل یک‌ساعتهٔ بسته هنوز سوئیپ، اینگالف، پین یا شکست اینسایدبار نداده."),
		gate("stop", "اندازه حد", stopPass, geometryHard, 8, !aligned ? "بعد از کندل تأیید سنجیده می‌شود." : stopPass ? "حد پشت فتیله کندل تأیید است و از ۰٫۳ تا ۱٫۷ برابر ATR یک‌ساعته خارج نیست." : "حد طبیعی کندل نسبت به نوسان یک‌ساعته بیش از حد پهن است."),
		gate("room", "فضای ۲R", roomPass, geometryHard, 8, !aligned ? "بعد از کندل تأیید سنجیده می‌شود." : roomPass ? plan?.obstacle == null ? "سقف یا کف چهارساعتهٔ بازی جلوی هدف ۲R نیست." : "فاصله تا مانع چهارساعته دست‌کم ۲ برابر ریسک است." : "مانع چهارساعته قبل از هدف ۲R نشسته؛ فضا برای این حد کافی نیست."),
		gate("rsi", "تعقیب ممنوع", Boolean(aligned) && rsiOk, geometryHard, 4, !aligned ? "بعد از کندل تأیید سنجیده می‌شود." : rsiOk ? "RSI یک‌ساعته در منطقه تعقیب هیجانی نیست." : up ? "RSI یک‌ساعته بالای ۷۴ است؛ ورود دیر شده." : "RSI یک‌ساعته زیر ۲۶ است؛ ورود دیر شده.")
	];
	const score = Math.min(100, gates.reduce((sum, g) => sum + (g.ok ? g.weight : 0), 0));
	const failed = new Set(gates.filter((g) => g.hard && !g.ok).map((g) => g.id));
	const htfBroken = [
		"daily",
		"ema",
		"h4",
		"choch"
	].some((id) => failed.has(id));
	let grade = "flat";
	if (failed.size === 0 && plan && !plan.stale) grade = "A";
	else if (plan?.stale && !htfBroken && !failed.has("value")) grade = "armed";
	else if (plan && !plan.stale && !htfBroken && !failed.has("value") && (failed.has("room") || failed.has("stop") || failed.has("rsi"))) grade = "armed";
	else if (!htfBroken && !failed.has("value") && failed.has("trigger")) grade = "watch";
	else if (!htfBroken && failed.has("value")) grade = "watch";
	let headline;
	if (grade === "A" && plan) headline = `ستاپ A ${buyWord} — ${plan.patternLabel}، منطقه ارزش، فضای حداقل ۲R.`;
	else if (plan?.stale) headline = `الگوی ${plan.patternLabel} بسته شده اما قیمت بیش از نیم‌R از ورود جلو رفته؛ تعقیب نکن.`;
	else if (grade === "armed" && plan) headline = `${plan.patternLabel} هست، ولی حد یا فضای هدف استاندارد ۲R را ندارد.`;
	else if (grade === "watch" && failed.has("trigger") && !failed.has("value")) headline = `زمینه ${buyWord} آماده است. منتظر کندل تأیید یک‌ساعته بمان.`;
	else if (grade === "watch" && failed.has("value") && !near) headline = `روند روزانه ${dirWord} است ولی قیمت از منطقه ارزش دور است؛ تعقیب نکن، منتظر اصلاح بمان.`;
	else if (grade === "watch") headline = `روند روزانه ${dirWord} است ولی قیمت هنوز وسط منطقه ارزش ننشسته.`;
	else headline = gates.find((g) => g.hard && !g.ok)?.detail ?? "قفل‌های روند با هم بسته نیستند.";
	return {
		side,
		grade,
		score,
		gates,
		plan,
		daily,
		h4: h4s,
		h1: h1s,
		headline,
		near,
		pullback: retrace
	};
}
function sliceClosed(candles, duration, timeClose) {
	let end = candles.length;
	while (end > 0 && candles[end - 1].t + duration > timeClose) end--;
	return end === candles.length ? candles : candles.slice(0, end);
}
function simulate(h1, signalIndex, side, atr) {
	const skip = (exitIndex) => ({
		r: 0,
		exitIndex,
		counted: false,
		kind: "skip",
		bars: 0
	});
	const sig = h1[signalIndex];
	const next = h1[signalIndex + 1];
	if (!next || !(atr > 0)) return skip(signalIndex);
	const buffer = atr * .08;
	const stop = (side === "long" ? sig.c - (sig.l - buffer) : sig.h + buffer - sig.c) < atr * .3 ? side === "long" ? sig.c - atr * .3 : sig.c + atr * .3 : side === "long" ? sig.l - buffer : sig.h + buffer;
	const risk = Math.abs(sig.c - stop);
	if (!(risk > 0) || risk > atr * 1.7) return skip(signalIndex);
	const entry = next.o;
	if ((side === "long" ? (entry - sig.c) / risk : (sig.c - entry) / risk) > .45) return skip(signalIndex);
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
			if (hitStop) return {
				r: -1,
				exitIndex: j,
				counted: true,
				kind: "sl",
				bars: j - signalIndex
			};
			if (hitTp) return {
				r: 2,
				exitIndex: j,
				counted: true,
				kind: "tp",
				bars: j - signalIndex
			};
		} else {
			const hitStop = bar.h >= stop;
			const hitTp = bar.l <= tp;
			if (hitStop) return {
				r: -1,
				exitIndex: j,
				counted: true,
				kind: "sl",
				bars: j - signalIndex
			};
			if (hitTp) return {
				r: 2,
				exitIndex: j,
				counted: true,
				kind: "tp",
				bars: j - signalIndex
			};
		}
	}
	const exit = h1[last].c;
	return {
		r: side === "long" ? (exit - entry) / tradeRisk : (entry - exit) / tradeRisk,
		exitIndex: last,
		counted: true,
		kind: "timeout",
		bars: last - signalIndex
	};
}
function backtest(d1, h4, h1) {
	if (h1.length < 180 || h4.length < 80 || d1.length < 80) return EMPTY_STATS;
	const atr = atrSeries(h1);
	const swings = findSwings(h1, 2);
	const start = Math.max(170, h1.length - 480);
	const trades = [];
	let i = start;
	while (i < h1.length - 2) {
		if (!patternAt(h1, i, atr[i], swings.filter((s) => s.index + 2 <= i))) {
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
	const profitFactor = losses === 0 ? gains > 0 ? 9.9 : 0 : Math.min(9.9, gains / losses);
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
		recent: trades.slice(-8).map((t) => t.r)
	};
}
function chartOf(c, levels) {
	const closes = c.map((x) => x.c);
	const e20 = emaSeries(closes, 20);
	const e50 = emaSeries(closes, 50);
	const from = Math.max(0, c.length - 110);
	const points = [];
	for (let i = from; i < c.length; i++) points.push({
		i,
		t: c[i].t,
		o: c[i].o,
		h: c[i].h,
		l: c[i].l,
		c: c[i].c,
		ema20: finite(e20[i]),
		ema50: finite(e50[i])
	});
	return {
		points,
		levels
	};
}
function baseLevels(snap) {
	const levels = [];
	if (snap.swingHigh != null) levels.push({
		price: snap.swingHigh,
		kind: "high",
		label: "سقف ساختار"
	});
	if (snap.swingLow != null) levels.push({
		price: snap.swingLow,
		kind: "low",
		label: "کف ساختار"
	});
	return levels;
}
function planLevels(plan) {
	if (!plan) return [];
	return [
		{
			price: plan.entry,
			kind: "entry",
			label: "ورود"
		},
		{
			price: plan.stop,
			kind: "stop",
			label: "حد"
		},
		{
			price: plan.tp1,
			kind: "tp",
			label: "هدف ۲R"
		}
	];
}
function analyzeSymbol(input) {
	const now = input.now ?? Date.now();
	const base = input.symbol.replace(/USDT$/, "");
	const h1 = closedOnly(input.h1, H1, now);
	const h4 = closedOnly(input.h4, H4, now);
	const d1 = closedOnly(input.d1, D1, now);
	const live = input.h1.length ? input.h1[input.h1.length - 1].c : input.last;
	const shell = (headline, daily, h4s, h1s) => ({
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
			d1: chartOf(d1, [])
		},
		formingHint: null,
		hotVol: false,
		asOf: h1.length ? h1[h1.length - 1].t : null,
		checked: {
			pass: 0,
			total: 1
		},
		pullback: null
	});
	if (h1.length < 80 || h4.length < 40 || d1.length < 40) return shell("داده این نماد برای خواندن ساختار کافی نیست.", emptySnap(), emptySnap(), emptySnap());
	const ev = evaluateSetup(d1, h4, h1, live);
	const stats = ev.side ? backtest(d1, h4, h1) : EMPTY_STATS;
	const atrs = atrSeries(h1);
	const hot = atrRank(atrs, h1.length - 1);
	let formingHint = null;
	if (input.h1.length === h1.length + 1 && ev.side && ev.grade !== "A") {
		const swings = findSwings(h1, 2);
		const hint = patternAt(input.h1, input.h1.length - 1, atrs[h1.length - 1], swings);
		if (hint && hint.dir === ev.side) formingHint = `کندل جاری هنوز باز است و شکل «${hint.label}» را می‌سازد. تا بسته‌شدن، سیگنال نیست.`;
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
			d1: chartOf(d1, baseLevels(ev.daily))
		},
		formingHint,
		hotVol: hot != null && hot >= .9,
		asOf: h1[h1.length - 1].t,
		checked: {
			pass: hard.filter((g) => g.ok).length,
			total: hard.length
		},
		pullback: ev.pullback
	};
}
function weakEdge(stats) {
	return stats.n >= 8 && (stats.expectancy ?? 0) <= 0 && (stats.hitRate ?? 1) < .45;
}
function formatPx(n) {
	if (n == null || !Number.isFinite(n)) return "—";
	const abs = Math.abs(n);
	const digits = abs >= 1e3 ? 2 : abs >= 100 ? 2 : abs >= 1 ? 4 : abs >= .1 ? 5 : abs >= .01 ? 6 : 8;
	return new Intl.NumberFormat("en-US", {
		maximumFractionDigits: digits,
		minimumFractionDigits: 0
	}).format(n);
}
function formatPct(n, digits = 2) {
	if (!Number.isFinite(n)) return "—";
	return `${n > 0 ? "+" : ""}${n.toFixed(digits)}%`;
}
function formatVol(n) {
	if (!Number.isFinite(n)) return "—";
	if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
	if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
	if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
	return n.toFixed(0);
}
function formatR(n) {
	if (n == null || !Number.isFinite(n)) return "—";
	return `${n > 0 ? "+" : ""}${n.toFixed(2)}R`;
}
function formatHit(rate) {
	if (rate == null || !Number.isFinite(rate)) return "—";
	return `${Math.round(rate * 100)}%`;
}
function formatWhen(t) {
	if (!Number.isFinite(t)) return "—";
	return new Intl.DateTimeFormat("en-GB", {
		timeZone: "Asia/Tehran",
		month: "short",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23"
	}).format(new Date(t));
}
var NAMES = {
	BTC: "بیت‌کوین",
	ETH: "اتریوم",
	BNB: "بی‌ان‌بی",
	SOL: "سولانا",
	XRP: "ریپل",
	DOGE: "دوج‌کوین",
	ADA: "کاردانو",
	AVAX: "آوالانچ",
	TRX: "ترون",
	DOT: "پولکادات",
	LINK: "چین‌لینک",
	TON: "تون",
	SHIB: "شیبا",
	LTC: "لایت‌کوین",
	BCH: "بیت‌کوین‌کش",
	UNI: "یونی‌سواپ",
	ATOM: "کازماس",
	XLM: "استلار",
	ETC: "اتریوم کلاسیک",
	NEAR: "نیر",
	APT: "اپتوس",
	FIL: "فایل‌کوین",
	OP: "آپتیمیزم",
	ARB: "آربیتروم",
	INJ: "اینجکتیو",
	VET: "وی‌چین",
	ICP: "اینترنت کامپیوتر",
	SUI: "سویی",
	SEI: "سی",
	TIA: "سلستیا",
	RUNE: "تورچین",
	AAVE: "آوه",
	GRT: "گراف",
	ALGO: "الگورند",
	STX: "استکس",
	HBAR: "هدرا",
	IMX: "ایمیوتبل",
	PEPE: "پپه",
	WIF: "داگ‌ویف‌هت",
	BONK: "بانک",
	FLOKI: "فلوکی",
	JUP: "ژوپیتر",
	WLD: "ورلدکوین",
	STRK: "استارک‌نت",
	PENDLE: "پندل",
	ENS: "اتریوم نیم سرویس",
	GALA: "گالا",
	LDO: "لیدو",
	RENDER: "رندر",
	FET: "فچ",
	TAO: "بیت‌تنسور",
	CFX: "کانفلاکس",
	KAS: "کسپا",
	PYTH: "پایت",
	AR: "آرویو",
	CRV: "کرو",
	COMP: "کامپاند",
	SNX: "سینتتیکس",
	DYDX: "دی‌وای‌دی‌ایکس",
	GMX: "جی‌ام‌ایکس",
	MINA: "مینا",
	CHZ: "چیلیز",
	APE: "ایپ‌کوین",
	IOTA: "آیوتا",
	NEO: "نئو",
	XMR: "مونرو",
	ZEC: "زی‌کش",
	DASH: "دش",
	SAND: "سندباکس",
	MANA: "دیسنترالند",
	AXS: "اکسی اینفینیتی",
	XTZ: "تزوس",
	THETA: "تتا",
	EGLD: "مولتی‌ورس‌اکس",
	FLOW: "فلو",
	QNT: "کوانت",
	MKR: "میکر",
	RNDR: "رندر",
	S: "سونیک",
	FTM: "فانتوم",
	POL: "پالیگان",
	MATIC: "پالیگان",
	ENA: "اتنا",
	ONDO: "اوندو",
	W: "ورم‌هول",
	NOT: "نات‌کوین",
	PEOPLE: "پیپل",
	ORDI: "اوردی",
	"1000SATS": "۱۰۰۰ساتس",
	"1000PEPE": "۱۰۰۰پپه",
	"1000BONK": "۱۰۰۰بانک",
	BOME: "بوک آو میم",
	ETHFI: "اترفای",
	EIGEN: "آیگن",
	ZRO: "لیرزیرو",
	BLUR: "بلر",
	CAKE: "پنکیک‌سواپ",
	RSR: "ریزرور رایت",
	LPT: "لایوپییر",
	KAVA: "کاوا",
	ZIL: "زیلیکا",
	ONE: "هارمونی",
	ROSE: "اوسیس",
	KSM: "کوزاما",
	BAT: "بت",
	ENJ: "انجین",
	"1INCH": "وان‌اینچ",
	SUSHI: "سوشی",
	YFI: "یرن",
	WOO: "وو",
	GMT: "استپن",
	ASTR: "آستار",
	JTO: "جیتو",
	TNSR: "تنسور",
	PIXEL: "پیکسل",
	AXL: "اکسلار",
	METIS: "متیس",
	MANTA: "مانتا",
	DYM: "دایمنشن",
	AEVO: "ایوو",
	SAGA: "ساگا",
	OMNI: "امنی",
	BB: "بونس‌بیت",
	IO: "آی‌او‌نت",
	ZK: "زی‌کی‌سینک",
	LISTA: "لیستا",
	BANANA: "بنانا",
	DOGS: "داگز",
	CATI: "کتیزن",
	HMSTR: "همستر",
	NEIRO: "نیرو",
	SCR: "اسکرول",
	KAIA: "کایا",
	PNUT: "پینات",
	ACT: "اکت",
	USUAL: "یوژوال",
	PENGU: "پادنگو",
	MOVE: "موومنت",
	ME: "مجیک‌ادن",
	VANA: "وانا",
	AIXBT: "ایکس‌بی‌تی",
	FARTCOIN: "فارت‌کوین",
	TRUMP: "ترامپ",
	MELANIA: "ملانیا",
	LAYER: "سولیر",
	IP: "استوری",
	KAITO: "کایتو",
	MUBARAK: "مبارک",
	FORM: "فرم",
	KERNEL: "کرنل",
	WCT: "والت‌کانکت",
	HYPER: "هایپر",
	SOPH: "سوفون",
	RESOLV: "ریزولو",
	HOME: "دفی‌هوم",
	SPK: "اسپارک",
	NEWT: "نیوتن",
	SAHARA: "صحرا",
	LA: "لاگرانژ",
	ERA: "کالدری",
	PROVE: "ساکس",
	PLUME: "پلوم",
	LINEA: "لینیا",
	"0G": "زیرو‌جی",
	WAL: "والروس",
	BABY: "بیبی‌دوج",
	INIT: "اینیشیا",
	SIGN: "ساین",
	ZORA: "زورا",
	HYPE: "هایپرلیکوئید",
	ASTER: "استر",
	WLFI: "ورلد لیبرتی",
	M: "میم‌کور",
	XPL: "پلاسما",
	MON: "موناد"
};
function coinName(base) {
	return NAMES[base] ?? base;
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var fetchUniverse = createServerFn({ method: "GET" }).handler(createSsrRpc("15891fbdf9919dfba88ffddd30091692986afccfd35e3fce811aaa4a6caa50af"));
var fetchBundle = createServerFn({ method: "POST" }).validator((data) => {
	if (!data || typeof data !== "object") throw new Error("درخواست نامعتبر");
	const symbol = data.symbol;
	const fresh = Boolean(data.fresh);
	if (typeof symbol !== "string" || !/^[A-Z0-9]{2,20}USDT$/.test(symbol)) throw new Error("نماد نامعتبر");
	return {
		symbol,
		fresh
	};
}).handler(createSsrRpc("52d2da25caa5e1097e197e57783f58259c00b4ea91cb433ea33bdee9e3bc0eef"));
var LEVEL_COLOR = {
	entry: "var(--color-brass)",
	stop: "var(--color-down)",
	tp: "var(--color-up)",
	high: "var(--color-muted)",
	low: "var(--color-muted)"
};
function CandleLayer({ xAxisMap, yAxisMap, points }) {
	const xAxis = xAxisMap && Object.values(xAxisMap)[0];
	const yAxis = yAxisMap && Object.values(yAxisMap)[0];
	if (!xAxis || !yAxis || points.length < 2) return null;
	const step = Math.abs(xAxis.scale(points[1].i) - xAxis.scale(points[0].i)) || 6;
	const bodyW = Math.max(2.5, Math.min(9, step * .62));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("g", { children: points.map((point) => {
		const cx = xAxis.scale(point.i);
		const yHigh = yAxis.scale(point.h);
		const yLow = yAxis.scale(point.l);
		const yOpen = yAxis.scale(point.o);
		const yClose = yAxis.scale(point.c);
		if (![
			cx,
			yHigh,
			yLow,
			yOpen,
			yClose
		].every(Number.isFinite)) return null;
		const color = point.c >= point.o ? "var(--color-up)" : "var(--color-down)";
		const top = Math.min(yOpen, yClose);
		const height = Math.max(1, Math.abs(yClose - yOpen));
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
			x1: cx,
			x2: cx,
			y1: yHigh,
			y2: yLow,
			stroke: color,
			strokeWidth: 1
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
			x: cx - bodyW / 2,
			y: top,
			width: bodyW,
			height,
			fill: color
		})] }, point.t);
	}) });
}
function Tip({ active, payload }) {
	const point = payload?.[0]?.payload;
	if (!active || !point) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-md border border-line bg-surface px-3 py-2 text-xs text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "font-num text-muted",
			children: formatWhen(point.t)
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-1 grid grid-cols-2 gap-x-3 gap-y-1 font-num",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["O ", formatPx(point.o)] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["H ", formatPx(point.h)] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["L ", formatPx(point.l)] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["C ", formatPx(point.c)] })
			]
		})]
	});
}
function PaChart({ pack }) {
	const points = pack.points;
	if (points.length < 5) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "px-1 py-6 text-sm text-muted",
		children: "کندل کافی برای نمودار نیست."
	});
	const values = points.flatMap((point) => [point.l, point.h]);
	for (const level of pack.levels) values.push(level.price);
	const low = Math.min(...values);
	const high = Math.max(...values);
	const pad = (high - low) * .08 || Math.abs(high) * .02 || 1;
	function layer(props) {
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CandleLayer, {
			...props,
			points
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		dir: "ltr",
		className: "h-64 w-full min-w-0 lg:h-80",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
			width: "100%",
			height: "100%",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ComposedChart, {
				data: points,
				margin: {
					top: 8,
					right: 8,
					left: 0,
					bottom: 0
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
						stroke: "var(--color-line)",
						vertical: false
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
						dataKey: "i",
						type: "number",
						domain: ["dataMin", "dataMax"],
						hide: true
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
						domain: [low - pad, high + pad],
						orientation: "left",
						width: 72,
						tickFormatter: (value) => formatPx(value),
						tick: {
							fill: "var(--color-muted)",
							fontSize: 11
						},
						axisLine: false,
						tickLine: false
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { content: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tip, {}) }),
					pack.levels.map((level) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReferenceLine, {
						y: level.price,
						stroke: LEVEL_COLOR[level.kind],
						strokeDasharray: level.kind === "high" || level.kind === "low" ? "2 4" : "5 4",
						strokeWidth: 1
					}, `${level.kind}-${level.price}`)),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
						dataKey: "ema20",
						stroke: "var(--color-brass)",
						dot: false,
						strokeWidth: 1.4,
						connectNulls: true,
						isAnimationActive: false,
						name: "EMA20"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Customized, { component: layer })
				]
			})
		})
	});
}
var GRADE_LABEL$1 = {
	A: "ستاپ A",
	armed: "هندسه ناقص",
	watch: "در کمین",
	flat: "فقط زمینه"
};
var BIAS_LABEL = {
	bull: "صعودی",
	bear: "نزولی",
	range: "رنج"
};
function biasClass(bias) {
	if (bias === "bull") return "text-up";
	if (bias === "bear") return "text-down";
	return "text-muted";
}
function sideWord(side) {
	if (side === "long") return "خرید";
	if (side === "short") return "فروش";
	return "بدون جهت";
}
function edgeNote(stats) {
	if (stats.n === 0) return "در حدود سه هفته اخیر، این قانون دقیق روی این نماد معامله‌ای نساخته.";
	if (stats.n < 5) return "نمونه کمتر از ۵ است. درصد را به‌چشم آمار قطعی نبین.";
	if ((stats.expectancy ?? 0) > .15) return "انتظار R در همین پنجره مثبت است. این لبه آینده را تضمین نمی‌کند.";
	if ((stats.expectancy ?? 0) <= 0) return "حتی با همین فیلتر، نتیجه اخیر این نماد منفی بوده.";
	return "انتظار نزدیک صفر است؛ مزیت واضحی در این پنجره دیده نمی‌شود.";
}
function SetupPanel({ report, onClose }) {
	const [tf, setTf] = (0, import_react.useState)("h1");
	const [balance, setBalance] = (0, import_react.useState)("");
	const [riskPct, setRiskPct] = (0, import_react.useState)("1");
	(0, import_react.useEffect)(() => {
		setTf("h1");
	}, [report.symbol]);
	(0, import_react.useEffect)(() => {
		const savedBalance = localStorage.getItem("sakhtar-balance");
		const savedRisk = localStorage.getItem("sakhtar-risk");
		if (savedBalance) setBalance(savedBalance);
		if (savedRisk) setRiskPct(savedRisk);
	}, []);
	const pack = report.charts[tf];
	const plan = report.plan;
	const balanceNum = Number(balance);
	const riskNum = Number(riskPct);
	const size = plan && balanceNum > 0 && riskNum > 0 ? {
		quote: balanceNum * riskNum / 100,
		units: balanceNum * riskNum / 100 / plan.risk
	} : null;
	function persistBalance(value) {
		setBalance(value);
		localStorage.setItem("sakhtar-balance", value);
	}
	function persistRisk(value) {
		setRiskPct(value);
		localStorage.setItem("sakhtar-risk", value);
	}
	const tfButton = (id, label) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick: () => setTf(id),
		className: tf === id ? "min-h-11 rounded-md bg-brass px-3 text-sm font-medium text-bg" : "min-h-11 rounded-md border border-line px-3 text-sm text-fg",
		children: label
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "flex flex-col gap-5 px-4 py-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-brass",
							children: GRADE_LABEL$1[report.grade]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
							className: "mt-1 text-2xl font-semibold",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("bdi", {
								className: "font-num",
								children: report.base
							}), coinName(report.base) !== report.base ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "ms-2 text-base font-normal text-muted",
								children: coinName(report.base)
							}) : null]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm leading-relaxed text-fg",
							children: report.headline
						})
					]
				}), onClose ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onClose,
					className: "inline-flex size-11 items-center justify-center rounded-md border border-line text-fg lg:hidden",
					"aria-label": "بستن",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-5" })
				}) : null]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-3 gap-2 text-center",
				children: [
					["روزانه", report.daily.bias],
					["چهارساعته", report.h4.bias],
					["یک‌ساعته", report.h1.bias]
				].map(([label, bias]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border border-line bg-surface px-2 py-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs text-muted",
						children: label
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: `mt-1 text-sm font-medium ${biasClass(bias)}`,
						children: BIAS_LABEL[bias]
					})]
				}, label))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-2",
				children: [
					tfButton("d1", "روزانه"),
					tfButton("h4", "چهارساعته"),
					tfButton("h1", "یک‌ساعته")
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PaChart, { pack }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
					className: "text-brass",
					children: "میانگین ۲۰"
				}), pack.levels.map((level) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "font-num",
					children: [
						level.label,
						" ",
						formatPx(level.price)
					]
				}, `${level.kind}-${level.label}`))]
			}),
			report.formingHint ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "border border-line bg-surface px-3 py-2 text-sm leading-relaxed text-fg",
				children: report.formingHint
			}) : null,
			report.hotVol ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "flex items-start gap-2 bg-down-soft px-3 py-2 text-sm text-down",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "mt-0.5 size-4 shrink-0" }), "نوسان یک‌ساعته نسبت به هفته‌های اخیر بالاست. حد ممکن است زودتر از حد معمول لمس شود."]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-sm font-medium",
				children: "قفل‌ها"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-2 divide-y divide-line border-y border-line",
				children: report.gates.map((item) => {
					const Icon = item.ok ? Check : item.hard ? X : Minus;
					const color = item.ok ? "text-up" : item.hard ? "text-down" : "text-muted";
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex gap-3 py-2.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
							className: `mt-0.5 size-4 shrink-0 ${color}`,
							"aria-hidden": true
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm",
							children: item.label
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-0.5 text-xs leading-relaxed text-muted",
							children: item.detail
						})] })]
					}, item.id);
				})
			})] }),
			plan ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "border border-line bg-surface px-3 py-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
						className: "text-sm font-medium",
						children: [
							"برگه ",
							sideWord(plan.side),
							" · ",
							plan.patternLabel
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
						className: "mt-3 grid grid-cols-2 gap-3 text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-xs text-muted",
								children: "ورود، کلوز تأیید"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
								className: "font-num",
								children: formatPx(plan.entry)
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-xs text-muted",
								children: "حد ضرر"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
								className: "font-num text-down",
								children: formatPx(plan.stop)
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-xs text-muted",
								children: "هدف اول ۲R"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
								className: "font-num text-up",
								children: formatPx(plan.tp1)
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-xs text-muted",
								children: "هدف دوم ۳R"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
								className: "font-num text-up",
								children: formatPx(plan.tp2)
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-xs text-muted",
								children: "فاصله حد"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
								className: "font-num",
								children: formatPct(plan.riskPct)
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-xs text-muted",
								children: "فضا تا مانع"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
								className: "font-num",
								children: plan.roomR == null ? "باز" : formatR(plan.roomR)
							})] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-xs leading-relaxed text-muted",
						children: "نصف حجم را در ۲R ببند و حد بقیه را به ورود ببر. اگر قیمت بیش از نیم‌R از این ورود جلو رفته، ستاپ را تعقیب نکن."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 grid gap-2 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "text-xs text-muted",
							children: ["موجودی تتر", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								inputMode: "decimal",
								value: balance,
								onChange: (event) => persistBalance(event.target.value),
								className: "mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 font-num text-sm text-fg",
								placeholder: "1000"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "text-xs text-muted",
							children: ["ریسک هر معامله، درصد", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								inputMode: "decimal",
								value: riskPct,
								onChange: (event) => persistRisk(event.target.value),
								className: "mt-1 min-h-11 w-full rounded-md border border-line bg-bg px-3 font-num text-sm text-fg"
							})]
						})]
					}),
					size ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-3 font-num text-sm text-fg",
						children: [
							"ریسک ",
							formatPx(size.quote),
							" USDT · حجم ",
							size.units >= 1 ? size.units.toFixed(3) : size.units.toFixed(4),
							" ",
							report.base
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-xs text-muted",
						children: "موجودی را بنویس تا اندازه پوزیشن از روی فاصله حد حساب شود."
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "هنوز برگه ورود صادر نشده. قفل‌های بالا باید با هم سبز شوند."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-sm font-medium",
					children: "آزمون همین قانون روی کندل‌های اخیر"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-xs leading-relaxed text-muted",
					children: edgeNote(report.stats)
				}),
				weakEdge(report.stats) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-down",
					children: "این نماد با همین فیلتر در پنجره اخیر لبه منفی داشته است."
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
					className: "mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "text-xs text-muted",
							children: "رسیدن به ۲R"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
							className: "font-num",
							children: formatHit(report.stats.hitRate)
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "text-xs text-muted",
							children: "انتظار"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
							className: "font-num",
							children: formatR(report.stats.expectancy)
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "text-xs text-muted",
							children: "تعداد"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
							className: "font-num",
							children: report.stats.n
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "text-xs text-muted",
							children: "ضریب سود"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
							className: "font-num",
							children: report.stats.profitFactor == null ? "—" : report.stats.profitFactor.toFixed(2)
						})] })
					]
				}),
				report.stats.recent.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 flex flex-wrap gap-1.5",
					children: report.stats.recent.map((value, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
						className: `font-num rounded-md px-2 py-1 text-xs ${value > 0 ? "bg-up-soft text-up" : "bg-down-soft text-down"}`,
						children: formatR(value)
					}, `${value}-${index}`))
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-3 text-xs leading-relaxed text-muted",
					children: [
						"ورود فرضی: قیمت باز شدن کندل بعد. اگر حد و هدف در یک کندل باشند، باخت حساب شده. خروج زمانی بعد از ۳۶ کندل یک‌ساعته. ساعت‌ها به وقت تهران‌اند",
						report.asOf ? ` · آخرین کندل بسته ${formatWhen(report.asOf)}` : "",
						". حجم ۲۴ساعته ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("bdi", {
							className: "font-num",
							children: formatVol(report.quoteVolume)
						}),
						"."
					]
				})
			] })
		]
	});
}
var FILTERS = [
	{
		id: "picked",
		label: "رونددار"
	},
	{
		id: "A",
		label: "ستاپ A"
	},
	{
		id: "watch",
		label: "در کمین"
	},
	{
		id: "armed",
		label: "هندسه ناقص"
	},
	{
		id: "edge",
		label: "لبه مثبت"
	},
	{
		id: "long",
		label: "خرید"
	},
	{
		id: "short",
		label: "فروش"
	},
	{
		id: "star",
		label: "نشان"
	},
	{
		id: "all",
		label: "هر ۱۰۰"
	}
];
var LOCKS = [
	{
		n: "۰۱",
		title: "روزانه",
		body: "سقف و کف باید روند بسازند و قیمت همان سمت میانگین ۵۰ باشد."
	},
	{
		n: "۰۲",
		title: "چهارساعته",
		body: "اصلاح ۳۸ تا ۶۲ درصد موج قبل، یا سوئیپ سطح و پس‌گرفتن آن."
	},
	{
		n: "۰۳",
		title: "یک‌ساعته",
		body: "فقط کندل بسته: سوئیپ، اینگالف، پین بار، یا شکست اینسایدبار."
	},
	{
		n: "۰۴",
		title: "فضای ۲R",
		body: "تا دو برابر ریسک، مانع چهارساعته نباشد. حد بین ۰٫۳ تا ۱٫۷ ATR."
	}
];
var GRADE_RANK = {
	A: 0,
	armed: 1,
	watch: 2,
	flat: 3
};
function biasColor(bias) {
	if (bias === "bull") return "text-up";
	if (bias === "bear") return "text-down";
	return "text-muted";
}
function BiasMark({ label, bias }) {
	const Icon = bias === "bull" ? ArrowUp : bias === "bear" ? ArrowDown : Minus;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: `inline-flex items-center gap-1 text-xs ${biasColor(bias)}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
			className: "size-3.5",
			"aria-hidden": true
		}), label]
	});
}
function gradeClass(grade) {
	if (grade === "A") return "bg-brass text-bg";
	if (grade === "armed") return "border border-brass text-brass";
	if (grade === "watch") return "border border-line text-fg";
	return "border border-line text-muted";
}
var GRADE_LABEL = {
	A: "ستاپ A",
	armed: "هندسه ناقص",
	watch: "در کمین",
	flat: "زمینه"
};
function Desk() {
	const [rows, setRows] = (0, import_react.useState)([]);
	const [scanning, setScanning] = (0, import_react.useState)(false);
	const [done, setDone] = (0, import_react.useState)(0);
	const [total, setTotal] = (0, import_react.useState)(0);
	const [error, setError] = (0, import_react.useState)(null);
	const [filter, setFilter] = (0, import_react.useState)("all");
	const [sort, setSort] = (0, import_react.useState)("grade");
	const [query, setQuery] = (0, import_react.useState)("");
	const [stars, setStars] = (0, import_react.useState)([]);
	const [selected, setSelected] = (0, import_react.useState)(null);
	const [mobileOpen, setMobileOpen] = (0, import_react.useState)(false);
	const abortRef = (0, import_react.useRef)(null);
	const userChose = (0, import_react.useRef)(false);
	(0, import_react.useEffect)(() => {
		const raw = localStorage.getItem("sakhtar-stars");
		if (!raw) return;
		try {
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed)) setStars(parsed.filter((item) => typeof item === "string"));
		} catch {}
	}, []);
	(0, import_react.useEffect)(() => {
		const ctrl = new AbortController();
		abortRef.current = ctrl;
		runScan(ctrl.signal, false);
		return () => ctrl.abort();
	}, []);
	async function runScan(signal, fresh) {
		setScanning(true);
		setError(null);
		setDone(0);
		try {
			const universe = await fetchUniverse();
			if (signal.aborted) return;
			setRows(universe.map((item) => ({
				...item,
				status: "pending"
			})));
			setTotal(universe.length);
			let cursor = 0;
			async function worker() {
				while (!signal.aborted) {
					const index = cursor++;
					if (index >= universe.length) return;
					const item = universe[index];
					try {
						const bundle = await fetchBundle({ data: {
							symbol: item.symbol,
							fresh
						} });
						if (signal.aborted) return;
						const report = analyzeSymbol({
							symbol: item.symbol,
							last: item.last,
							changePct: item.changePct,
							quoteVolume: item.quoteVolume,
							h1: bundle.h1,
							h4: bundle.h4,
							d1: bundle.d1
						});
						if (signal.aborted) return;
						setRows((prev) => prev.map((row) => row.symbol === item.symbol ? {
							...row,
							...item,
							status: "ready",
							report
						} : row));
					} catch (err) {
						if (signal.aborted) return;
						const message = err instanceof Error ? err.message : "خطا";
						setRows((prev) => prev.map((row) => row.symbol === item.symbol ? {
							...row,
							status: "error",
							error: message
						} : row));
					} finally {
						if (!signal.aborted) setDone((value) => value + 1);
					}
				}
			}
			await Promise.all([
				worker(),
				worker(),
				worker(),
				worker()
			]);
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
		runScan(ctrl.signal, true);
	}
	function toggleStar(symbol) {
		setStars((prev) => {
			const next = prev.includes(symbol) ? prev.filter((item) => item !== symbol) : [...prev, symbol];
			localStorage.setItem("sakhtar-stars", JSON.stringify(next));
			return next;
		});
	}
	const reports = rows.map((row) => row.report).filter((item) => Boolean(item));
	const countA = reports.filter((item) => item.grade === "A").length;
	const countWatch = reports.filter((item) => item.grade === "watch").length;
	const countFlat = reports.filter((item) => item.grade === "flat").length;
	const sampled = reports.filter((item) => item.stats.n >= 5 && item.stats.hitRate != null);
	const avgHit = sampled.length ? sampled.reduce((sum, item) => sum + (item.stats.hitRate ?? 0), 0) / sampled.length : null;
	const bullish = reports.filter((item) => item.daily.bias === "bull").length;
	const bearish = reports.filter((item) => item.daily.bias === "bear").length;
	const breadth = reports.length ? Math.round(bullish / reports.length * 100) : 0;
	const bearBreadth = reports.length ? Math.round(bearish / reports.length * 100) : 0;
	const visible = (0, import_react.useMemo)(() => {
		const q = query.trim().toLowerCase();
		const copy = [...rows.filter((row) => {
			if (q) {
				const name = coinName(row.base).toLowerCase();
				if (!row.base.toLowerCase().includes(q) && !row.symbol.toLowerCase().includes(q) && !name.includes(q)) return false;
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
		})];
		copy.sort((a, b) => {
			if (sort === "volume") return b.quoteVolume - a.quoteVolume;
			if (sort === "change") return Math.abs(b.changePct) - Math.abs(a.changePct);
			if (sort === "wr") {
				const aw = a.report && a.report.stats.n > 0 ? a.report.stats.expectancy ?? -99 : -99;
				return (b.report && b.report.stats.n > 0 ? b.report.stats.expectancy ?? -99 : -99) - aw;
			}
			const ar = a.report ? GRADE_RANK[a.report.grade] : 9;
			const br = b.report ? GRADE_RANK[b.report.grade] : 9;
			if (ar !== br) return ar - br;
			return (b.report?.score ?? 0) - (a.report?.score ?? 0);
		});
		return copy;
	}, [
		rows,
		filter,
		sort,
		query,
		stars
	]);
	(0, import_react.useEffect)(() => {
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
	const progress = total ? Math.min(100, Math.round(done / total * 100)) : 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
				className: "border-b border-line",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:flex-row sm:items-end sm:justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartCandlestick, {
							className: "size-7 text-brass",
							"aria-hidden": true
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "text-3xl font-semibold tracking-tight",
							children: "ساختار"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 max-w-xl text-sm leading-relaxed text-muted",
						children: "میز پرایس‌اکشن برای ۱۰۰ جفت پرمعامله تتر. ستاپ کم صادر می‌شود، چون وین‌ریت از شلوغ معامله کردن نمی‌آید."
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: rescan,
						className: "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brass px-4 text-sm font-medium text-bg",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: `size-4 ${scanning ? "animate-spin" : ""}` }), scanning ? "در حال خواندن بازار" : "اسکن تازه"]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
						className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
						children: LOCKS.map((lock) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "border border-line bg-surface px-3 py-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-num text-xs text-brass",
									children: lock.n
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "mt-1 text-sm font-medium",
									children: lock.title
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 text-xs leading-relaxed text-muted",
									children: lock.body
								})
							]
						}, lock.n))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "grid gap-3 border border-line bg-surface px-3 py-3 sm:grid-cols-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "ستاپ A",
								value: String(countA)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "در کمین",
								value: String(countWatch)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "فقط زمینه یا رنج",
								value: String(countFlat)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "میانگین ۲R، نمونه ≥۵",
								value: avgHit == null ? "—" : formatHit(avgHit)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "sm:col-span-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mb-1 flex justify-between text-xs text-muted",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "عرضه روزانه خوانده‌شده" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("bdi", {
										className: "font-num",
										children: [
											bullish,
											" صعودی · ",
											bearish,
											" نزولی"
										]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex h-2 overflow-hidden bg-surface-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "bg-up",
										style: { width: `${breadth}%` }
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "bg-down",
										style: { width: `${bearBreadth}%` }
									})]
								})]
							})
						]
					}),
					scanning ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-1 flex justify-between text-xs text-muted",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "خواندن کندل روزانه، چهارساعته و یک‌ساعته" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("bdi", {
							className: "font-num",
							children: [
								done,
								"/",
								total || "…"
							]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-1 bg-surface-2",
						role: "progressbar",
						"aria-valuenow": progress,
						"aria-valuemin": 0,
						"aria-valuemax": 100,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-full bg-brass",
							style: { width: `${progress}%` }
						})
					})] }) : null,
					error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "border border-line bg-down-soft px-3 py-3 text-sm text-down",
						children: error
					}) : null,
					!scanning && rows.length > 0 && countA === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm leading-relaxed text-muted",
						children: "الان ستاپ A نیست. فیلتر فقط وقتی هر چهار قفل با هم بسته باشند برگه می‌دهد؛ در بازار رنج یا دور از منطقه ارزش، سکوت عمدی است."
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap gap-2",
							children: FILTERS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setFilter(item.id),
								className: filter === item.id ? "min-h-11 rounded-md bg-brass px-3 text-sm text-bg" : "min-h-11 rounded-md border border-line px-3 text-sm text-fg",
								children: item.label
							}, item.id))
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col gap-2 sm:flex-row",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "relative block min-w-0 sm:w-56",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "sr-only",
										children: "جستجوی نماد"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: query,
										onChange: (event) => setQuery(event.target.value),
										placeholder: "BTC یا بیت‌کوین",
										className: "min-h-11 w-full rounded-md border border-line bg-surface ps-10 pe-3 text-sm text-fg"
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-wrap gap-2",
								children: [
									["grade", "اولویت"],
									["wr", "انتظار R"],
									["volume", "حجم"],
									["change", "نوسان ۲۴س"]
								].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setSort(id),
									className: sort === id ? "min-h-11 rounded-md bg-surface-2 px-3 text-sm text-fg" : "min-h-11 rounded-md px-3 text-sm text-muted",
									children: label
								}, id))
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid items-start gap-4 lg:grid-cols-5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
							className: "min-w-0 border border-line lg:col-span-3",
							children: visible.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "px-4 py-8 text-sm text-muted",
								children: scanning ? "هنوز نمادی برای این فیلتر آماده نشده." : "با این فیلتر چیزی نیست. «هر ۱۰۰» همه زمینه‌ها را نشان می‌دهد."
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: visible.map((row) => {
								const report = row.report;
								const active = row.symbol === selected;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
									className: active ? "bg-surface-2" : "bg-bg",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex border-b border-line",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											"aria-label": stars.includes(row.symbol) ? "برداشتن نشان" : "نشان کردن",
											"aria-pressed": stars.includes(row.symbol),
											onClick: () => toggleStar(row.symbol),
											className: "inline-flex w-11 shrink-0 items-center justify-center text-brass",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, {
												className: "size-4",
												fill: stars.includes(row.symbol) ? "currentColor" : "none"
											})
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => {
												userChose.current = true;
												setSelected(row.symbol);
												setMobileOpen(true);
											},
											className: "flex min-w-0 flex-1 flex-col gap-2 py-3 pe-3 text-start",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-start justify-between gap-3",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "min-w-0",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex flex-wrap items-baseline gap-2",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("bdi", {
															className: "font-num text-base font-semibold",
															children: row.base
														}), coinName(row.base) !== row.base ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "truncate text-sm text-muted",
															children: coinName(row.base)
														}) : null]
													}), report ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "mt-1 flex flex-wrap items-center gap-2",
														children: [
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: `rounded-md px-2 py-0.5 text-xs ${gradeClass(report.grade)}`,
																children: GRADE_LABEL[report.grade]
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("bdi", {
																className: "font-num text-xs text-muted",
																children: report.score
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																className: "text-xs text-muted",
																children: [
																	report.checked.pass,
																	" از ",
																	report.checked.total
																]
															}),
															report.stats.n > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("bdi", {
																className: `font-num text-xs ${(report.stats.expectancy ?? 0) > 0 ? "text-up" : "text-down"}`,
																children: [
																	formatHit(report.stats.hitRate),
																	" · ",
																	formatR(report.stats.expectancy),
																	" · n",
																	report.stats.n
																]
															}) : null,
															report.grade === "A" && weakEdge(report.stats) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "text-xs text-down",
																children: "لبه اخیر منفی"
															}) : null
														]
													}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
														className: "mt-1 text-xs text-muted",
														children: row.status === "error" ? row.error || "داده نیامد" : "در صف کندل‌ها"
													})]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "text-end",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
															className: "font-num text-sm",
															children: formatPx(row.last)
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
															className: `font-num text-xs ${row.changePct >= 0 ? "text-up" : "text-down"}`,
															children: formatPct(row.changePct)
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
															className: "font-num text-xs text-muted",
															children: formatVol(row.quoteVolume)
														})
													]
												})]
											}), report ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex flex-wrap gap-3",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BiasMark, {
														label: "روز",
														bias: report.daily.bias
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BiasMark, {
														label: "۴س",
														bias: report.h4.bias
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BiasMark, {
														label: "۱س",
														bias: report.h1.bias
													}),
													report.pullback != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("bdi", {
														className: "font-num text-xs text-muted",
														children: [
															"اصلاح ",
															Math.round(report.pullback * 100),
															"%"
														]
													}) : null
												]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "line-clamp-2 text-sm leading-relaxed text-fg",
												children: report.headline
											})] }) : null]
										})]
									})
								}, row.symbol);
							}) })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
							className: "hidden min-w-0 border border-line lg:col-span-2 lg:sticky lg:top-4 lg:block lg:max-h-screen lg:overflow-y-auto",
							children: selectedRow?.report ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SetupPanel, { report: selectedRow.report }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "px-4 py-8 text-sm leading-relaxed text-muted",
								children: "با آماده شدن اولین نماد، خوانش این‌جا می‌نشیند. رنج روزانه عمداً ستاپ نمی‌گیرد."
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
						className: "border border-line bg-surface px-3 py-3 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
							className: "cursor-pointer text-sm font-medium",
							children: "چرا تعداد سیگنال کم است"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 space-y-2 text-sm leading-relaxed text-muted",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "وین‌ریت بالا از پیش‌بینی همیشگی بازار نمی‌آید. از این می‌آید که بیشتر وقت‌ها هیچ کاری نکنی. چهار قفل باید با هم بسته باشند وگرنه برگه ورود صادر نمی‌شود." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "نرخ روی کارت، درصد دفعاتی است که قیمت در آزمون اخیر به هدف ۲R رسیده، نه یک عدد تبلیغاتی. سیستم ۲R از حدود ۳۵ درصد به بالا، اگر باخت‌ها نزدیک ۱R بمانند، انتظار مثبت دارد. برای همین هم «درصد برد» را تنها نمی‌گذاریم و انتظار R را کنارش می‌آوریم." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "اگر نمونه یک نماد از ۸ معامله گذشته و انتظارش منفی است، حتی ستاپ A را با برچسب لبه منفی نشان می‌دهیم. این میز توصیه خرید و فروش نیست." })
							]
						})]
					})
				]
			}),
			mobileOpen && selectedRow?.report ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-0 z-30 overflow-y-auto bg-bg lg:hidden",
				role: "dialog",
				"aria-modal": "true",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SetupPanel, {
					report: selectedRow.report,
					onClose: () => setMobileOpen(false)
				})
			}) : null
		]
	});
}
function Stat({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "text-xs text-muted",
		children: label
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-1 font-num text-xl",
		children: value
	})] });
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Desk, {});
}
//#endregion
export { Home as component };
