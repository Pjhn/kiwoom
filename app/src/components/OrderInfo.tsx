import { type CSSProperties, Fragment, type ReactNode, useLayoutEffect, useRef } from 'react';
import filterIcon from '../assets/icons/filter.svg';
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

function FilterRow({ count, current, right }: { count: number; current: number; right?: ReactNode }) {
  return (
    <div className="oi-filter">
      <div className="l">
        <button className="chip on">전체 {count}</button>
        <button className="chip">현재 종목 {current}</button>
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
  open: Order[];
  history: Order[];
  holdings: Holding[];
  priceOf: (stockId: string) => number;
  currentStockId: string;
  showTip: boolean;
  onCancel: (id: number) => void;
  onCancelAll: () => void;
  onHolding: (stockId: string) => void;
  /** 날아가는 중인 대기 주문과 그 목적지 탭 */
  leaving: Record<number, InfoTab>;
  /** 종이가 도착한 탭 (튀는 효과) */
  catchTab: { tab: InfoTab; n: number } | null;
};

const paper = (i: number) => ({ '--i': Math.min(i, 8) }) as CSSProperties;

export function OrderInfo(p: Props) {
  const root = useRef<HTMLElement>(null);
  // 날아갈 대기 주문마다 목적지 탭까지의 거리를 잰다
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    for (const [id, tab] of Object.entries(p.leaving)) {
      const item = el.querySelector<HTMLElement>(`[data-id="${id}"]`);
      const target = el.querySelector<HTMLElement>(`[data-tab="${tab}"]`);
      if (!item || !target || item.dataset.flying) continue;
      const a = item.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      item.style.setProperty('--fx', `${b.left + b.width / 2 - (a.left + 39)}px`);
      item.style.setProperty('--fy', `${b.top + b.height / 2 - (a.top + a.height / 2)}px`);
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

      <div className="oi-body">
        {p.tab === 'pending' &&
          (p.open.length === 0 ? (
            <Empty text="주문 내역이 비어있어요" />
          ) : (
            <>
              <FilterRow
                count={p.open.length}
                current={p.open.filter((o) => o.stockId === p.currentStockId).length}
                right={
                  <button className="outlined-sm" onClick={p.onCancelAll}>
                    {p.open.length}건 취소
                  </button>
                }
              />
              <ul className="oi-list">
                {p.open.map((o, i) => (
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
                count={p.holdings.length}
                current={p.holdings.filter((h) => h.stockId === p.currentStockId).length}
                right={
                  <button className="sort-btn">
                    <img src={filterIcon} alt="" />
                    최근거래 순
                  </button>
                }
              />
              {p.holdings.map((h, i) => (
                <HoldingItem
                  key={h.stockId}
                  index={i}
                  h={h}
                  price={p.priceOf(h.stockId)}
                  showTip={p.showTip && i === 0}
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
                count={p.history.length}
                current={p.history.filter((o) => o.stockId === p.currentStockId).length}
              />
              <ul className="oi-list">
                {p.history.map((o, i) => (
                  <li key={o.id} style={paper(i)} className="oi-item paper">
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
  showTip,
  onClick,
  index,
}: {
  h: Holding;
  price: number;
  showTip: boolean;
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
      <button className="oi-item holding" onClick={onClick} aria-label={`${stock.name} 판매하기`}>
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
      {showTip && (
        <div className="tooltip" role="tooltip">
          <img className="arrow" src={tooltipArrow} alt="" />
          터치하여 판매할 수 있어요
        </div>
      )}
    </div>
  );
}
