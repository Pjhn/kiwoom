import { useRef, useState } from 'react';
import { TickNumber } from './TickNumber';
import plus from '../assets/icons/plus.svg';
import minus from '../assets/icons/minus.svg';
import arrowDown16 from '../assets/icons/arrow-down-16.svg';
import glowBuy from '../assets/icons/glow-buy.svg';
import glowSell from '../assets/icons/glow-sell.svg';
import tipArrow from '../assets/icons/slider-tip-arrow.svg';
import { fmt } from '../lib/market';
import { isUserPriced, typeLabel, type OrderType } from '../lib/orderTypes';

export type Side = 'buy' | 'sell';

type Props = {
  side: Side;
  onSide: (s: Side) => void;
  price: number | null;
  qty: number | null;
  onPrice: (p: number | null) => void;
  onQty: (q: number | null) => void;
  onStepPrice: (dir: 1 | -1) => void;
  onStepQty: (dir: 1 | -1) => void;
  maxQty: number;
  available: string;
  onSubmit: () => void;
  orderType: OrderType;
  onOpenTypes: () => void;
  /** 주문유형이 가격을 정할 때의 가격 */
  autoPrice: number;
  /** 닫히는 중 (미끄러져 나가는 모션) */
  closing?: boolean;
};

const parseNum = (s: string) => {
  const d = s.replace(/[^0-9]/g, '');
  return d === '' ? null : Math.min(Number(d), 99_999_999);
};

function NumberField({
  value,
  unit,
  placeholder,
  onChange,
  onStep,
  label,
  disabled = false,
}: {
  disabled?: boolean;
  value: number | null;
  unit: string;
  placeholder: string;
  onChange: (v: number | null) => void;
  onStep: (dir: 1 | -1) => void;
  label: string;
}) {
  const text = value == null ? '' : fmt(value);
  return (
    <div className={`text-field ${value == null ? 'empty' : ''} ${disabled ? 'disabled' : ''}`} aria-disabled={disabled}>
      <label className="tf-value">
        <span className="tf-mirror" aria-hidden>
          {text || placeholder}
        </span>
        <input
          inputMode="numeric"
          aria-label={label}
          placeholder={placeholder}
          value={text}
          disabled={disabled}
          onChange={(e) => onChange(parseNum(e.target.value))}
        />
        {value != null && <span className="tf-unit">{unit}</span>}
      </label>
      <span className="pm-group">
        <button aria-label={`${label} 빼기`} disabled={disabled} onClick={() => onStep(-1)}>
          <img src={minus} alt="" />
        </button>
        <button aria-label={`${label} 더하기`} disabled={disabled} onClick={() => onStep(1)}>
          <img src={plus} alt="" />
        </button>
      </span>
    </div>
  );
}

function Slider({ side, pct, onPct }: { side: Side; pct: number; onPct: (p: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState(false);
  const setFrom = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    const raw = ((clientX - r.left) / r.width) * 100;
    let p = Math.max(0, Math.min(100, raw));
    for (const s of [0, 25, 50, 75, 100]) if (Math.abs(p - s) < 3) p = s;
    onPct(Math.round(p));
  };
  const empty = pct <= 0;
  return (
    <div className="slider-wrap">
      <div
        ref={ref}
        className={`slider ${side} ${empty ? 'empty' : ''}`}
        role="slider"
        aria-label="수량 비율"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        tabIndex={0}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          setDrag(true);
          setFrom(e.clientX);
        }}
        onPointerMove={(e) => drag && setFrom(e.clientX)}
        onPointerUp={() => setDrag(false)}
        onPointerCancel={() => setDrag(false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') onPct(Math.min(100, pct + 5));
          if (e.key === 'ArrowLeft') onPct(Math.max(0, pct - 5));
        }}
      >
        <span className="track" />
        <span className="fill" style={{ width: `${pct}%` }} />
        {[25, 50, 75, 100].map((d) => (
          <span key={d} className={`dot ${d <= pct ? 'hidden' : ''}`} style={{ left: `${d}%` }} />
        ))}
        <span className="thumb" style={{ left: `${pct}%` }} />
      </div>
      <div className="slider-labels">
        <span>0%</span>
        <span>100%</span>
        {!empty && (
          <span className="slider-tip" style={{ left: `clamp(20px, ${pct}%, calc(100% - 20px))` }}>
            <img src={tipArrow} alt="" />
            {pct}%
          </span>
        )}
      </div>
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <span />
    </button>
  );
}

