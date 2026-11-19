// 바이낸스 주식 선물은 USDT로 거래되므로 원화로 바꿔 보여준다.
// 환율은 업비트 KRW-USDT 시세를 쓰고, 실패하면 VITE_USDKRW 또는 1,450원을 쓴다.
const FALLBACK = Number(import.meta.env.VITE_USDKRW) || 1450;
let rate = FALLBACK;
let loaded: Promise<number> | null = null;

export function usdKrw() {
  return rate;
}

export function loadUsdKrw(): Promise<number> {
  if (!loaded) {
    loaded = fetch('https://api.upbit.com/v1/ticker?markets=KRW-USDT', { signal: AbortSignal.timeout(4000) })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((j: { trade_price: number }[]) => {
        const v = j?.[0]?.trade_price;
        if (v && v > 500 && v < 5000) rate = v;
        return rate;
      })
      .catch(() => rate);
  }
  return loaded;
}
