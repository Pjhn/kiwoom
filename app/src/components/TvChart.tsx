import { useEffect, useRef } from 'react';
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import { type Candle, type Interval, movingAverage } from '../lib/candles';

const fmtPrice = (p: number) =>
  p >= 1000 ? Math.round(p).toLocaleString('ko-KR') : p.toLocaleString('ko-KR', { maximumFractionDigits: 4 });

/** TradingView Lightweight Charts 캔들 차트 한 칸 */
export function TvChart({ candles, interval }: { candles: Candle[]; interval: Interval }) {
  const box = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const candleSeries = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const maSeries = useRef<ISeriesApi<'Line'> | null>(null);

  useEffect(() => {
    const c = createChart(box.current!, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
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
    candleSeries.current = c.addSeries(CandlestickSeries, {
      upColor: '#e5007d',
      downColor: '#0354ad',
      borderVisible: false,
      wickUpColor: '#e5007d',
      wickDownColor: '#0354ad',
      priceLineColor: '#343a40',
    });
    maSeries.current = c.addSeries(LineSeries, {
      color: '#f59f00',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    chart.current = c;
    return () => {
      c.remove();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candleSeries.current || !maSeries.current || !chart.current) return;
    const intraday = interval.endsWith('분');
    chart.current.applyOptions({ timeScale: { timeVisible: intraday, secondsVisible: false } });
    candleSeries.current.setData(candles.map((k) => ({ ...k, time: k.time as UTCTimestamp })));
    maSeries.current.setData(movingAverage(candles).map((m) => ({ ...m, time: m.time as UTCTimestamp })));
    chart.current.timeScale().scrollToRealTime();
  }, [candles, interval]);

  return <div className="tv-chart" ref={box} />;
}
