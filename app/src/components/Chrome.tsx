import arrowLeft from '../assets/icons/arrow-left.svg';
import search from '../assets/icons/search.svg';
import arrowDown16 from '../assets/icons/arrow-down-16-outlined.svg';
import swap from '../assets/icons/swap.svg';
import sidePanelOn from '../assets/icons/side-panel-closed.svg';
import sbSignal from '../assets/icons/sb-signal.svg';
import sbConnection from '../assets/icons/sb-connection.svg';
import sbBattery from '../assets/icons/sb-battery.svg';
import { STOCK } from '../lib/market';

export function StatusBar() {
  return (
    <div className="status-bar" aria-hidden>
      <span className="status-time">9:41</span>
      <span className="status-icons">
        <img src={sbSignal} alt="" />
        <img src={sbConnection} alt="" />
        <img src={sbBattery} alt="" />
      </span>
    </div>
  );
}

export function HomeIndicator() {
  return (
    <div className="home-indicator" aria-hidden>
      <span />
    </div>
  );
}

export function TopAppBar() {
  return (
    <header className="top-app-bar">
      <button className="icon-btn back" aria-label="뒤로">
        <img src={arrowLeft} alt="" />
      </button>
      <button className="search-bar">
        <img src={search} alt="" />
        <span>{STOCK.name}</span>
      </button>
      <button className="outlined-dropdown">
        <span>일반주문</span>
        <img src={arrowDown16} alt="" />
      </button>
    </header>
  );
}

export function SubBar({ panelOpen, onTogglePanel }: { panelOpen: boolean; onTogglePanel: () => void }) {
  return (
    <div className="sub-bar">
      <button className="account-btn">
        <span className="account-dot" />
        <span>위탁종합 5523 - 3333</span>
        <img src={swap} alt="" />
      </button>
      <button
        className="side-panel-btn"
        aria-label={panelOpen ? '주문 패널 닫기' : '주문 패널 열기'}
        aria-pressed={panelOpen}
        onClick={onTogglePanel}
      >
        <img src={sidePanelOn} alt="" />
      </button>
    </div>
  );
}
