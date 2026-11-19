import { useState } from 'react';
import arrowDown from '../assets/icons/arrow-down-12-chart.svg';
import expand from '../assets/icons/expand.svg';
import settings from '../assets/icons/settings.svg';
import type { Interval } from '../lib/candles';
import { STOCKS, type Stock, stockById } from '../lib/market';
import { useCandles } from '../lib/useCandles';
import { TvChart } from './TvChart';

const PERIODS: Interval[] = ['일', '주', '월', '년'];
const MINUTES: Interval[] = ['1분', '5분', '15분', '60분'];
const MAX_PANES = 4;

function Pane({
  sym,
  interval,
  onClose,
  onCycle,
}: {
  sym: Stock;
  interval: Interval;
  onClose?: () => void;
  onCycle: () => void;
}) {
  const candles = useCandles(sym, interval);
  return (
    <div className="mchart-pane">
      <TvChart candles={candles} interval={interval} />
      <div className="pane-tools">
        <button className="pane-name" onClick={onCycle} aria-label={`${sym.name}, 눌러서 종목 바꾸기`}>
          {sym.name}
        </button>
        <span className="pane-ma">MA(20)</span>
        {onClose && (
          <button className="pane-close" onClick={onClose} aria-label={`${sym.name} 차트 닫기`}>
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
              <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="#868E96" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export function MultiChart({ main }: { main: Stock }) {
  const [interval, setInterval] = useState<Interval>('일');
  const [minute, setMinute] = useState<Interval>('15분');
  const [panes, setPanes] = useState<{ key: number; sym: string }[]>([{ key: 1, sym: main.id }]);
  const [seq, setSeq] = useState(2);

  const symOf = stockById;
  const nextFree = (taken: string[]) => STOCKS.find((s) => !taken.includes(s.id)) ?? STOCKS[0];

  const addPane = () => {
    if (panes.length >= MAX_PANES) return;
    setPanes((p) => [...p, { key: seq, sym: nextFree(p.map((x) => x.sym)).id }]);
    setSeq((s) => s + 1);
  };
  const cycle = (key: number) =>
    setPanes((p) =>
      p.map((x) => {
        if (x.key !== key) return x;
        const i = STOCKS.findIndex((s) => s.id === x.sym);
        return { ...x, sym: STOCKS[(i + 1) % STOCKS.length].id };
      }),
    );

  const minuteMode = interval.endsWith('분');

  return (
    <div className="mchart">
      <div className="mchart-head">
        <div className="l">
          <button
            className={`interval ${minuteMode ? 'on' : ''}`}
            onClick={() => {
              if (!minuteMode) return setInterval(minute);
              const next = MINUTES[(MINUTES.indexOf(minute) + 1) % MINUTES.length];
              setMinute(next);
              setInterval(next);
            }}
            aria-label="분봉 주기 바꾸기"
          >
            <span>{minute}</span>
            <img src={arrowDown} alt="" />
          </button>
          {PERIODS.map((p) => (
            <button key={p} className={`text-btn ${p === interval ? 'on' : ''}`} onClick={() => setInterval(p)}>
              {p}
            </button>
          ))}
        </div>
        <div className="r">
          <button className="icon-32" aria-label="크게 보기">
            <img src={expand} alt="" />
          </button>
          <button className="icon-32" aria-label="차트 설정">
            <img src={settings} alt="" />
          </button>
        </div>
      </div>
      <div className="mchart-panes">
        {panes.map((p) => (
          <Pane
            key={p.key}
            sym={symOf(p.sym)}
            interval={interval}
            onCycle={() => cycle(p.key)}
            onClose={panes.length > 1 ? () => setPanes((x) => x.filter((y) => y.key !== p.key)) : undefined}
          />
        ))}
      </div>
      <button className="chart-add" onClick={addPane} disabled={panes.length >= MAX_PANES}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        {panes.length >= MAX_PANES ? `차트는 ${MAX_PANES}개까지 볼 수 있어요` : '차트 추가'}
      </button>
    </div>
  );
}
