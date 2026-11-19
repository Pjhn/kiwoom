import { useLayoutEffect, useRef } from 'react';
import { type BookRow, type Market, fmt, fmtPct, pctOf } from '../lib/market';

// 호가 줄 높이가 고정이라 현재가 위치를 계산으로 정한다 (Figma 위치에 맞춰 처음 스크롤)
const PAD = 40;
const C_CUR = PAD + 10 * 35.4 + 9 * 14 + 13.6; // 좁은 호가 현재가 위치
const W_CUR = PAD + 10 * 33.4 + 9 * 13 + 13.6; // 넓은 호가 현재가 위치

/** 현재가 색: 상승 분홍, 보합 검정, 하락 파랑 */
const curTone = (m: Market) => (m.price > m.prevClose ? 'grad-price' : m.price < m.prevClose ? 'cur-down' : 'cur-flat');

function useInitialScroll(target: number, key: string) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = target;
  }, [target, key]);
  return ref;
}

type Props = { market: Market; onPick: (price: number) => void };

const barW = (v: number, max: number, of: number) => (of <= 0 ? 2 : Math.max(2, Math.round(max * Math.sqrt(v / of))));

function priceClass(price: number, prev: number, side: 'ask' | 'bid') {
  if (price < prev) return 'down';
  return side === 'ask' ? 'up-ask' : 'up-bid';
}

function CompactRow({ row, side, market, onPick, of }: { row: BookRow; side: 'ask' | 'bid'; of: number } & Props) {
  return (
    <button
      className={`cbook-row ${side}`}
      onClick={() => onPick(row.price)}
      aria-label={`${fmt(row.price)}원 선택`}
    >
      <span className="cbook-left">
        <span className="cbook-slot">{row.price === market.open && <span className="quote-badge">시</span>}</span>
        <span className={`cbook-price ${priceClass(row.price, market.prevClose, side)}`}>
          <span className="p">{fmt(row.price)}</span>
          <span className="r">{fmtPct(pctOf(row.price, market.prevClose))}</span>
        </span>
      </span>
      <span className={`vol-bar ${side}`} style={{ width: barW(row.volume, 33, of) }}>
        <span>{fmt(row.volume)}</span>
      </span>
    </button>
  );
}

const maxVol = (m: Market) => Math.max(1, ...m.asks.map((r) => r.volume), ...m.bids.map((r) => r.volume));

export function CompactOrderBook(props: Props) {
  const { market } = props;
  const of = maxVol(market);
  const scroller = useInitialScroll(C_CUR - 220, market.stock.id);
  return (
    <div className="cbook">
      <div className="book-scroll" ref={scroller}>
      <div className="cbook-asks">
        {market.asks.map((r) => (
          <CompactRow key={r.price} row={r} side="ask" of={of} {...props} />
        ))}
      </div>
      <button
        className="cbook-current"
        onClick={() => props.onPick(market.price)}
      >
        <span className={curTone(market)}>{fmt(market.price)}</span>
      </button>
      <div className="cbook-bids">
        {market.bids.map((r) => (
          <CompactRow key={r.price} row={r} side="bid" of={of} {...props} />
        ))}
      </div>
      </div>
      <div className="fade top" />
      <div className="fade bottom" />
    </div>
  );
}

function WideRow({ row, side, market, onPick, of }: { row: BookRow; side: 'ask' | 'bid'; of: number } & Props) {
  return (
    <button
      className={`wbook-row ${side}`}
      onClick={() => onPick(row.price)}
      aria-label={`${fmt(row.price)}원 선택`}
    >
      <span className={`vol-bar ${side}`} style={{ width: barW(row.volume, 93, of) }}>
        <span>{fmt(row.volume)}</span>
      </span>
      {row.price === market.open && <span className="quote-badge wide">시</span>}
      <span className={`wbook-price ${priceClass(row.price, market.prevClose, side)}`}>
        <span className="p">{fmt(row.price)}</span>
        <span className="r">{fmtPct(pctOf(row.price, market.prevClose))}</span>
      </span>
    </button>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'up' | 'down' }) {
  return (
    <p className="stat">
      <span>{label}</span>
      <span className={tone}>{fmt(value)}</span>
    </p>
  );
}

const snapTo = (p: number, ref: number) => {
  const t = ref < 2000 ? 1 : ref < 5000 ? 5 : ref < 20000 ? 10 : ref < 50000 ? 50 : ref < 200000 ? 100 : ref < 500000 ? 500 : 1000;
  return Math.round(p / t) * t;
};

export function WideOrderBook(props: Props) {
  const { market: m } = props;
  const askOf = Math.max(1, ...m.asks.map((r) => r.volume));
  const bidOf = Math.max(1, ...m.bids.map((r) => r.volume));
  const scroller = useInitialScroll(W_CUR - 237, m.stock.id);
  const at = (y: number) => W_CUR - 237 + y; // Figma 기준 y를 스크롤 안 좌표로
  return (
    <div className="wbook">
      <div className="book-scroll" ref={scroller}>
      <div className="wbook-content">
      <div className="wbook-asks">
        {m.asks.map((r) => (
          <WideRow key={r.price} row={r} side="ask" of={askOf} {...props} />
        ))}
      </div>
      <button
        className="wbook-current"
        onClick={() => props.onPick(m.price)}
      >
        <span className={curTone(m)}>{fmt(m.price)}</span>
      </button>
      <div className="wbook-bids">
        {m.bids.map((r) => (
          <WideRow key={r.price} row={r} side="bid" of={bidOf} {...props} />
        ))}
      </div>

      <div className="wbook-stats">
        <div className="g" style={{ top: at(27) }}>
          <Stat label="거래량" value={m.volume} />
        </div>
        <div className="g" style={{ top: at(58) }}>
          <Stat label="상한가" value={snapTo(m.prevClose * 1.3, m.prevClose)} />
          <Stat label="하한가" value={snapTo(m.prevClose * 0.7, m.prevClose)} />
        </div>
        <div className="g" style={{ top: at(110) }}>
          <Stat label="상승 VI" value={snapTo(m.prevClose * 1.1, m.prevClose)} />
          <Stat label="하락 VI" value={snapTo(m.prevClose * 0.9, m.prevClose)} />
        </div>
        <div className="g bottom" style={{ top: at(0), height: 221 }}>
          <Stat label="시작" value={m.open} />
          <Stat label="최고" value={m.high} tone="up" />
          <Stat label="최저" value={m.low} tone="down" />
        </div>
      </div>

      <div className="wbook-ticks" style={{ top: at(277) }}>
        <p className="strength">
          <span>체결강도</span>
          <span className={m.strength >= 100 ? 'up' : 'down'}>{m.strength.toFixed(2)}%</span>
        </p>
        <ul>
          {m.ticks.slice(0, 8).map((t, i) => (
            <li key={i}>
              <span>{t.price}</span>
              <span className={t.up ? 'up' : 'down'}>{fmt(t.qty)}</span>
            </li>
          ))}
        </ul>
      </div>
      </div>
      </div>
      <div className="fade top" />
      <div className="fade bottom" />
    </div>
  );
}
