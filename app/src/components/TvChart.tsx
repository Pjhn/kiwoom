import { useEffect, useRef } from 'react';
import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type SeriesType,
  type UTCTimestamp,
} from 'lightweight-charts';
import { type Candle, type Interval, movingAverage } from '../lib/candles';
import { snap } from '../lib/market';

export type ChartSettings = {
  type: 'candle' | 'line' | 'area';
  ma: { 20: boolean; 60: boolean; 120: boolean };
  volume: boolean;
  grid: boolean;
};
export const DEFAULT_SETTINGS: ChartSettings = {
  type: 'candle',
  ma: { 20: true, 60: false, 120: false },
  volume: false,
  grid: true,
};
export const MA_COLORS = { 20: '#f59f00', 60: '#20c997', 120: '#7950f2' } as const;

const fmtPrice = (p: number) =>
  p >= 1000 ? Math.round(p).toLocaleString('ko-KR') : p.toLocaleString('ko-KR', { maximumFractionDigits: 4 });
const ts = (t: number) => t as UTCTimestamp;

/** TradingView Lightweight Charts 한 칸. 터치(마우스) 위치를 중심으로 격자가 빛난다 */
export function TvChart({
  candles,
  interval,
  settings,
  onPickPrice,
}: {
  candles: Candle[];
  interval: Interval;
  settings: ChartSettings;
  /** 차트를 누른 높이의 가격을 주문 가격으로 넘긴다 (현재 종목 차트에만) */
  onPickPrice?: (price: number) => void;
}) {
  const pickRef = useRef(onPickPrice);
  pickRef.current = onPickPrice;
  const pickLine = useRef<IPriceLine | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const main = useRef<ISeriesApi<SeriesType> | null>(null);
  const vol = useRef<ISeriesApi<'Histogram'> | null>(null);
  const mas = useRef<Partial<Record<20 | 60 | 120, ISeriesApi<'Line'>>>>({});

  // 차트 종류가 바뀌면 다시 만든다
  useEffect(() => {
    const c = createChart(box.current!, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#606b76',
        fontSize: 11,
        fontFamily: 'Pretendard, system-ui, sans-serif',
        attributionLogo: true,
      },
      grid: { vertLines: { color: '#f1f3f5' }, horzLines: { color: '#f1f3f5' } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.18, bottom: 0.08 } },
      timeScale: { borderVisible: false, rightOffset: 4, barSpacing: 5 },
      crosshair: { mode: CrosshairMode.Normal },
      localization: { locale: 'ko-KR', priceFormatter: fmtPrice },
    });
    if (settings.type === 'candle') {
      main.current = c.addSeries(CandlestickSeries, {
        upColor: '#e5007d',
        downColor: '#0354ad',
        borderVisible: false,
        wickUpColor: '#e5007d',
        wickDownColor: '#0354ad',
        priceLineColor: '#343a40',
      });
    } else if (settings.type === 'line') {
      main.current = c.addSeries(LineSeries, { color: '#e5007d', lineWidth: 2, priceLineColor: '#343a40' });
    } else {
      main.current = c.addSeries(AreaSeries, {
        lineColor: '#e5007d',
        topColor: 'rgba(229,0,125,.28)',
        bottomColor: 'rgba(229,0,125,0)',
        lineWidth: 2,
        priceLineColor: '#343a40',
      });
    }
    chart.current = c;
    c.subscribeClick((param) => {
      const s = main.current;
      if (!pickRef.current || !s || !param.point) return;
      const raw = s.coordinateToPrice(param.point.y);
      if (raw == null || !(raw > 0)) return;
      const price = snap(raw);
      if (pickLine.current) s.removePriceLine(pickLine.current);
      pickLine.current = s.createPriceLine({
        price,
        color: '#e5007d',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: '주문가',
      });
      pickRef.current(price);
    });
    return () => {
      pickLine.current = null;
      c.remove();
      chart.current = null;
      main.current = null;
      vol.current = null;
      mas.current = {};
    };
  }, [settings.type]);

  // 데이터와 보조 지표
  useEffect(() => {
    const c = chart.current;
    if (!c || !main.current) return;
    const intraday = interval.endsWith('분');
    c.applyOptions({
      timeScale: { timeVisible: intraday, secondsVisible: false },
      grid: {
        vertLines: { visible: settings.grid, color: '#f1f3f5' },
        horzLines: { visible: settings.grid, color: '#f1f3f5' },
      },
      rightPriceScale: { scaleMargins: { top: 0.18, bottom: settings.volume ? 0.26 : 0.08 } },
    });
    if (settings.type === 'candle') main.current.setData(candles.map((k) => ({ ...k, time: ts(k.time) })));
    else main.current.setData(candles.map((k) => ({ time: ts(k.time), value: k.close })));

    // 이동평균선
    for (const len of [20, 60, 120] as const) {
      const on = settings.ma[len];
      if (on && !mas.current[len]) {
        mas.current[len] = c.addSeries(LineSeries, {
          color: MA_COLORS[len],
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
      }
      if (!on && mas.current[len]) {
        c.removeSeries(mas.current[len]!);
        delete mas.current[len];
      }
      mas.current[len]?.setData(movingAverage(candles, len).map((m) => ({ ...m, time: ts(m.time) })));
    }
    // 거래량
    if (settings.volume && !vol.current) {
      vol.current = c.addSeries(HistogramSeries, { priceScaleId: 'vol', priceFormat: { type: 'volume' }, lastValueVisible: false, priceLineVisible: false });
      c.priceScale('vol').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    }
    if (!settings.volume && vol.current) {
      c.removeSeries(vol.current);
      vol.current = null;
    }
    vol.current?.setData(
      candles.map((k) => ({
        time: ts(k.time),
        value: k.volume,
        color: k.close >= k.open ? 'rgba(229,0,125,.35)' : 'rgba(3,84,173,.35)',
      })),
    );
  }, [candles, interval, settings]);

  // 처음 데이터와 주기를 바꿀 때만 최근 봉으로 이동
  useEffect(() => {
    chart.current?.timeScale().scrollToRealTime();
  }, [interval, settings.type, candles.length > 0]);

  const move = (x: number, y: number) => {
    const el = wrap.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--gx', `${x - r.left}px`);
    el.style.setProperty('--gy', `${y - r.top}px`);
    el.classList.add('glow-on');
  };

  return (
    <div
      className="tv-wrap"
      ref={wrap}
      onPointerMove={(e) => move(e.clientX, e.clientY)}
      onPointerDown={(e) => move(e.clientX, e.clientY)}
      onPointerLeave={() => wrap.current?.classList.remove('glow-on')}
      onPointerUp={(e) => e.pointerType !== 'mouse' && wrap.current?.classList.remove('glow-on')}
    >
      <div className="grid-glow" aria-hidden />
      <div className="tv-chart" ref={box} />
    </div>
  );
}
