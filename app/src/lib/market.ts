// 목업 시세 데이터 (카카오)
export const STOCK = { name: '카카오', code: '035720' };
export const PREV_CLOSE = 31000;
export const CURRENT_PRICE = 31750;
export const TICK = 50;
export const CASH = 1_000_000;

export type BookRow = { price: number; volume: number };

// 매도 호가 (위에서 아래로 가격 내림차순)
export const ASKS: BookRow[] = [
  { price: 32000, volume: 4 },
  { price: 31950, volume: 3 },
  { price: 31900, volume: 16 },
  { price: 31850, volume: 15 },
  { price: 31800, volume: 6 },
  { price: 31750, volume: 9 },
];

// 매수 호가 (위에서 아래로 가격 내림차순)
export const BIDS: BookRow[] = [
  { price: 31700, volume: 15 },
  { price: 31650, volume: 136 },
  { price: 31600, volume: 7_178 },
  { price: 31550, volume: 1_023 },
  { price: 31500, volume: 122 },
  { price: 31450, volume: 280 },
];

export const TICKS = [
  { price: 31750, qty: 12, up: true },
  { price: 31750, qty: 1, up: true },
  { price: 31750, qty: 6, up: true },
  { price: 31700, qty: 121, up: true },
  { price: 31700, qty: 6, up: false },
  { price: 31700, qty: 1, up: true },
  { price: 31700, qty: 1, up: true },
  { price: 31650, qty: 1, up: false },
];

export const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR');
export const pctOf = (price: number) => ((price - PREV_CLOSE) / PREV_CLOSE) * 100;
export const fmtPct = (p: number) => `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`;
