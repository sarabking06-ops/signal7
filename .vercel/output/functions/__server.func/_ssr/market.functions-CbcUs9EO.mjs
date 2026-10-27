import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/market.functions-CbcUs9EO.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var HOST = "https://data-api.binance.vision";
var STABLES = /* @__PURE__ */ new Set([
	"USDC",
	"FDUSD",
	"TUSD",
	"DAI",
	"USDP",
	"USDE",
	"USD1",
	"EUR",
	"AEUR",
	"EURI",
	"XUSD",
	"USDD",
	"PYUSD",
	"USTC",
	"USDS",
	"BFUSD",
	"GUSD",
	"FRAX",
	"LUSD",
	"USDY",
	"RLUSD",
	"USDG",
	"USD0"
]);
var mem = /* @__PURE__ */ new Map();
function recall(key) {
	const hit = mem.get(key);
	if (!hit || hit.exp < Date.now()) return null;
	return hit.value;
}
function remember(key, ttlMs, value) {
	mem.set(key, {
		exp: Date.now() + ttlMs,
		value
	});
	return value;
}
function leveraged(base) {
	if (/(DOWN|BULL|BEAR)$/.test(base) && base.length >= 6) return true;
	if (/UP$/.test(base) && base.length >= 5) return true;
	return false;
}
async function getJson(url, attempt = 0) {
	const res = await fetch(url, {
		signal: AbortSignal.timeout(15e3),
		headers: { accept: "application/json" }
	});
	if ((res.status === 429 || res.status === 418 || res.status >= 500) && attempt < 2) {
		await new Promise((resolve) => setTimeout(resolve, 450 * (attempt + 1)));
		return getJson(url, attempt + 1);
	}
	if (!res.ok) throw new Error(`بازار پاسخ نداد (${res.status})`);
	return res.json();
}
function parseKlines(json) {
	if (!Array.isArray(json)) throw new Error("داده کندل نامعتبر است");
	return json.map((item) => {
		const row = item;
		return {
			t: Number(row[0]),
			o: Number(row[1]),
			h: Number(row[2]),
			l: Number(row[3]),
			c: Number(row[4]),
			v: Number(row[5])
		};
	});
}
var fetchUniverse_createServerFn_handler = createServerRpc({
	id: "15891fbdf9919dfba88ffddd30091692986afccfd35e3fce811aaa4a6caa50af",
	name: "fetchUniverse",
	filename: "src/lib/market.functions.ts"
}, (opts) => fetchUniverse.__executeServer(opts));
var fetchUniverse = createServerFn({ method: "GET" }).handler(fetchUniverse_createServerFn_handler, async () => {
	const cached = recall("universe");
	if (cached) return cached;
	const json = await getJson(`${HOST}/api/v3/ticker/24hr`);
	if (!Array.isArray(json)) throw new Error("فهرست بازار نامعتبر است");
	const rows = [];
	for (const raw of json) {
		const ticker = raw;
		if (!ticker.symbol?.endsWith("USDT")) continue;
		const base = ticker.symbol.slice(0, -4);
		if (base.length < 2 || STABLES.has(base) || leveraged(base)) continue;
		const last = Number(ticker.lastPrice);
		const quoteVolume = Number(ticker.quoteVolume);
		const changePct = Number(ticker.priceChangePercent);
		if (!(last > 0) || !(quoteVolume > 0) || !Number.isFinite(changePct)) continue;
		rows.push({
			symbol: ticker.symbol,
			base,
			last,
			changePct,
			quoteVolume
		});
	}
	rows.sort((a, b) => b.quoteVolume - a.quoteVolume);
	return remember("universe", 45e3, rows.slice(0, 100));
});
var fetchBundle_createServerFn_handler = createServerRpc({
	id: "52d2da25caa5e1097e197e57783f58259c00b4ea91cb433ea33bdee9e3bc0eef",
	name: "fetchBundle",
	filename: "src/lib/market.functions.ts"
}, (opts) => fetchBundle.__executeServer(opts));
var fetchBundle = createServerFn({ method: "POST" }).validator((data) => {
	if (!data || typeof data !== "object") throw new Error("درخواست نامعتبر");
	const symbol = data.symbol;
	const fresh = Boolean(data.fresh);
	if (typeof symbol !== "string" || !/^[A-Z0-9]{2,20}USDT$/.test(symbol)) throw new Error("نماد نامعتبر");
	return {
		symbol,
		fresh
	};
}).handler(fetchBundle_createServerFn_handler, async ({ data }) => {
	const key = `k:${data.symbol}`;
	if (!data.fresh) {
		const cached = recall(key);
		if (cached) return cached;
	}
	const [h1, h4, d1] = await Promise.all([
		getJson(`${HOST}/api/v3/klines?symbol=${data.symbol}&interval=1h&limit=640`).then(parseKlines),
		getJson(`${HOST}/api/v3/klines?symbol=${data.symbol}&interval=4h&limit=300`).then(parseKlines),
		getJson(`${HOST}/api/v3/klines?symbol=${data.symbol}&interval=1d&limit=240`).then(parseKlines)
	]);
	return remember(key, 9e4, {
		h1,
		h4,
		d1
	});
});
//#endregion
export { fetchBundle_createServerFn_handler, fetchUniverse_createServerFn_handler };
