// 바이낸스 USDⓈ-M 선물 공개 시세 API (API 키 없이 쓰는 읽기 전용)
export const FAPI = 'https://fapi.binance.com';
export const FSTREAM = 'wss://fstream.binance.com/stream';

const get = async <T,>(path: string): Promise<T> => {
  const r = await fetch(FAPI + path, { signal: AbortSignal.timeout(5000) });
  if (!r.ok) throw new Error(`binance ${r.status}`);
  return r.json() as Promise<T>;
};

export type Depth = { bids: [string, string][]; asks: [string, string][] };
export type Ticker24 = { lastPrice: string; openPrice: string; highPrice: string; lowPrice: string; volume: string };
export type AggTrade = { p: string; q: string; m: boolean; T: number };
export type Kline = [number, string, string, string, string, string, ...unknown[]];

export const getDepth = (s: string) => get<Depth>(`/fapi/v1/depth?symbol=${s}&limit=500`);
export const getTicker = (s: string) => get<Ticker24>(`/fapi/v1/ticker/24hr?symbol=${s}`);
export const getTrades = (s: string) => get<AggTrade[]>(`/fapi/v1/aggTrades?symbol=${s}&limit=30`);
export const getKlines = (s: string, interval: string, limit = 500) =>
  get<Kline[]>(`/fapi/v1/klines?symbol=${s}&interval=${interval}&limit=${limit}`);

/** 여러 스트림을 한 연결로 받는다. 끊기면 다시 붙는다. */
export function subscribe(streams: string[], onMsg: (stream: string, data: unknown) => void) {
  let ws: WebSocket | null = null;
  let closed = false;
  let retry = 0;
  const open = () => {
    ws = new WebSocket(`${FSTREAM}?streams=${streams.join('/')}`);
    ws.onmessage = (e) => {
      retry = 0;
      try {
        const m = JSON.parse(e.data as string) as { stream: string; data: unknown };
        onMsg(m.stream, m.data);
      } catch {
        /* 무시 */
      }
    };
    ws.onclose = () => {
      if (!closed) setTimeout(open, Math.min(15000, 1000 * 2 ** retry++));
    };
  };
  try {
    open();
  } catch {
    /* 웹소켓을 쓸 수 없는 환경 */
  }
  return () => {
    closed = true;
    ws?.close();
  };
}
