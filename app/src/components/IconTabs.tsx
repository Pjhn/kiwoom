import barsOn from '../assets/icons/icon-bars-on.svg';
import barsOff from '../assets/icons/icon-bars-off.svg';
import chartOn from '../assets/icons/icon-chart-on.svg';
import chartOff from '../assets/icons/icon-chart-off.svg';

import type { CSSProperties } from 'react';

export type View = 'book' | 'chart';

export function IconTabs({ view, onChange, style }: { view: View; onChange: (v: View) => void; style?: CSSProperties }) {
  return (
    <div className="icon-tabs" style={style} role="tablist">
      <button role="tab" aria-selected={view === 'book'} aria-label="호가" className={view === 'book' ? 'on' : ''} onClick={() => onChange('book')}>
        <img src={view === 'book' ? barsOn : barsOff} alt="" />
      </button>
      <button role="tab" aria-selected={view === 'chart'} aria-label="차트" className={view === 'chart' ? 'on' : ''} onClick={() => onChange('chart')}>
        <img src={view === 'chart' ? chartOn : chartOff} alt="" />
      </button>
    </div>
  );
}
