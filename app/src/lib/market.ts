// 종목 정의와 시세 모델. 바이낸스 USDⓈ-M 주식 선물이 있는 종목은 실시간 시세를 쓰고,
// 연결이 안 되면 같은 모양의 모의 시세로 대신한다.
export type Stock = {
  id: string;
  name: string;
  /** 바이낸스 USDⓈ-M 선물 심볼. 없으면 모의 시세만 */
  binance?: string;
  /** 모의 시세 기준값 (원) */
  mockPrice: number;
  mockPrevClose: number;
  logo: { bg: string; fg: string; text: string };
};

export const STOCKS: Stock[] = [
  {
    id: 'hynix',
    name: 'SK하이닉스',
    binance: 'SKHYNIXUSDT',
    mockPrice: 1184000,
    mockPrevClose: 1162000,
    logo: { bg: '#EA002C', fg: '#fff', text: 'SK' },
  },
  {
    id: 'samsung',
    name: '삼성전자',
    binance: 'SAMSUNGUSDT',
    mockPrice: 110700,
    mockPrevClose: 108900,
    logo: { bg: '#1428A0', fg: '#fff', text: 'S' },
  },
  {
    id: 'hyundai',
    name: '현대차',
    binance: 'HYUNDAIUSDT',
    mockPrice: 238000,
    mockPrevClose: 241500,
    logo: { bg: '#002C5F', fg: '#fff', text: 'H' },
  },
  {
    id: 'kakao',
    name: '카카오',
    mockPrice: 31750,
    mockPrevClose: 31000,
    logo: { bg: '#FEE500', fg: '#3C1E1E', text: 'kakao' },
  },
];

export const stockById = (id: string) => STOCKS.find((s) => s.id === id) ?? STOCKS[0];

export const CASH = 10_000_000;

export type BookRow = { price: number; volume: number };
export type Tick = { price: number; qty: number; up: boolean };

export type Market = {
  stock: Stock;
  /** 바이낸스 실시간 시세를 받고 있는지 */
  live: boolean;
  price: number;
  prevClose: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  /** 매도 호가, 가격 내림차순 10개 (마지막이 매도 1호가) */
  asks: BookRow[];
  /** 매수 호가, 가격 내림차순 10개 (처음이 매수 1호가) */
  bids: BookRow[];
  ticks: Tick[];
  strength: number;
};

/** 한국거래소 호가 단위 */
export function krxTick(p: number) {
  if (p < 2000) return 1;
  if (p < 5000) return 5;
  if (p < 20000) return 10;
  if (p < 50000) return 50;
  if (p < 200000) return 100;
  if (p < 500000) return 500;
  return 1000;
}
export const snap = (p: number) => {
  const t = krxTick(p);
  return Math.max(t, Math.round(p / t) * t);
};
export const bestAsk = (m: Market) => m.asks[m.asks.length - 1]?.price ?? m.price;
export const bestBid = (m: Market) => m.bids[0]?.price ?? m.price;

export const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR');
export const pctOf = (price: number, prev: number) => ((price - prev) / prev) * 100;
export const fmtPct = (p: number) => `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`;