export function OrderPanel(p: Props) {
  const [fraction, setFraction] = useState(false);
  const [margin, setMargin] = useState(false);
  const isBuy = p.side === 'buy';
  const verb = isBuy ? '구매' : '판매';
  const userPriced = isUserPriced(p.orderType);
  const price = userPriced ? p.price : p.autoPrice;
  const total = price != null && p.qty != null ? price * p.qty : 0;
  const ready = price != null && p.qty != null && p.qty > 0;
  const pct = p.maxQty > 0 && p.qty != null ? Math.min(100, Math.round((p.qty / p.maxQty) * 100)) : 0;

  const onPct = (v: number) => {
    if (p.maxQty <= 0) return;
    p.onQty(v === 0 ? null : Math.max(1, Math.floor((p.maxQty * v) / 100)));
  };

  return (
    <div className={`order-panel ${p.side} ${p.closing ? 'closing' : ''}`}>
      <div className="op-col">
        <div className="op-top">
          <div className="seg" role="tablist">
            <button role="tab" aria-selected={isBuy} className={isBuy ? 'on buy' : ''} onClick={() => p.onSide('buy')}>
              구매
            </button>
            <button role="tab" aria-selected={!isBuy} className={!isBuy ? 'on sell' : ''} onClick={() => p.onSide('sell')}>
              판매
            </button>
          </div>
          <button className="dropdown-filled" onClick={p.onOpenTypes} aria-haspopup="dialog">
            <span>{typeLabel(p.orderType)}</span>
            <img src={arrowDown16} alt="" />
          </button>
          {userPriced ? (
            <NumberField
              label={`${verb}가`}
              value={p.price}
              unit="원"
              placeholder={`${verb}가 입력`}
              onChange={p.onPrice}
              onStep={p.onStepPrice}
            />
          ) : (
            <div className="text-field locked" aria-label={`${verb}가 ${typeLabel(p.orderType)}`}>
              <span className="tf-locked">
                {p.orderType === 'market' ? '시장가로 주문' : `${fmt(p.autoPrice)} 원`}
              </span>
              <span className="tf-tag">{p.orderType === 'market' ? `약 ${fmt(p.autoPrice)} 원` : '자동'}</span>
            </div>
          )}
          <NumberField
            label="수량"
            value={p.qty}
            unit="주"
            placeholder="수량 입력"
            onChange={p.onQty}
            onStep={p.onStepQty}
            disabled={!isBuy && p.maxQty <= 0}
          />
        </div>
        <Slider side={p.side} pct={pct} onPct={onPct} />
        <div className="op-info">
          <p className="row">
            <span>{verb}가능</span>
            <span>{p.available}</span>
          </p>
          <div className="row">
            <span>소수점</span>
            <Toggle on={fraction} onChange={setFraction} label="소수점" />
          </div>
          {isBuy && (
            <div className="row">
              <span>미수거래</span>
              <Toggle on={margin} onChange={setMargin} label="미수거래" />
            </div>
          )}
        </div>
      </div>
      <div className="op-bottom">
        <div className="estimate">
          <p className="label">예상 {verb}금액</p>
          <p className="value">
            <TickNumber className="n" value={total} />
            <span className="u">원</span>
          </p>
        </div>
        <button className={`primary-btn ${p.side} ${ready ? 'ready' : ''}`} onClick={p.onSubmit}>
          <img className="glow" src={isBuy ? glowBuy : glowSell} alt="" />
          <span>{verb}하기</span>
        </button>
      </div>
    </div>
  );
}
