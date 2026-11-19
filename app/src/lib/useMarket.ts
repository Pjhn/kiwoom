import { useEffect, useRef, useState } from 'react';
import { type BookRow, type Market, type Stock, type Tick, krxTick, snap } from './market';
import { type AggTrade, type Depth, getDepth, getTicker, getTrades, subscribe } from './binance';
import { loadUsdKrw, usdKrw } from './fx';

const LEVELS = 10;

function rand(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 원화 호가 단위로 묶은 10단계 호가 */
function ladder(price: number, vol: (p: number, side: 'ask' | 'bid', i: number) => number) {
  const t = krxTick(price);
  const asks: BookRow[] = [];
  for (let i = LEVELS - 1; i >= 0; i--) {
    const p = price + i * t;
    asks.push({ price: p, volume: vol(p, 'ask', i) });
  }
  const bids: BookRow[] = [];
  for (let i = 1; i <= LEVELS; i++) {
    const p = price - i * t;
    bids.push({ price: p, volume: vol(p, 'bid', i) });
  }
  return { asks, bids };
}

function strengthOf(ticks: Tick[]) {
  const up = ticks.filter((t) => t.up).reduce((s, t) => s + t.qty, 0);
  const down = ticks.filter((t) => !t.up).reduce((s, t) => s + t.qty, 0);
  return down === 0 ? 100 : (up / down) * 100;
}

function mockMarket(stock: Stock): Market {
  const r = rand(stock.mockPrice);
  const price = stock.mockPrice;
  const { asks, bids } = ladder(price, () => Math.round(5 + r() * r() * 3000));
  const ticks: Tick[] = Array.from({ length: 8 }, () => ({
    price: r() > 0.5 ? price : price - krxTick(price),
    qty: Math.max(1, Math.round(r() * r() * 150)),
    up: r() > 0.42,
  }));
  return {
    stock,
    live: false,
    price,
    prevClose: stock.mockPrevClose,
    open: snap(stock.mockPrevClose * 1.002),
    high: snap(Math.max(price, stock.mockPrevClose) * 1.006),
    low: snap(Math.min(price, stock.mockPrevClose) * 0.99),
    volume: Math.round(1_102_100 * (31750 / price) ** 0.5),
    asks,
    bids,
    ticks,
    strength: strengthOf(ticks),
  };
}

/** 모의 시세를 조금씩 움직여 실제 장처럼 보이게 한다 */
function stepMock(m: Market): Market {
  const r = Math.random;
  let price = m.price;
  if (r() < 0.25) price = snap(price + (r() < 0.5 ? -1 : 1) * krxTick(price));
  const up = r() > 0.45;
  const tick: Tick = { price: up ? price : price - krxTick(price), qty: Math.max(1, Math.round(r() * r() * 120)), up };
  const jitter = (v: number) => Math.max(1, Math.round(v * (0.85 + r() * 0.3)));
  const prevVol = new Map([...m.asks, ...m.bids].map((b) => [b.price, b.volume]));
  const { asks, bids } = ladder(price, (p) => jitter(prevVol.get(p) ?? 5 + r() * r() * 3000));
  const ticks = [tick, ...m.ticks].slice(0, 30);
  return {
    ...m,
    price,
    high: Math.max(m.high, price),
    low: Math.min(m.low, price),
    volume: m.volume + tick.qty,
    asks,
    bids,
    ticks,
    strength: strengthOf(ticks),
  };
}

/** 바이낸스 호가(USDT)를 원화 호가 단위로 묶는다 */
function bookFromDepth(d: Depth, fx: number, last: number) {
  const agg = (rows: [string, string][]) => {
    const m = new Map<number, number>();
    for (const [p, q] of rows) {
      const k = snap(Number(p) * fx);
      m.set(k, (m.get(k) ?? 0) + Number(q));
    }
    return m;
  };
  const a = agg(d.asks);
  const b = agg(d.bids);
  let askPrices = [...a.keys()].sort((x, y) => x - y);
  let bidPrices = [...b.keys()].sort((x, y) => y - x);
  // 반올림으로 겹친 단계는 매수 쪽에서 뺀다
  const minAsk = askPrices[0] ?? last;
  bidPrices = bidPrices.filter((p) => p < minAsk);
  // 10단계가 안 되면 호가 단위로 채운다
  while (askPrices.length < LEVELS) {
    const top = askPrices[askPrices.length - 1] ?? last;
    askPrices.push(top + krxTick(top));
  }
  while (bidPrices.length < LEVELS) {
    const bottom = bidPrices[bidPrices.length - 1] ?? minAsk;
    bidPrices.push(bottom - krxTick(bottom - 1));
  }
  askPrices = askPrices.slice(0, LEVELS).reverse();
  bidPrices = bidPrices.slice(0, LEVELS);
  return {
    asks: askPrices.map((p) => ({ price: p, volume: Math.round(a.get(p) ?? 0) })),
    bids: bidPrices.map((p) => ({ price: p, volume: Math.round(b.get(p) ?? 0) })),
  };
}

const toTick = (t: AggTrade, fx: number): Tick => ({
  price: snap(Number(t.p) * fx),
  qty: Math.max(1, Math.round(Number(t.q))),
  up: !t.m, // 매수자가 메이커가 아니면 매수 체결
});

/**
 * 종목 시세. 바이낸스 심볼이 있으면 실시간으로 받고, 연결이 안 되면 모의 시세로 바꾼다.
 */
export function useMarket(stock: Stock): Market {
  const [market, setMarket] = useState<Market>(() => mockMarket(stock));
  const ref = useRef(market);
  ref.current = market;

  useEffect(() => {
    let alive = true;
    let stopWs = () => {};
    let poll: ReturnType<typeof setInterval> | undefined;
    let mock: ReturnType<typeof setInterval> | undefined;
    setMarket(mockMarket(stock));

    const startMock = () => {
      mock = setInterval(() => alive && setMarket((m) => stepMock(m)), 1200);
    };

    if (!stock.binance) {
      startMock();
    } else {
      const sym = stock.binance;
      (async () => {
        try {
          const fx = await loadUsdKrw();
          const [depth, tk, trades] = await Promise.all([getDepth(sym), getTicker(sym), getTrades(sym)]);
          if (!alive) return;
          const last = snap(Number(tk.lastPrice) * fx);
          const ticks = trades.reverse().slice(0, 30).map((t) => toTick(t, fx));
          setMarket({
            stock,
            live: true,
            price: last,
            prevClose: snap(Number(tk.openPrice) * fx),
            open: snap(Number(tk.openPrice) * fx),
            high: snap(Number(tk.highPrice) * fx),
            low: snap(Number(tk.lowPrice) * fx),
            volume: Math.round(Number(tk.volume)),
            ...bookFromDepth(depth, fx, last),
            ticks,
            strength: strengthOf(ticks),
          });
          poll = setInterval(async () => {
            try {
              const d = await getDepth(sym);
              if (alive) setMarket((m) => ({ ...m, ...bookFromDepth(d, usdKrw(), m.price) }));
            } catch {
              /* 다음 차례에 다시 */
            }
          }, 2000);
          const low = sym.toLowerCase();
          stopWs = subscribe([`${low}@aggTrade`, `${low}@ticker`], (stream, data) => {
            if (!alive) return;
            const fx2 = usdKrw();
            if (stream.endsWith('@aggTrade')) {
              const t = toTick(data as AggTrade, fx2);
              setMarket((m) => {
                const ticks2 = [t, ...m.ticks].slice(0, 30);
                return {
                  ...m,
                  price: t.price,
                  high: Math.max(m.high, t.price),
                  low: Math.min(m.low, t.price),
                  ticks: ticks2,
                  strength: strengthOf(ticks2),
                };
              });
            } else {
              const d = data as { c: string; o: string; h: string; l: string; v: string };
              setMarket((m) => ({
                ...m,
                price: snap(Number(d.c) * fx2),
                prevClose: snap(Number(d.o) * fx2),
                open: snap(Number(d.o) * fx2),
                high: snap(Number(d.h) * fx2),
                low: snap(Number(d.l) * fx2),
                volume: Math.round(Number(d.v)),
              }));
            }
          });
        } catch {
          if (alive) startMock();
        }
      })();
    }
    return () => {
      alive = false;
      stopWs();
      clearInterval(poll);
      clearInterval(mock);
    };
  }, [stock]);

  return market;
}
