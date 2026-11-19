import { useEffect, useState } from 'react';
import { type Candle, type Interval, makeCandles } from './candles';
import { type Stock, snap } from './market';
import { getKlines, subscribe } from './binance';
import { loadUsdKrw } from './fx';

const BINANCE_INTERVAL: Record<Interval, string> = {
  '1분': '1m',
  '3분': '3m',
  '5분': '5m',
  '15분': '15m',
  '30분': '30m',
  '60분': '1h',
  일: '1d',
  주: '1w',
  월: '1M',
  년: '1M',
};
const KST = 9 * 3600;

function toYears(c: Candle[]): Candle[] {
  const m = new Map<number, Candle>();
  for (const k of c) {
    const y = new Date(k.time * 1000).getUTCFullYear();
    const key = Date.UTC(y, 0, 1) / 1000;
    const cur = m.get(key);
    m.set(
      key,
      cur
        ? { ...cur, high: Math.max(cur.high, k.high), low: Math.min(cur.low, k.low), close: k.close, volume: cur.volume + k.volume }
        : { ...k, time: key },
    );
  }
  return [...m.values()];
}

/** 차트 캔들. 바이낸스 심볼이 있으면 실제 봉(원화 환산), 없거나 연결이 안 되면 모의 봉 */
export function useCandles(stock: Stock, interval: Interval) {
  const [candles, setCandles] = useState<Candle[]>(() =>
    makeCandles({ id: stock.id, last: stock.mockPrice, vol: 0.018 }, interval),
  );
  useEffect(() => {
    let alive = true;
    let stop = () => {};
    const mock = () => setCandles(makeCandles({ id: stock.id, last: stock.mockPrice, vol: 0.018 }, interval));
    if (!stock.binance) {
      mock();
      return;
    }
    const sym = stock.binance;
    const bi = BINANCE_INTERVAL[interval];
    (async () => {
      try {
        const fx = await loadUsdKrw();
        const rows = await getKlines(sym, bi);
        if (!alive) return;
        const conv = (t: number, o: string, h: string, l: string, c: string, v: string): Candle => ({
          time: Math.floor(t / 1000) + KST,
          open: snap(Number(o) * fx),
          high: snap(Number(h) * fx),
          low: snap(Number(l) * fx),
          close: snap(Number(c) * fx),
          volume: Math.round(Number(v)),
        });
        let list = rows.map((r) => conv(r[0], r[1], r[2], r[3], r[4], r[5]));
        if (interval === '년') list = toYears(list);
        setCandles(list);
        if (interval === '년') return;
        stop = subscribe([`${sym.toLowerCase()}@kline_${bi}`], (_s, data) => {
          const k = (data as { k: { t: number; o: string; h: string; l: string; c: string; v: string } }).k;
          const c = conv(k.t, k.o, k.h, k.l, k.c, k.v);
          setCandles((prev) => {
            if (!prev.length) return [c];
            const last = prev[prev.length - 1];
            if (c.time === last.time) return [...prev.slice(0, -1), c];
            if (c.time > last.time) return [...prev, c];
            return prev;
          });
        });
      } catch {
        if (alive) mock();
      }
    })();
    return () => {
      alive = false;
      stop();
    };
  }, [stock, interval]);
  return candles;
}
