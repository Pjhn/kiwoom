import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HomeIndicator, StatusBar, SubBar, TopAppBar } from './components/Chrome';
import { CompactOrderBook, WideOrderBook } from './components/OrderBook';
import { IconTabs, type View } from './components/IconTabs';
import { OrderPanel, type Side } from './components/OrderPanel';
import { MultiChart } from './components/MultiChart';
import { OrderInfo, type Holding, type InfoTab, type Order } from './components/OrderInfo';
import { ConfirmSheet, SnackBar, type Snack } from './components/Overlays';
import { ASKS, BIDS, CASH, CURRENT_PRICE, STOCK, TICK, fmt } from './lib/market';

const BEST_ASK = Math.min(...ASKS.map((r) => r.price));
const BEST_BID = Math.max(...BIDS.map((r) => r.price));

function useFramed() {
  const q = new URLSearchParams(location.search).get('frame');
  const [wide, setWide] = useState(() => window.innerWidth >= 500);
  useEffect(() => {
    const on = () => setWide(window.innerWidth >= 500);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  if (q === '1') return true;
  if (q === '0') return false;
  return wide;
}

const now = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function App() {
  const framed = useFramed();
  const [panelOpen, setPanelOpen] = useState(true);
  const [view, setView] = useState<View>('book');
  const [side, setSide] = useState<Side>('buy');
  const [price, setPrice] = useState<number | null>(null);
  const [qty, setQty] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);

  const [open, setOpen] = useState<Order[]>([]);
  const [history, setHistory] = useState<Order[]>([]);
  const [holding, setHolding] = useState<Holding | null>(null);
  const [tab, setTab] = useState<InfoTab>('pending');
  const [glowTab, setGlowTab] = useState<InfoTab | null>(null);
  const [showTip, setShowTip] = useState(false);
  const [snack, setSnack] = useState<Snack | null>(null);

  const seq = useRef(1);
  const openRef = useRef(open);
  openRef.current = open;
  const infoRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const pendingSellQty = open.filter((o) => o.side === 'sell').reduce((s, o) => s + (o.qty - o.filled), 0);
  const sellable = Math.max(0, (holding?.qty ?? 0) - pendingSellQty);
  const maxQty = useMemo(() => {
    if (side === 'sell') return sellable;
    const p = price ?? CURRENT_PRICE;
    return p > 0 ? Math.floor(CASH / p) : 0;
  }, [side, price, sellable]);

  // 스낵바 자동 닫기
  useEffect(() => {
    if (!snack) return;
    const t = setTimeout(() => setSnack(null), 3500);
    return () => clearTimeout(t);
  }, [snack]);

  // 툴팁 자동 닫기
  useEffect(() => {
    if (!showTip) return;
    const t = setTimeout(() => setShowTip(false), 5000);
    return () => clearTimeout(t);
  }, [showTip]);

  const toast = useCallback((text: string, action: string, onAction: () => void) => {
    setSnack({ id: seq.current++, text, action, onAction });
  }, []);

  const scrollToInfo = () => {
    const s = scrollerRef.current;
    const el = infoRef.current;
    if (s && el && el.offsetTop + el.offsetHeight > s.scrollTop + s.clientHeight) {
      s.scrollTo({ top: el.offsetTop - 120, behavior: 'smooth' });
    }
  };

  const goTab = (t: InfoTab) => {
    setTab(t);
    if (glowTab === t) setGlowTab(null);
    if (t === 'holdings' && holding) setShowTip(true);
    if (t !== 'holdings') setShowTip(false);
  };

  // 체결 처리: 보유 수량과 평균가 반영
  const applyFill = useCallback((o: Order, delta: number) => {
    if (delta <= 0) return;
    setHolding((h) => {
      if (o.side === 'buy') {
        const q = (h?.qty ?? 0) + delta;
        const avg = ((h?.avg ?? 0) * (h?.qty ?? 0) + o.price * delta) / q;
        return { qty: q, avg: Math.round(avg) };
      }
      if (!h) return h;
      const q = h.qty - delta;
      return q > 0 ? { qty: q, avg: h.avg } : null;
    });
  }, []);

  const fillTo = useCallback(
    (id: number, filled: number) => {
      const o = openRef.current.find((x) => x.id === id);
      if (!o) return; // 이미 취소됨
      const target = Math.min(o.qty, filled);
      applyFill(o, target - o.filled);
      const verb = o.side === 'buy' ? '구매' : '판매';
      if (target >= o.qty) {
        setOpen((list) => list.filter((x) => x.id !== id));
        setHistory((h) => [{ ...o, filled: o.qty, status: 'filled', time: now(), isNew: false }, ...h]);
        if (o.side === 'buy') {
          setGlowTab('holdings');
          toast(`${STOCK.name} ${verb}가 완료됐어요`, '보유 확인', () => {
            setSnack(null);
            setTab('holdings');
            setGlowTab(null);
            setShowTip(true);
            scrollToInfo();
          });
        } else {
          setGlowTab('history');
          toast(`${STOCK.name} ${verb}가 완료됐어요`, '내역 보기', () => {
            setSnack(null);
            setTab('history');
            setGlowTab(null);
            scrollToInfo();
          });
        }
      } else {
        setOpen((list) => list.map((x) => (x.id === id ? { ...x, filled: target, status: 'partial' } : x)));
      }
    },
    [applyFill, toast],
  );

  const submit = () => {
    if (price == null) {
      document.querySelector<HTMLInputElement>('.order-panel input')?.focus();
      return;
    }
    if (qty == null || qty <= 0) {
      document.querySelectorAll<HTMLInputElement>('.order-panel input')[1]?.focus();
      return;
    }
    if (qty > maxQty) {
      setQty(maxQty > 0 ? maxQty : null);
      toast(side === 'buy' ? '구매가능 금액에 맞춰 수량을 줄였어요' : `판매가능 수량은 ${maxQty}주예요`, '확인', () => setSnack(null));
      return;
    }
    setConfirming(true);
  };

  const confirm = () => {
    if (price == null || qty == null) return;
    const id = seq.current++;
    const order: Order = { id, side, price, qty, filled: 0, status: 'pending', time: now(), isNew: true };
    setOpen((l) => [order, ...l]);
    setConfirming(false);
    setTab('pending');
    setShowTip(false);
    const verb = side === 'buy' ? '구매' : '판매';
    toast(`${STOCK.name} ${verb} 주문을 접수했어요`, '대기 보기', () => {
      setSnack(null);
      setTab('pending');
      scrollToInfo();
    });
    setTimeout(() => setOpen((l) => l.map((x) => (x.id === id ? { ...x, isNew: false } : x))), 3000);

    // 시장가에 닿는 주문만 체결을 흉내낸다 (구매: 매도1호가 이상, 판매: 매수1호가 이하)
    const marketable = side === 'buy' ? price >= BEST_ASK : price <= BEST_BID;
    if (marketable) {
      if (qty > 1) setTimeout(() => fillTo(id, Math.ceil(qty * 0.7)), 2500);
      setTimeout(() => fillTo(id, qty), 5000);
    }
  };

  const cancel = (id: number) => {
    const o = open.find((x) => x.id === id);
    if (!o) return;
    setOpen((l) => l.filter((x) => x.id !== id));
    setHistory((h) => [{ ...o, status: 'cancelled', time: now(), isNew: false }, ...h]);
  };
  const cancelAll = () => {
    setHistory((h) => [...open.map((o) => ({ ...o, status: 'cancelled' as const, time: now(), isNew: false })), ...h]);
    setOpen([]);
  };

  const pickPrice = (p: number) => {
    setPrice(p);
    if (!panelOpen) setPanelOpen(true);
  };

  const onHolding = () => {
    setShowTip(false);
    setSide('sell');
    setPanelOpen(true);
    if (price == null) setPrice(CURRENT_PRICE);
    setQty(sellable > 0 ? sellable : null);
    scrollerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const changeSide = (s: Side) => {
    if (s === side) return;
    setSide(s);
    setQty(null);
  };

  const stepPrice = (d: 1 | -1) => setPrice((p) => Math.max(TICK, (p ?? CURRENT_PRICE) + (p == null ? 0 : d * TICK)));
  const stepQty = (d: 1 | -1) => setQty((q) => (q == null ? (d > 0 ? 1 : null) : q + d <= 0 ? null : q + d));

  const iconPos =
    view === 'chart'
      ? { left: 16, top: 48 }
      : panelOpen
        ? { left: 'calc((100% - 236px) / 2 - 38px)', top: 15 }
        : { left: 19, top: 6 };

  return (
    <div className={`app ${framed ? 'framed' : ''}`}>
      <div className="device">
        {framed && <StatusBar />}
        <div className="scroller" ref={scrollerRef}>
          <TopAppBar />
          <SubBar panelOpen={panelOpen} onTogglePanel={() => setPanelOpen((v) => !v)} />
          <section className="trade">
            {view === 'chart' ? (
              <MultiChart />
            ) : panelOpen ? (
              <CompactOrderBook selected={price} onPick={pickPrice} />
            ) : (
              <WideOrderBook selected={price} onPick={pickPrice} />
            )}
            {panelOpen && (
              <OrderPanel
                side={side}
                onSide={changeSide}
                price={price}
                qty={qty}
                onPrice={setPrice}
                onQty={setQty}
                onStepPrice={stepPrice}
                onStepQty={stepQty}
                maxQty={maxQty}
                available={side === 'buy' ? `${fmt(CASH)} 원` : `${sellable} 주`}
                onSubmit={submit}
              />
            )}
            <IconTabs view={view} onChange={setView} style={iconPos} />
          </section>
          <div ref={infoRef}>
            <OrderInfo
              tab={tab}
              onTab={goTab}
              glowTab={glowTab}
              open={open}
              history={history}
              holding={holding}
              showTip={showTip}
              onCancel={cancel}
              onCancelAll={cancelAll}
              onHolding={onHolding}
            />
          </div>
        </div>
        {framed && <HomeIndicator />}
        {snack && <SnackBar snack={snack} />}
        {confirming && price != null && qty != null && (
          <ConfirmSheet side={side} price={price} qty={qty} onCancel={() => setConfirming(false)} onConfirm={confirm} />
        )}
      </div>
    </div>
  );
}
