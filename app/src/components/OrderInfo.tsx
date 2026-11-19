import { type CSSProperties, Fragment, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import filterIcon from '../assets/icons/filter.svg';
import checkMagenta from '../assets/icons/check-magenta-24.svg';
import arrowDown from '../assets/icons/arrow-down-16-outlined.svg';
import tooltipArrow from '../assets/icons/tooltip-arrow.svg';
import emptyGraphic from '../assets/img/empty-graphic@3x.png';
import { fmt, stockById } from '../lib/market';
import { StockLogo, kakaoHoldingLogo } from './StockLogo';
import type { Side } from './OrderPanel';

export type OrderStatus = 'pending' | 'partial' | 'filled' | 'cancelled';
export type Order = {
  id: number;
  stockId: string;
  side: Side;
  price: number;
  qty: number;
  filled: number;
  status: OrderStatus;
  time: string;
  isNew?: boolean;
  /** 접수, 체결, 취소된 시각 (ms) */
  at?: number;
};
export type Holding = { stockId: string; qty: number; avg: number };
export type InfoTab = 'pending' | 'holdings' | 'history';

const TABS: { key: InfoTab; label: string }[] = [
  { key: 'pending', label: '대기' },
  { key: 'holdings', label: '보유' },
  { key: 'history', label: '내역' },
];

const sideLabel = (s: Side) => (s === 'buy' ? '구매' : '판매');

function Empty({ text }: { text: string }) {
  return (
    <div className="oi-empty">
      <img src={emptyGraphic} alt="" width={108} height={108} />
      <p>{text}</p>
    </div>
  );
}

type Scope = 'all' | 'current';
type Sort = 'recent' | 'value' | 'profit';
const SORTS: { key: Sort; label: string }[] = [
  { key: 'recent', label: '최근거래 순' },
  { key: 'value', label: '평가금액 순' },
  { key: 'profit', label: '수익률 순' },
];

/** 정렬 드롭다운: 차트 분봉 메뉴와 같은 모양 */
function SortMenu({ value, onChange }: { value: Sort; onChange: (s: Sort) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', off);
    return () => document.removeEventListener('pointerdown', off);
  }, [open]);
  return (
    <div className="sort-wrap" ref={ref}>
      <button className="sort-btn" onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open}>
        <img src={filterIcon} alt="" />
        {SORTS.find((x) => x.key === value)!.label}
      </button>
      {open && (
        <ul className="minute-menu sort-menu" role="listbox" aria-label="정렬">
          {SORTS.map((o) => (
            <li key={o.key}>
              <button
                role="option"
                aria-selected={o.key === value}
                className={o.key === value ? 'on' : ''}
                onClick={() => {
                  onChange(o.key);
                  setOpen(false);
                }}
              >
                {o.label}
                {o.key === value && <img src={checkMagenta} alt="" width={16} height={16} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** 내역 날짜 범위 */
type DateRange = { kind: 'all' | 'today' | '7d' | '30d' } | { kind: 'day'; day: string };
const RANGES: { kind: 'all' | 'today' | '7d' | '30d'; label: string }[] = [
  { kind: 'all', label: '전체 기간' },
  { kind: 'today', label: '오늘' },
  { kind: '7d', label: '최근 7일' },
  { kind: '30d', label: '최근 1개월' },
];
const ymd = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const DAY = 86_400_000;
function inRange(at: number | undefined, r: DateRange) {
  const t = at ?? Date.now();
  if (r.kind === 'all') return true;
  if (r.kind === 'day') return ymd(t) === r.day;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const from = start.getTime() - (r.kind === 'today' ? 0 : r.kind === '7d' ? 6 * DAY : 29 * DAY);
  return t >= from;
}
const rangeLabel = (r: DateRange) =>
  r.kind === 'day' ? `${Number(r.day.slice(5, 7))}월 ${Number(r.day.slice(8, 10))}일` : RANGES.find((x) => x.kind === r.kind)!.label;

/** 내역 날짜 고르기: 정렬 메뉴와 같은 드롭다운, 마지막 줄에서 달력으로 하루를 고른다 */
function DateMenu({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', off);
    return () => document.removeEventListener('pointerdown', off);
  }, [open]);
  const pick = (r: DateRange) => {
    onChange(r);
    setOpen(false);
  };
  return (
    <div className="sort-wrap" ref={ref}>
      <button className="sort-btn date-btn" onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open}>
        {rangeLabel(value)}
        <img src={arrowDown} alt="" className={open ? 'flip' : ''} />
      </button>
      {open && (
        <ul className="minute-menu sort-menu" role="listbox" aria-label="날짜">
          {RANGES.map((o) => (
            <li key={o.kind}>
              <button role="option" aria-selected={value.kind === o.kind} className={value.kind === o.kind ? 'on' : ''} onClick={() => pick({ kind: o.kind })}>
                {o.label}
                {value.kind === o.kind && <img src={checkMagenta} alt="" width={16} height={16} />}
              </button>
            </li>
          ))}
          <li className="date-pick">
            <button
              role="option"
              aria-selected={value.kind === 'day'}
              className={value.kind === 'day' ? 'on' : ''}
              onClick={() => {
                const el = input.current;
                if (!el) return;
                try {
                  el.showPicker();
                } catch {
                  el.focus();
                  el.click();
                }
              }}
            >
              {value.kind === 'day' ? rangeLabel(value) : '날짜 선택'}
              {value.kind === 'day' && <img src={checkMagenta} alt="" width={16} height={16} />}
            </button>
            <input
              ref={input}
              type="date"
              aria-label="날짜 선택"
              max={ymd(Date.now())}
              value={value.kind === 'day' ? value.day : ''}
              onChange={(e) => e.target.value && pick({ kind: 'day', day: e.target.value })}
            />
          </li>
        </ul>
      )}
    </div>
  );
}

function FilterRow({
  count,
  current,
  scope,
  onScope,
  right,
}: {
  count: number;
  current: number;
  scope: Scope;
  onScope: (s: Scope) => void;
  right?: ReactNode;
}) {
  return (
    <div className="oi-filter">
      <div className="l" role="radiogroup" aria-label="목록 범위">
        <button role="radio" aria-checked={scope === 'all'} className={`chip ${scope === 'all' ? 'on' : ''}`} onClick={() => onScope('all')}>
          전체 {count}
        </button>
        <button
          role="radio"
          aria-checked={scope === 'current'}
          className={`chip ${scope === 'current' ? 'on' : ''}`}
          onClick={() => onScope('current')}
        >
          현재 종목 {current}
        </button>
      </div>
      {right}
    </div>
  );
}

function OrderLine({ o }: { o: Order }) {
  const status =
    o.status === 'pending'
      ? '체결대기'
      : o.status === 'partial'
        ? `일부 체결(${o.filled}/${o.qty})`
        : o.status === 'filled'
          ? '체결완료'
          : '취소됨';
  return (
    <p className="oi-sub">
      <span>{fmt(o.price)} 원</span>
      <i />
      <span>{o.qty}주</span>
      <i />
      <span className={o.status === 'cancelled' ? 'muted' : ''}>{status}</span>
    </p>
  );
}

type Props = {
  tab: InfoTab;
  onTab: (t: InfoTab) => void;
  glowTab: InfoTab | null;
  /** 바로 체결되어 새로 들어온 항목 (보유는 종목 id, 내역은 주문 id) */
  fresh: { tab: InfoTab; key: string } | null;
  open: Order[];
  history: Order[];
  holdings: Holding[];
  priceOf: (stockId: string) => number;
  currentStockId: string;
  onCancel: (id: number) => void;
  onCancelAll: (ids?: number[]) => void;
  onHolding: (stockId: string) => void;
  /** 날아가는 중인 대기 주문과 그 목적지 탭 */
  leaving: Record<number, InfoTab>;
  /** 종이가 도착한 탭 (튀는 효과) */
  catchTab: { tab: InfoTab; n: number } | null;
};

const paper = (i: number) => ({ '--i': Math.min(i, 8) }) as CSSProperties;

function FilteredEmpty() {
  return <p className="oi-none paper">조건에 맞는 항목이 없어요</p>;
}

export function OrderInfo(p: Props) {
  const root = useRef<HTMLElement>(null);
  const [scope, setScope] = useState<Scope>('all');
  const [sort, setSort] = useState<Sort>('recent');
  const [range, setRange] = useState<DateRange>({ kind: 'all' });
  const mine = (id: string) => scope === 'all' || id === p.currentStockId;
  const openList = p.open.filter((o) => mine(o.stockId));
  const historyList = p.history.filter((o) => mine(o.stockId) && inRange(o.at, range));
  const plPct = (h: Holding) => (p.priceOf(h.stockId) - h.avg) / h.avg;
  const holdList = p.holdings
    .filter((h) => mine(h.stockId))
    .map((h, i) => ({ h, i }))
    .sort((a, b) =>
      sort === 'value'
        ? p.priceOf(b.h.stockId) * b.h.qty - p.priceOf(a.h.stockId) * a.h.qty
        : sort === 'profit'
          ? plPct(b.h) - plPct(a.h)
          : a.i - b.i,
    )
    .map((x) => x.h);
  const filterProps = { scope, onScope: setScope };
  // 다른 탭으로 옮겨갈 대기 주문마다 목적지 탭 위치를 잰다
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    for (const [id, tab] of Object.entries(p.leaving)) {
      const item = el.querySelector<HTMLElement>(`[data-id="${id}"]`);
      const target = el.querySelector<HTMLElement>(`[data-tab="${tab}"]`);
      if (!item || !target || item.dataset.flying) continue;
      const a = item.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      // 목적지 탭 가운데를 기준점으로 줄어들며 빨려 들어간다
      item.style.transformOrigin = `${b.left + b.width / 2 - a.left}px ${b.top + b.height / 2 - a.top}px`;
      item.dataset.flying = '1';
      item.classList.add('fly');
    }
  }, [p.leaving]);

  return (
    <section className="order-info" ref={root}>
      <div className="oi-tabs" role="tablist">
        {TABS.map((t, i) => (
          <Fragment key={t.key}>
            {i > 0 && <span className="oi-div" />}
            <button
              role="tab"
              data-tab={t.key}
              key={p.catchTab?.tab === t.key ? `c${p.catchTab.n}` : 'tab'}
              aria-selected={p.tab === t.key}
              className={`oi-tab ${p.tab === t.key ? 'on' : ''} ${p.glowTab === t.key && p.tab !== t.key ? 'glow' : ''} ${p.catchTab?.tab === t.key ? 'catch' : ''}`}
              onClick={() => p.onTab(t.key)}
            >
              {t.label}
            </button>
          </Fragment>
        ))}
      </div>

      <div className="oi-body" key={`${p.tab}-${scope}-${sort}-${JSON.stringify(range)}`}>
        {p.tab === 'pending' &&
          (p.open.length === 0 ? (
            <Empty text="주문 내역이 비어있어요" />
          ) : (
            <>
              <FilterRow
                {...filterProps}
                count={p.open.length}
                current={p.open.filter((o) => o.stockId === p.currentStockId).length}
                right={
                  openList.length > 0 && (
                    <button
                      className="outlined-sm"
                      onClick={() => p.onCancelAll(scope === 'all' ? undefined : openList.map((o) => o.id))}
                    >
                      {openList.length}건 취소
                    </button>
                  )
                }
              />
              {openList.length === 0 && <FilteredEmpty />}
              <ul className="oi-list">
                {openList.map((o, i) => (
                  <li key={o.id} data-id={o.id} style={paper(i)} className={`oi-item paper ${o.isNew ? 'alert' : ''}`}>
                    <StockLogo stock={stockById(o.stockId)} size={46} ring={o.status === 'partial'} />
                    <div className="oi-text">
                      <p className="oi-title">
                        <span className={o.side}>{sideLabel(o.side)}</span> {stockById(o.stockId).name}
                      </p>
                      <OrderLine o={o} />
                    </div>
                    <button className="cancel-btn" onClick={() => p.onCancel(o.id)}>
                      취소
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ))}

        {p.tab === 'holdings' &&
          (p.holdings.length === 0 ? (
            <Empty text="보유한 주식이 없어요" />
          ) : (
            <>
              <FilterRow
                {...filterProps}
                count={p.holdings.length}
                current={p.holdings.filter((h) => h.stockId === p.currentStockId).length}
                right={
                  <SortMenu value={sort} onChange={setSort} />
                }
              />
              {holdList.length === 0 && <FilteredEmpty />}
              {holdList.map((h, i) => (
                <HoldingItem
                  key={h.stockId}
                  index={i}
                  h={h}
                  price={p.priceOf(h.stockId)}
                  fresh={p.fresh?.tab === 'holdings' && p.fresh.key === h.stockId}
                  onClick={() => p.onHolding(h.stockId)}
                />
              ))}
            </>
          ))}

        {p.tab === 'history' &&
          (p.history.length === 0 ? (
            <Empty text="거래 내역이 비어있어요" />
          ) : (
            <>
              <FilterRow
                {...filterProps}
                count={p.history.length}
                current={p.history.filter((o) => o.stockId === p.currentStockId).length}
                right={<DateMenu value={range} onChange={setRange} />}
              />
              {historyList.length === 0 && <FilteredEmpty />}
              <ul className="oi-list">
                {historyList.map((o, i) => (
                  <li
                    key={o.id}
                    style={paper(i)}
                    className={`oi-item paper ${p.fresh?.tab === 'history' && p.fresh.key === String(o.id) ? 'alert' : ''}`}
                  >
                    <StockLogo stock={stockById(o.stockId)} size={46} />
                    <div className="oi-text">
                      <p className="oi-title">
                        <span className={o.side}>{sideLabel(o.side)}</span> {stockById(o.stockId).name}
                      </p>
                      <OrderLine o={o} />
                    </div>
                    <span className="oi-time">{o.time}</span>
                  </li>
                ))}
              </ul>
            </>
          ))}
      </div>
    </section>
  );
}

function HoldingItem({
  h,
  price,
  onClick,
  index,
  fresh,
}: {
  fresh: boolean;
  h: Holding;
  price: number;
  onClick: () => void;
  index: number;
}) {
  const stock = stockById(h.stockId);
  const value = price * h.qty;
  const cost = h.avg * h.qty;
  const pl = value - cost;
  const plPct = (pl / cost) * 100;
  const tone = pl > 0 ? 'up' : pl < 0 ? 'down' : '';
  return (
    <div className="holding-wrap paper" style={paper(index)}>
      <button className={`oi-item holding ${fresh ? 'alert' : ''}`} onClick={onClick} aria-label={`${stock.name} 판매하기`}>
        {stock.id === 'kakao' ? (
          <img className="logo" src={kakaoHoldingLogo} alt="" width={46} height={46} />
        ) : (
          <StockLogo stock={stock} size={46} />
        )}
        <div className="oi-text">
          <p className="oi-title">{stock.name}</p>
          <p className="oi-sub">
            <span>평균 {fmt(h.avg)} 원</span>
            <i />
            <span>{h.qty}주</span>
          </p>
        </div>
        <div className="holding-r">
          <p className="v">{fmt(value)}</p>
          <p className={`pl ${tone}`}>
            {pl > 0 ? '+' : ''}
            {fmt(pl)} ({pl > 0 ? '+' : ''}
            {plPct.toFixed(1)}%)
          </p>
        </div>
      </button>
      {fresh && (
        <div className="tooltip" role="tooltip">
          <img className="arrow" src={tooltipArrow} alt="" />
          터치하여 판매할 수 있어요
        </div>
      )}
    </div>
  );
}
