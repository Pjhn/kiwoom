import { STOCKS, type Stock } from '../lib/market';
import { StockLogo } from './StockLogo';

export function StockPicker({ current, onPick, onClose }: { current: Stock; onPick: (s: Stock) => void; onClose: () => void }) {
  return (
    <div className="sheet-layer">
      <div className="dim ot-dim" onClick={onClose} />
      <div className="sheet ot-sheet picker" role="dialog" aria-modal="true" aria-label="종목 선택">
        <span className="handle" />
        <p className="ot-head">종목</p>
        <ul className="picker-list">
          {STOCKS.map((s) => (
            <li key={s.id}>
              <button className={s.id === current.id ? 'on' : ''} onClick={() => onPick(s)}>
                <StockLogo stock={s} size={46} />
                <span className="pk-name">{s.name}</span>
                {s.binance ? <span className="pk-tag live">실시간</span> : <span className="pk-tag">모의</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
