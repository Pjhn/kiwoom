import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HomeIndicator, StatusBar, SubBar, TopAppBar } from './components/Chrome';
import { CompactOrderBook, WideOrderBook } from './components/OrderBook';
import { IconTabs, type View } from './components/IconTabs';
import { OrderPanel, type Side } from './components/OrderPanel';
import { MultiChart } from './components/MultiChart';
import { OrderInfo, type Holding, type InfoTab, type Order } from './components/OrderInfo';
import { ConfirmSheet, SnackBar, type Snack } from './components/Overlays';
import { OrderTypeSheet } from './components/OrderTypeSheet';
import { StockPicker } from './components/StockPicker';
import { CASH, STOCKS, type Market, type Stock, bestAsk, bestBid, fmt, krxTick, stockById } from './lib/market';
import { autoPrice, isUserPriced, typeLabel, type OrderType } from './lib/orderTypes';
import { useMarket } from './lib/useMarket';

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

const initialStock = () => {
  const q = new URLSearchParams(location.search).get('stock');
  return STOCKS.find((s) => s.id === q) ?? STOCKS[0];
};

export default function App() {
  const framed = useFramed();
  const [stock, setStock] = useState<Stock>(initialStock);
  const market = useMarket(stock);
  const marketRef = useRef<Market>(market);
  marketRef.current = market;

  const [panelOpen, setPanelOpen] = useState(true);
  const [view, setView] = useState<View>('book');
  const [side, setSide] = useState<Side>('buy');
  const [price, setPrice] = useState<number | null>(null);
  const [qty, setQty] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [typesOpen, setTypesOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [priceFlash, setPriceFlash] = useState(0);

  const [open, setOpen] = useState<Order[]>([]);
  const [history, setHistory] = useState<Order[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [tab, setTab] = useState<InfoTab>('pending');
  const [glowTab, setGlowTab] = useState<InfoTab | null>(null);
  const [showTip, setShowTip] = useState(false);
  const [snack, setSnack] = useState<Snack | null>(null);
  const [leaving, setLeaving] = useState<Record<number, InfoTab>>({});
  const [catchTab, setCatchTab] = useState<{ tab: InfoTab; n: number } | null>(null);

  const FLY_MS = 600;
  /** 대기 주문을 목적지 탭으로 날려 보낸 뒤 처리한다 */
  const flyAway = useCallback((ids: number[], to: InfoTab, then: () => void) => {
    setLeaving((l) => ({ ...l, ...Object.fromEntries(ids.map((id) => [id, to])) }));
    setTimeout(() => {
      then();
      setLeaving((l) => {
        const n = { ...l };
        ids.forEach((id) => delete n[id]);
        return n;
      });
      setCatchTab((c) => ({ tab: to, n: (c?.n ?? 0) + 1 }));
    }, FLY_MS);
  }, []);

  // 종목별 마지막 가격 (보유 평가에 사용)
  const lastPrice = useRef<Record<string, number>>({});
  lastPrice.current[stock.id] = market.price;
  const priceOf = (id: string) => lastPrice.current[id] ?? stockById(id).mockPrice;

  const seq = useRef(1);
  const cancelled = useRef(new Set<number>());
  const openRef = useRef(open);
  openRef.current = open;
  const infoRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const userPriced = isUserPriced(orderType);
  const auto = autoPrice(orderType, side, market);
  const effPrice = userPriced ? price : auto;

  const holding = holdings.find((h) => h.stockId === stock.id);
  const pendingSellQty = open
    .filter((o) => o.side === 'sell' && o.stockId === stock.id)
    .reduce((s, o) => s + (o.qty - o.filled), 0);
  const sellable = Math.max(0, (holding?.qty ?? 0) - pendingSellQty);
  const maxQty = useMemo(() => {
    if (side === 'sell') return sellable;
    const p = effPrice ?? market.price;
    return p > 0 ? Math.floor(CASH / p) : 0;
  }, [side, effPrice, sellable, market.price]);

  useEffect(() => {
    if (!snack) return;
    const t = setTimeout(() => setSnack(null), 3500);
    return () => clearTimeout(t);
  }, [snack]);

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
    setShowTip(t === 'holdings' && holdings.length > 0);
  };

  const applyFill = useCallback((o: Order, delta: number) => {
    if (delta <= 0) return;
    setHoldings((list) => {
      const h = list.find((x) => x.stockId === o.stockId);
      const rest = list.filter((x) => x.stockId !== o.stockId);
      if (o.side === 'buy') {
        const q = (h?.qty ?? 0) + delta;
        const avg = ((h?.avg ?? 0) * (h?.qty ?? 0) + o.price * delta) / q;
        return [{ stockId: o.stockId, qty: q, avg: Math.round(avg) }, ...rest];
      }
      if (!h) return list;
      const q = h.qty - delta;
      return q > 0 ? list.map((x) => (x.stockId === o.stockId ? { ...x, qty: q } : x)) : rest;
    });
  }, []);

  const fillTo = useCallback(
    (id: number, filled: number) => {
      const o = openRef.current.find((x) => x.id === id);
      if (!o || cancelled.current.has(id)) return;
      const target = Math.min(o.qty, filled);
      applyFill(o, target - o.filled);
      const name = stockById(o.stockId).name;
      const verb = o.side === 'buy' ? '구매' : '판매';
      if (target >= o.qty) {
        flyAway([id], o.side === 'buy' ? 'holdings' : 'history', () => {
          setOpen((list) => list.filter((x) => x.id !== id));
          setHistory((h) => [{ ...o, filled: o.qty, status: 'filled', time: now(), isNew: false }, ...h]);
        });
        if (o.side === 'buy') {
          setGlowTab('holdings');
          toast(`${name} ${verb}가 완료됐어요`, '보유 확인', () => {
            setSnack(null);
            setTab('holdings');
            setGlowTab(null);
            setShowTip(true);
            scrollToInfo();
          });
        } else {
          setGlowTab('history');
          toast(`${name} ${verb}가 완료됐어요`, '내역 보기', () => {
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
    [applyFill, toast, flyAway],
  );

  const submit = () => {
    if (effPrice == null) {
      document.querySelector<HTMLInputElement>('.order-panel input')?.focus();
      return;
    }
    if (qty == null || qty <= 0) {
      const inputs = document.querySelectorAll<HTMLInputElement>('.order-panel input');
      inputs[inputs.length - 1]?.focus();
      return;
    }
    if (qty > maxQty) {
      setQty(maxQty > 0 ? maxQty : null);
      toast(side === 'buy' ? '구매가능 금액에 맞춰 수량을 줄였어요' : `판매가능 수량은 ${maxQty}주예요`, '확인', () => setSnack(null));
      return;
    }
    setConfirming(true);
  };

  // 체결 흉내: 주문 가격이 상대 호가에 닿았는지 시세가 바뀔 때마다 본다
  const tryFill = useCallback(
    (o: Order) => {
      const m = marketRef.current;
      if (m.stock.id !== o.stockId) return false;
      return o.side === 'buy' ? o.price >= bestAsk(m) : o.price <= bestBid(m);
    },
    [],
  );

  const scheduleFill = (o: Order) => {
    if (o.qty > 1) setTimeout(() => fillTo(o.id, Math.ceil(o.qty * 0.7)), 2500);
    setTimeout(() => fillTo(o.id, o.qty), 5000);
  };

  // 대기 주문이 나중에 시세에 닿으면 체결
  const filling = useRef(new Set<number>());
  useEffect(() => {
    for (const o of open) {
      if (filling.current.has(o.id)) continue;
      if (tryFill(o)) {
        filling.current.add(o.id);
        scheduleFill(o);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market, open]);

  const confirm = () => {
    if (effPrice == null || qty == null) return;
    const id = seq.current++;
    const order: Order = {
      id,
      stockId: stock.id,
      side,
      price: effPrice,
      qty,
      filled: 0,
      status: 'pending',
      time: now(),
      isNew: true,
    };
    setOpen((l) => [order, ...l]);
    setConfirming(false);
    setTab('pending');
    setShowTip(false);
    const verb = side === 'buy' ? '구매' : '판매';
    toast(`${stock.name} ${verb} 주문을 접수했어요`, '대기 보기', () => {
      setSnack(null);
      setTab('pending');
      scrollToInfo();
    });
    setTimeout(() => setOpen((l) => l.map((x) => (x.id === id ? { ...x, isNew: false } : x))), 3000);
  };

  const cancel = (id: number) => {
    const o = open.find((x) => x.id === id);
    if (!o || leaving[id]) return;
    cancelled.current.add(id); // 날아가는 동안 체결되지 않게
    flyAway([id], 'history', () => {
      setOpen((l) => l.filter((x) => x.id !== id));
      setHistory((h) => [{ ...o, status: 'cancelled', time: now(), isNew: false }, ...h]);
    });
  };
  const cancelAll = () => {
    const list = open.filter((o) => !leaving[o.id]);
    list.forEach((o) => cancelled.current.add(o.id));
    flyAway(
      list.map((o) => o.id),
      'history',
      () => {
        const ids = new Set(list.map((o) => o.id));
        setHistory((h) => [...list.map((o) => ({ ...o, status: 'cancelled' as const, time: now(), isNew: false })), ...h]);
        setOpen((l) => l.filter((o) => !ids.has(o.id)));
      },
    );
  };

  const pickPrice = (p: number) => {
    setPrice(p);
    setPriceFlash((n) => n + 1);
    if (!isUserPriced(orderType)) setOrderType('limit');
    if (!panelOpen) setPanelOpen(true);
  };

  const changeStock = (s: Stock) => {
    setPickerOpen(false);
    if (s.id === stock.id) return;
    setStock(s);
    setPrice(null);
    setQty(null);
  };

  const onHolding = (stockId: string) => {
    setShowTip(false);
    const h = holdings.find((x) => x.stockId === stockId);
    if (stockId !== stock.id) {
      setStock(stockById(stockId));
      setPrice(null);
    }
    setSide('sell');
    setPanelOpen(true);
    const pendingSell = open
      .filter((o) => o.side === 'sell' && o.stockId === stockId)
      .reduce((s, o) => s + (o.qty - o.filled), 0);
    const can = Math.max(0, (h?.qty ?? 0) - pendingSell);
    if (stockId === stock.id && price == null) setPrice(market.price);
    if (stockId !== stock.id) setPrice(priceOf(stockId));
    setQty(can > 0 ? can : null);
    scrollerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const changeSide = (s: Side) => {
    if (s === side) return;
    setSide(s);
    setQty(null);
  };

  const stepPrice = (d: 1 | -1) =>
    setPrice((p) => {
      if (p == null) return market.price;
      const t = krxTick(d > 0 ? p : p - 1);
      return Math.max(t, p + d * t);
    });
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
          <TopAppBar name={stock.name} live={market.live} onSearch={() => setPickerOpen(true)} />
          <SubBar panelOpen={panelOpen} onTogglePanel={() => setPanelOpen((v) => !v)} />
          <section className="trade">
            {view === 'chart' ? (
              <MultiChart main={stock} />
            ) : panelOpen ? (
              <CompactOrderBook market={market} onPick={pickPrice} />
            ) : (
              <WideOrderBook market={market} onPick={pickPrice} />
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
                orderType={orderType}
                onOpenTypes={() => setTypesOpen(true)}
                autoPrice={auto}
                priceFlash={priceFlash}
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
              holdings={holdings}
              priceOf={priceOf}
              currentStockId={stock.id}
              showTip={showTip}
              onCancel={cancel}
              onCancelAll={cancelAll}
              onHolding={onHolding}
              leaving={leaving}
              catchTab={catchTab}
            />
          </div>
        </div>
        {framed && <HomeIndicator />}
        {snack && <SnackBar snack={snack} />}
        {confirming && effPrice != null && qty != null && (
          <ConfirmSheet
            stock={stock}
            side={side}
            price={effPrice}
            qty={qty}
            typeName={typeLabel(orderType)}
            onCancel={() => setConfirming(false)}
            onConfirm={confirm}
          />
        )}
        {typesOpen && (
          <OrderTypeSheet
            value={orderType}
            onClose={() => setTypesOpen(false)}
            onSelect={(t) => {
              setOrderType(t);
              setTypesOpen(false);
            }}
          />
        )}
        {pickerOpen && <StockPicker current={stock} onPick={changeStock} onClose={() => setPickerOpen(false)} />}
      </div>
    </div>
  );
}
