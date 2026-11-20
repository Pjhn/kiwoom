import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import arrowDown from '../assets/icons/arrow-down-12-chart.svg';
import expand from '../assets/icons/expand.svg';
import settingsIcon from '../assets/icons/settings.svg';
import check from '../assets/icons/check-magenta-24.svg';
import type { Interval } from '../lib/candles';
import { STOCKS, type Stock, stockById } from '../lib/market';
import { useCandles } from '../lib/useCandles';
import { DEFAULT_SETTINGS, MA_COLORS, TvChart, type ChartSettings } from './TvChart';

const PERIODS: Interval[] = ['일', '주', '월', '년'];
const MINUTES: Interval[] = ['1분', '3분', '5분', '15분', '30분', '60분'];
const MAX_PANES = 4;

function Pane({
  sym,
  interval,
  settings,
  onClose,
  onCycle,
  onPickPrice,
  panelOpen,
}: {
  panelOpen?: boolean;
  sym: Stock;
  interval: Interval;
  settings: ChartSettings;
  onPickPrice?: (p: number) => void;
  onClose?: () => void;
  onCycle: () => void;
}) {
  const candles = useCandles(sym, interval);
  return (
    <div className="mchart-pane">
      <TvChart candles={candles} interval={interval} settings={settings} onPickPrice={onPickPrice} panelOpen={panelOpen} />
      <div className="pane-tools">
        <button className="pane-name" onClick={onCycle} aria-label={`${sym.name}, 눌러서 종목 바꾸기`}>
          {sym.name}
        </button>
        {([20, 60, 120] as const)
          .filter((l) => settings.ma[l])
          .map((l) => (
            <span key={l} className="pane-ma" style={{ color: MA_COLORS[l] }}>
              MA({l})
            </span>
          ))}
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

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <span />
    </button>
  );
}

function SettingsSheet({
  value,
  onChange,
  onClose,
}: {
  value: ChartSettings;
  onChange: (s: ChartSettings) => void;
  onClose: () => void;
}) {
  const types: { k: ChartSettings['type']; l: string }[] = [
    { k: 'candle', l: '캔들' },
    { k: 'line', l: '라인' },
    { k: 'area', l: '영역' },
  ];
  return (
    <div className="sheet-layer">
      <div className="dim ot-dim" onClick={onClose} />
      <div className="sheet ot-sheet chart-settings" role="dialog" aria-modal="true" aria-label="차트 설정">
        <span className="handle" />
        <div className="cs-group">
          <p className="ot-head">차트 종류</p>
          <div className="seg cs-seg" role="radiogroup">
            {types.map((t) => (
              <button
                key={t.k}
                role="radio"
                aria-checked={value.type === t.k}
                className={value.type === t.k ? 'on buy' : ''}
                onClick={() => onChange({ ...value, type: t.k })}
              >
                {t.l}
              </button>
            ))}
          </div>
        </div>
        <div className="ot-divider" />
        <div className="cs-group">
          <p className="ot-head">이동평균선</p>
          {([20, 60, 120] as const).map((l) => (
            <div className="cs-row" key={l}>
              <span>
                <i style={{ background: MA_COLORS[l] }} />
                {l}일선
              </span>
              <Switch
                label={`${l}일 이동평균선`}
                on={value.ma[l]}
                onChange={(v) => onChange({ ...value, ma: { ...value.ma, [l]: v } })}
              />
            </div>
          ))}
        </div>
        <div className="ot-divider" />
        <div className="cs-group">
          <p className="ot-head">보조</p>
          <div className="cs-row">
            <span>거래량</span>
            <Switch label="거래량" on={value.volume} onChange={(v) => onChange({ ...value, volume: v })} />
          </div>
          <div className="cs-row">
            <span>격자</span>
            <Switch label="격자" on={value.grid} onChange={(v) => onChange({ ...value, grid: v })} />
          </div>
        </div>
        <button className="cs-reset" onClick={() => onChange(DEFAULT_SETTINGS)}>
          기본값으로
        </button>
      </div>
    </div>
  );
}

export function MultiChart({
  main,
  onPickPrice,
  panelOpen = false,
}: {
  main: Stock;
  onPickPrice: (p: number) => void;
  panelOpen?: boolean;
}) {
  const [interval, setInterval] = useState<Interval>('일');
  const [minute, setMinute] = useState<Interval>('15분');
  const [minuteOpen, setMinuteOpen] = useState(false);
  const [panes, setPanes] = useState<{ key: number; sym: string }[]>([{ key: 1, sym: main.id }]);
  const [seq, setSeq] = useState(2);
  const [expanded, setExpanded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<ChartSettings>(DEFAULT_SETTINGS);
  const menuRef = useRef<HTMLDivElement>(null);

  // 바깥을 누르면 분 메뉴 닫기
  useEffect(() => {
    if (!minuteOpen) return;
    const off = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMinuteOpen(false);
    };
    document.addEventListener('pointerdown', off);
    return () => document.removeEventListener('pointerdown', off);
  }, [minuteOpen]);

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
  const device = typeof document !== 'undefined' ? document.querySelector('.device') : null;

  const body = (
    <div className={`mchart ${expanded ? 'expanded' : ''}`}>
      <div className="mchart-head">
        <div className="l">
          <div className="minute-wrap" ref={menuRef}>
            <button
              className={`interval ${minuteMode ? 'on' : ''}`}
              onClick={() => setMinuteOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={minuteOpen}
            >
              <span>{minute}</span>
              <img src={arrowDown} alt="" className={minuteOpen ? 'flip' : ''} />
            </button>
            {minuteOpen && (
              <ul className="minute-menu" role="listbox" aria-label="분봉 주기">
                {MINUTES.map((m) => (
                  <li key={m}>
                    <button
                      role="option"
                      aria-selected={minuteMode && interval === m}
                      className={minuteMode && interval === m ? 'on' : ''}
                      onClick={() => {
                        setMinute(m);
                        setInterval(m);
                        setMinuteOpen(false);
                      }}
                    >
                      {m}
                      {minuteMode && interval === m && <img src={check} alt="" width={16} height={16} />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {PERIODS.map((p) => (
            <button key={p} className={`text-btn ${p === interval ? 'on' : ''}`} onClick={() => setInterval(p)}>
              {p}
            </button>
          ))}
        </div>
        <div className="r">
          <button
            className={`icon-32 ${expanded ? 'is-expanded' : ''}`}
            aria-label={expanded ? '차트 작게 보기' : '차트 크게 보기'}
            aria-pressed={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            <img src={expand} alt="" />
          </button>
          <button className="icon-32" aria-label="차트 설정" onClick={() => setSettingsOpen(true)}>
            <img src={settingsIcon} alt="" />
          </button>
        </div>
      </div>
      <div className="mchart-panes">
        {panes.map((p) => (
          <Pane
            key={p.key}
            sym={stockById(p.sym)}
            interval={interval}
            settings={settings}
            onPickPrice={p.sym === main.id ? onPickPrice : undefined}
            panelOpen={panelOpen && !expanded}
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

  return (
    <>
      {expanded && device ? createPortal(<div className="chart-full">{body}</div>, device) : body}
      {settingsOpen &&
        device &&
        createPortal(<SettingsSheet value={settings} onChange={setSettings} onClose={() => setSettingsOpen(false)} />, device)}
    </>
  );
}
