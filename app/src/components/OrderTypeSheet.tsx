import check from '../assets/icons/check-magenta-24.svg';
import { ORDER_TYPES, type OrderType } from '../lib/orderTypes';

export function OrderTypeSheet({
  value,
  onSelect,
  onClose,
}: {
  value: OrderType;
  onSelect: (t: OrderType) => void;
  onClose: () => void;
}) {
  const group = (g: 'basic' | 'detail') =>
    ORDER_TYPES.filter((o) => o.group === g).map((o) => {
      const on = o.key === value;
      return (
        <button key={o.key} className={`ot-item ${on ? 'on' : ''}`} onClick={() => onSelect(o.key)} aria-pressed={on}>
          {on && <img src={check} alt="" width={24} height={24} />}
          <span className="ot-text">
            <span className="ot-title">{o.label}</span>
            <span className="ot-desc">
              {o.desc.map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </span>
          </span>
        </button>
      );
    });
  return (
    <div className="sheet-layer">
      <div className="dim ot-dim" onClick={onClose} />
      <div className="sheet ot-sheet" role="dialog" aria-modal="true" aria-label="주문 유형">
        <span className="handle" />
        <div className="ot-col">
          <div className="ot-group">
            <p className="ot-head">일반주문</p>
            {group('basic')}
          </div>
          <div className="ot-divider" />
          <div className="ot-group">
            <p className="ot-head">상세주문</p>
            {group('detail')}
          </div>
        </div>
      </div>
    </div>
  );
}
