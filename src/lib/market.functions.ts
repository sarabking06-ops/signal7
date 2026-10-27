import { createServerFn } from "@tanstack/react-start";
import type { Candle } from "@/lib/pa/engine";

const HOST = "https://data-api.binance.vision";

const STABLES = new Set([
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
  "USD0",
]);

export type UniverseItem = {
  symbol: string;
  base: string;
  last: number;
  changePct: number;
  quoteVolume: number;
};

type Bundle = { h1: Candle[]; h4: Candle[]; d1: Candle[] };
type CacheEntry = { exp: number; value: unknown };
const mem = new Map<string, CacheEntry>();

function recall<T>(key: string): T | null {
  const hit = mem.get(key);
  if (!hit || hit.exp < Date.now()) return null;
  return hit.value as T;
}

function remember<T>(key: string, ttlMs: number, value: T): T {
  mem.set(key, { exp: Date.now() + ttlMs, value });
  return value;
}

function leveraged(base: string): boolean {
  if (/(DOWN|BULL|BEAR)$/.test(base) && base.length >= 6) return true;
  if (/UP$/.test(base) && base.length >= 5) return true;
  return false;
}

async function getJson(url: string, attempt = 0): Promise<unknown> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { accept: "application/json" },
  });
  if ((res.status === 429 || res.status === 418 || res.status >= 500) && attempt < 2) {
    await new Promise((resolve) => setTimeout(resolve, 450 * (attempt + 1)));
    return getJson(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`بازار پاسخ نداد (${res.status})`);
  return res.json();
}

function parseKlines(json: unknown): Candle[] {
  if (!Array.isArray(json)) throw new Error("داده کندل نامعتبر است");
  return json.map((item) => {
    const row = item as unknown[];
    return {
      t: Number(row[0]),
      o: Number(row[1]),
      h: Number(row[2]),
      l: Number(row[3]),
      c: Number(row[4]),
      v: Number(row[5]),
    };
  });
}

export const fetchUniverse = createServerFn({ method: "GET" }).handler(async () => {
  const cached = recall<UniverseItem[]>("universe");
  if (cached) return cached;
  const json = await getJson(`${HOST}/api/v3/ticker/24hr`);
  if (!Array.isArray(json)) throw new Error("فهرست بازار نامعتبر است");
  const rows: UniverseItem[] = [];
  for (const raw of json) {
    const ticker = raw as {
      symbol?: string;
      lastPrice?: string;
      priceChangePercent?: string;
      quoteVolume?: string;
    };
    if (!ticker.symbol?.endsWith("USDT")) continue;
    const base = ticker.symbol.slice(0, -4);
    if (base.length < 2 || STABLES.has(base) || leveraged(base)) continue;
    const last = Number(ticker.lastPrice);
    const quoteVolume = Number(ticker.quoteVolume);
    const changePct = Number(ticker.priceChangePercent);
    if (!(last > 0) || !(quoteVolume > 0) || !Number.isFinite(changePct)) continue;
    rows.push({ symbol: ticker.symbol, base, last, changePct, quoteVolume });
  }
  rows.sort((a, b) => b.quoteVolume - a.quoteVolume);
  return remember("universe", 45_000, rows.slice(0, 100));
});

export const fetchBundle = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (!data || typeof data !== "object") throw new Error("درخواست نامعتبر");
    const symbol = (data as { symbol?: unknown }).symbol;
    const fresh = Boolean((data as { fresh?: unknown }).fresh);
    if (typeof symbol !== "string" || !/^[A-Z0-9]{2,20}USDT$/.test(symbol)) {
      throw new Error("نماد نامعتبر");
    }
    return { symbol, fresh };
  })
  .handler(async ({ data }) => {
    const key = `k:${data.symbol}`;
    if (!data.fresh) {
      const cached = recall<Bundle>(key);
      if (cached) return cached;
    }
    const [h1, h4, d1] = await Promise.all([
      getJson(`${HOST}/api/v3/klines?symbol=${data.symbol}&interval=1h&limit=640`).then(parseKlines),
      getJson(`${HOST}/api/v3/klines?symbol=${data.symbol}&interval=4h&limit=300`).then(parseKlines),
      getJson(`${HOST}/api/v3/klines?symbol=${data.symbol}&interval=1d&limit=240`).then(parseKlines),
    ]);
    return remember(key, 90_000, { h1, h4, d1 });
  });
