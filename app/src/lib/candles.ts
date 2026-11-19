import { snap } from './market';
// 목업 캔들 데이터: 종목과 봉 주기마다 같은 결과가 나오도록 시드 고정 난수로 만든다
export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };

export type ChartSymbol = { id: string; last: number; vol: number };

export type Interval = '1분' | '3분' | '5분' | '15분' | '30분' | '60분' | '일' | '주' | '월' | '년';
export const STEP: Record<Interval, number> = {
  '1분': 60,
  '3분': 180,
  '5분': 300,
  '15분': 900,
  '30분': 1800,
  '60분': 3600,
  일: 86400,
  주: 86400 * 7,
  월: 86400 * 30,
  년: 86400 * 365,
};
const COUNT: Record<Interval, number> = { '1분': 240, '3분': 240, '5분': 240, '15분': 240, '30분': 240, '60분': 240, 일: 240, 주: 200, 월: 120, 년: 30 };

function rng(seedText: string) {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i++) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const KST = 9 * 3600;

export function makeCandles(sym: ChartSymbol, interval: Interval, now = Date.now()): Candle[] {
  const r = rng(sym.id + interval);
  const step = STEP[interval];
  const n = COUNT[interval];
  const scale = Math.sqrt(step / 86400);
  const vol = Math.min(0.2, sym.vol * Math.max(scale, 0.12));
  // 마지막 종가에서 거꾸로 걸어가며 만든다
  const closes: number[] = [sym.last];
  for (let i = 1; i < n; i++) {
    const drift = Math.sin(i / 23) * vol * 0.12;
    const prev = closes[i - 1];
    closes.push(prev * (1 - drift - (r() - 0.5) * 2 * vol));
  }
  closes.reverse();
  const end = Math.floor(now / 1000 / step) * step;
  const out: Candle[] = [];
  for (let i = 0; i < n; i++) {
    const close = snap(closes[i]);
    const open = snap(i === 0 ? closes[0] * (1 + (r() - 0.5) * vol) : closes[i - 1] * (1 + (r() - 0.5) * vol * 0.3));
    const high = snap(Math.max(open, close) * (1 + r() * vol * 0.6));
    const low = snap(Math.min(open, close) * (1 - r() * vol * 0.6));
    const volume = Math.round((0.4 + r() * r() * 2.4) * 80000 * Math.sqrt(step / 86400) * (31750 / sym.last) ** 0.5);
    out.push({ time: end - (n - 1 - i) * step + KST, open, high, low, close, volume });
  }
  out[n - 1].close = sym.last;
  out[n - 1].high = Math.max(out[n - 1].high, sym.last);
  out[n - 1].low = Math.min(out[n - 1].low, sym.last);
  return out;
}

export function movingAverage(c: Candle[], len = 20) {
  const res: { time: number; value: number }[] = [];
  let sum = 0;
  for (let i = 0; i < c.length; i++) {
    sum += c[i].close;
    if (i >= len) sum -= c[i - len].close;
    if (i >= len - 1) res.push({ time: c[i].time, value: sum / len });
  }
  return res;
}
