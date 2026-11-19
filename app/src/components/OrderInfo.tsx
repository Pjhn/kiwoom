import { Fragment, type ReactNode } from 'react';
import logo46 from '../assets/icons/logo-kakao-46.svg';
import logo46Ring from '../assets/icons/logo-kakao-46-ring.svg';
import logo46Holding from '../assets/icons/logo-kakao-46-holding.svg';
import filterIcon from '../assets/icons/filter.svg';
import tooltipArrow from '../assets/icons/tooltip-arrow.svg';
import emptyGraphic from '../assets/img/empty-graphic@3x.png';
import { CURRENT_PRICE, STOCK, fmt } from '../lib/market';
import type { Side } from './OrderPanel';

export type OrderStatus = 'pending' | 'partial' | 'filled' | 'cancelled';
export type Order = {
  id: number;
  side: Side;
  price: number;
  qty: number;
  filled: number;
  status: OrderStatus;
  time: string;
  isNew?: boolean;
};
export type Holding = { qty: number; avg: number };
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

function FilterRow({ count, right }: { count: number; right?: ReactNode }) {
  return (
    <div className="oi-filter">
      <div className="l">
        <button className="chip on">전체 {count}</button>
        <button className="chip">현재 종목 {count}</button>
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
  holding: Holding | null;
  showTip: boolean;
  onCancel: (id: number) => void;
  onCancelAll: () => void;
  onHolding: () => void;
};

export function OrderInfo(p: Props) {
  return (
    <section className="order-info">
      <div className="oi-tabs" role="tablist">
        {TABS.map((t, i) => (
          <Fragment key={t.key}>
            {i > 0 && <span className="oi-div" />}
            <button
              role="tab"
              aria-selected={p.tab === t.key}
              className={`oi-tab ${p.tab === t.key ? 'on' : ''} ${p.glowTab === t.key && p.tab !== t.key ? 'glow' : ''}`}
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
                right={
                  <button className="outlined-sm" onClick={p.onCancelAll}>
                    {p.open.length}건 취소
                  </button>
                }
              />
              <ul className="oi-list">
                {p.open.map((o) => (
                  <li key={o.id} className={`oi-item ${o.isNew ? 'alert' : ''}`}>
                    <img className="logo" src={o.status === 'partial' ? logo46Ring : logo46} alt="" />
                    <div className="oi-text">
                      <p className="oi-title">
                        <span className={o.side}>{sideLabel(o.side)}</span> {STOCK.name}
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
          (!p.holding ? (
            <Empty text="보유한 주식이 없어요" />
          ) : (
            <>
              <FilterRow
                count={1}
                right={
                  <button className="sort-btn">
                    <img src={filterIcon} alt="" />
                    최근거래 순
                  </button>
                }
              />
              <HoldingItem h={p.holding} showTip={p.showTip} onClick={p.onHolding} />
            </>
          ))}

        {p.tab === 'history' &&
          (p.history.length === 0 ? (
            <Empty text="거래 내역이 비어있어요" />
          ) : (
            <>
              <FilterRow count={p.history.length} />
              <ul className="oi-list">
                {p.history.map((o) => (
                  <li key={o.id} className="oi-item">
                    <img className="logo" src={logo46} alt="" />
                    <div className="oi-text">
                      <p className="oi-title">
                        <span className={o.side}>{sideLabel(o.side)}</span> {STOCK.name}
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

function HoldingItem({ h, showTip, onClick }: { h: Holding; showTip: boolean; onClick: () => void }) {
  const value = CURRENT_PRICE * h.qty;
  const cost = h.avg * h.qty;
  const pl = value - cost;
  const plPct = (pl / cost) * 100;
  const tone = pl > 0 ? 'up' : pl < 0 ? 'down' : '';
  return (
    <div className="holding-wrap">
      <button className="oi-item holding" onClick={onClick} aria-label="카카오 판매하기">
        <img className="logo" src={logo46Holding} alt="" />
        <div className="oi-text">
          <p className="oi-title">{STOCK.name}</p>
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
