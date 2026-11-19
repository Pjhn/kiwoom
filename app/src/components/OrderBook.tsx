import { ASKS, BIDS, CURRENT_PRICE, PREV_CLOSE, TICKS, fmt, fmtPct, pctOf, type BookRow } from '../lib/market';

const OPEN_PRICE = 31700;
const maxVol = Math.max(...ASKS.map((r) => r.volume), ...BIDS.map((r) => r.volume));
const barW = (v: number, max: number, of = maxVol) => Math.max(2, Math.round(max * Math.sqrt(v / of)));
const askMax = Math.max(...ASKS.map((r) => r.volume));
const bidMax = Math.max(...BIDS.map((r) => r.volume));

type Props = { selected: number | null; onPick: (price: number) => void };

function priceClass(price: number, side: 'ask' | 'bid') {
  if (price < PREV_CLOSE) return 'down';
  return side === 'ask' ? 'up-ask' : 'up-bid';
}

function CompactRow({ row, side, selected, onPick }: { row: BookRow; side: 'ask' | 'bid' } & Props) {
  return (
    <button
      className={`cbook-row ${side} ${selected === row.price ? 'sel' : ''}`}
      onClick={() => onPick(row.price)}
      aria-label={`${fmt(row.price)}원 선택`}
    >
      <span className="cbook-left">
        <span className="cbook-slot">{row.price === OPEN_PRICE && <span className="quote-badge">시</span>}</span>
        <span className={`cbook-price ${priceClass(row.price, side)}`}>
          <span className="p">{fmt(row.price)}</span>
          <span className="r">{fmtPct(pctOf(row.price))}</span>
        </span>
      </span>
      <span className={`vol-bar ${side}`} style={{ width: barW(row.volume, 33) }}>
        <span>{fmt(row.volume)}</span>
      </span>
    </button>
  );
}

export function CompactOrderBook(props: Props) {
  return (
    <div className="cbook">
      <div className="cbook-asks">
        {ASKS.map((r) => (
          <CompactRow key={r.price} row={r} side="ask" {...props} />
        ))}
      </div>
      <button className="cbook-current" onClick={() => props.onPick(CURRENT_PRICE)}>
        <span className="grad-price">{fmt(CURRENT_PRICE)}</span>
      </button>
      <div className="cbook-bids">
        {BIDS.map((r) => (
          <CompactRow key={r.price} row={r} side="bid" {...props} />
        ))}
      </div>
      <div className="fade top" />
      <div className="fade bottom" />
    </div>
  );
}

function WideRow({ row, side, selected, onPick }: { row: BookRow; side: 'ask' | 'bid' } & Props) {
  return (
    <button
      className={`wbook-row ${side} ${selected === row.price ? 'sel' : ''}`}
      onClick={() => onPick(row.price)}
      aria-label={`${fmt(row.price)}원 선택`}
    >
      <span className={`vol-bar ${side}`} style={{ width: barW(row.volume, 93, side === 'ask' ? askMax : bidMax) }}>
        <span>{fmt(row.volume)}</span>
      </span>
      {row.price === OPEN_PRICE && <span className="quote-badge wide">시</span>}
      <span className={`wbook-price ${priceClass(row.price, side)}`}>
        <span className="p">{fmt(row.price)}</span>
        <span className="r">{fmtPct(pctOf(row.price))}</span>
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

export function WideOrderBook(props: Props) {
  return (
    <div className="wbook">
      <div className="wbook-asks">
        {ASKS.map((r) => (
          <WideRow key={r.price} row={r} side="ask" {...props} />
        ))}
      </div>
      <button className="wbook-current" onClick={() => props.onPick(CURRENT_PRICE)}>
        <span className="grad-price">{fmt(CURRENT_PRICE)}</span>
      </button>
      <div className="wbook-bids">
        {BIDS.map((r) => (
          <WideRow key={r.price} row={r} side="bid" {...props} />
        ))}
      </div>

      <div className="wbook-stats">
        <div className="g" style={{ top: 27 }}>
          <Stat label="거래량" value={1_102_100} />
        </div>
        <div className="g" style={{ top: 58 }}>
          <Stat label="상한가" value={40_100} />
          <Stat label="하한가" value={23_100} />
        </div>
        <div className="g" style={{ top: 110 }}>
          <Stat label="상승 VI" value={34_700} />
          <Stat label="하락 VI" value={29_600} />
        </div>
        <div className="g bottom">
          <Stat label="시작" value={OPEN_PRICE} />
          <Stat label="최고" value={31_900} tone="up" />
          <Stat label="최저" value={30_700} tone="down" />
        </div>
      </div>

      <div className="wbook-ticks">
        <p className="strength">
          <span>체결강도</span>
          <span className="up">109.02%</span>
        </p>
        <ul>
          {TICKS.map((t, i) => (
            <li key={i}>
              <span>{t.price}</span>
              <span className={t.up ? 'up' : 'down'}>{fmt(t.qty)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="fade top" />
      <div className="fade bottom" />
    </div>
  );
}
