import { setChartZoom } from './lib/zoomFix';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HomeIndicator, StatusBar, SubBar, TopAppBar } from './components/Chrome';
import { CompactOrderBook, WideOrderBook } from './components/OrderBook';
import { IconTabs, type View } from './components/IconTabs';
import { OrderPanel, type Side } from './components/OrderPanel';
import { MultiChart } from './components/MultiChart';
import { OrderInfo, type Holding, type InfoTab, type Order } from './components/OrderInfo';
import { ConfirmSheet, SnackBar, type Snack, type SnackTone } from './components/Overlays';
import { OrderTypeSheet } from './components/OrderTypeSheet';
import { StockPicker } from './components/StockPicker';
import { CASH, STOCKS, type Market, type Stock, bestAsk, bestBid, fmt, krxTick, stockById } from './lib/market';
import { autoPrice, isUserPriced, typeLabel, type OrderType } from './lib/orderTypes';
import { useMarket } from './lib/useMarket';
import { UtBar, UtFeedback, UtLayer } from './ut/UtLayer';
import { useUt, type PriceSrc } from './ut/useUt';

/**
 * 넓은 화면: 아이폰 13 미니 목업(375 x 812) 안에 띄우고, 창이 낮으면 비율 그대로 통째로 줄인다 ('mock').
 * 문서 전체(html)에 zoom 을 걸어야 차트의 터치 좌표가 어긋나지 않는다.
 * ?frame=1: Figma 대조용 375 x 창 높이 평면 프레임 ('flat'), ?frame=0: 프레임 없음.
 */
type FrameMode = 'mock' | 'flat' | false;
const PHONE_H = 812 + 11 * 2 + 4 * 2; // 화면 + 베젤 + 금속 테
const DESIGN_W = 375;
function useFrame(): { mode: FrameMode; viewH: number } {
  const q = new URLSearchParams(location.search).get('frame');
  const read = () => ({ wide: window.innerWidth >= 500, w: window.innerWidth, h: window.innerHeight });
  const [win, setWin] = useState(read);
  useEffect(() => {
    const on = () => setWin(read());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const mode: FrameMode = q === '1' ? 'flat' : q === '0' ? false : win.wide ? 'mock' : false;
  // 폰에서는 시안 폭(375)을 기기 폭에 맞춰 통째로 늘이거나 줄인다. 갤럭시(360 등)에서 호가가 잘리지 않게
  const scale =
    mode === 'mock' ? Math.min(1, (win.h - 32) / PHONE_H) : mode === false && q !== '0' ? win.w / DESIGN_W : 1;
  useEffect(() => {
    const root = document.documentElement.style as CSSStyleDeclaration & { zoom: string };
    root.zoom = scale !== 1 ? String(scale) : '';
    setChartZoom(scale);
    return () => {
      root.zoom = '';
      setChartZoom(1);
    };
  }, [scale]);
  return { mode, viewH: win.h / scale };
}

const now = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const initialStock = () => {
  const q = new URLSearchParams(location.search).get('stock');
  return STOCKS.find((s) => s.id === q) ?? stockById('hyundai'); // 기본 종목: 현대차
};

export default function App() {
  const { mode: frameMode, viewH } = useFrame();
  const framed = frameMode !== false;
  const [stock, setStock] = useState<Stock>(initialStock);
  const market = useMarket(stock);
  const marketRef = useRef<Market>(market);
  marketRef.current = market;

  const [panelOpen, setPanelOpenRaw] = useState(true);
  // 닫힐 때 미끄러져 나가는 모션이 끝날 때까지 패널을 남겨 둔다
  const [panelShown, setPanelShown] = useState(true);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const setPanelOpen = (next: boolean | ((v: boolean) => boolean)) => {
    setPanelOpenRaw((cur) => {
      const v = typeof next === 'function' ? next(cur) : next;
      clearTimeout(closeTimer.current);
      if (v) setPanelShown(true);
      else closeTimer.current = setTimeout(() => setPanelShown(false), 260);
      return v;
    });
  };
  const [view, setView] = useState<View>('book');
  const viewRef = useRef(view);
  viewRef.current = view;
  const [side, setSide] = useState<Side>('buy');
  const [price, setPrice] = useState<number | null>(null);
  const [qty, setQty] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [typesOpen, setTypesOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  /** UT 기록용: 주문 가격을 마지막으로 어디서 정했는지 */
  const priceSrc = useRef<PriceSrc>('D');

  const [open, setOpen] = useState<Order[]>([]);
  const [history, setHistory] = useState<Order[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [tab, setTab] = useState<InfoTab>('pending');
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const [glowTab, setGlowTab] = useState<InfoTab | null>(null);
  // 바로 체결되어 보유(판매는 내역)에 새로 들어간 항목: 잠시 빛나고, 시간이 지나거나 탭을 떠나면 꺼진다
  const [fresh, setFresh] = useState<{ tab: InfoTab; key: string } | null>(null);
  const freshTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
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

  const holdingsRef = useRef(holdings);
  holdingsRef.current = holdings;
  const historyRef = useRef(history);
  historyRef.current = history;
  const ut = useUt({
    holdingQty: (id) => holdingsRef.current.find((h) => h.stockId === id)?.qty ?? 0,
    chartOpen: () => viewRef.current === 'chart',
    prepare: (m) => {
      setSnack(null);
      if (m === 2 && !holdingsRef.current.some((h) => h.stockId === 'hyundai')) {
        // 미션 1을 건너뛰었거나 아직 체결 전이면 판매할 주식 10주를 넣어 둔다
        const p = marketRef.current.stock.id === 'hyundai' ? marketRef.current.price : priceOf('hyundai');
        const h = { stockId: 'hyundai', qty: 10, avg: p };
        holdingsRef.current = [h, ...holdingsRef.current];
        setHoldings((l) => [h, ...l.filter((x) => x.stockId !== 'hyundai')]);
      }
      if (m === 4) {
        // 내역 탭을 직접 찾아가게 대기 탭에서 시작한다
        setTab('pending');
        setGlowTab(null);
        setFresh(null);
        // 오늘 판 주식: 대기 중인 판매는 그 가격에 체결된 것으로 하고, 판 적이 없으면 한 건 넣어 둔다
        const sells = openRef.current.filter((o) => o.side === 'sell');
        const ids = new Set(sells.map((o) => o.id));
        sells.forEach((o) => {
          cancelled.current.add(o.id);
          applyFill(o, o.qty - o.filled);
        });
        const filled = sells.map((o) => ({ ...o, filled: o.qty, status: 'filled' as const, time: now(), at: Date.now(), isNew: false }));
        const hadSell = historyRef.current.some((o) => o.side === 'sell' && o.status === 'filled') || filled.length > 0;
        const seed: Order[] = hadSell
          ? []
          : [{ id: seq.current++, stockId: 'hyundai', side: 'sell', price: priceOf('hyundai'), qty: 5, filled: 5, status: 'filled', time: now(), at: Date.now(), isNew: false }];
        const add = [...filled, ...seed];
        historyRef.current = [...add, ...historyRef.current];
        if (sells.length) setOpen((l) => l.filter((o) => !ids.has(o.id)));
        if (add.length) setHistory((h) => [...add, ...h]);
      }
    },
  });
  // UT 미션 3: 차트 보기를 연 적이 있는지 기록
  useEffect(() => {
    if (view === 'chart') ut.sawChart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const userPriced = isUserPriced(orderType);
  const auto = autoPrice(orderType, side, market);
  const effPrice = userPriced ? price : auto;

  // 가격 정해서 주문(지정가) 기본값은 현재가. 실시간 시세가 늦게 오면, 사용자가 손대지 않은 한 그 값으로 다시 맞춘다
  const seededPrice = useRef<number | null>(null);
  useEffect(() => {
    if (market.stock.id !== stock.id) return;
    setPrice((p) => {
      if (p != null && p !== seededPrice.current) return p;
      seededPrice.current = market.price;
      return market.price;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stock.id, market.stock.id, market.live]);

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

  /** 새로 들어온 항목을 잠시 빛낸다 (보유 항목이면 「터치하여 판매할 수 있어요」 툴팁도 같은 조건) */
  const markFresh = (tab: InfoTab, key: string) => {
    setFresh({ tab, key });
    clearTimeout(freshTimer.current);
    freshTimer.current = setTimeout(() => setFresh(null), 4000);
  };

  const toast = useCallback((text: string, action: string, onAction: () => void, name?: string, tone?: SnackTone) => {
    setSnack({ id: seq.current++, text, action, onAction, name, tone });
  }, []);

  const scrollToInfo = () => {
    const s = scrollerRef.current;
    const el = infoRef.current;
    if (s && el && el.offsetTop + el.offsetHeight > s.scrollTop + s.clientHeight) {
      s.scrollTo({ top: el.offsetTop - 120, behavior: 'smooth' });
    }
  };

  const goTab = (t: InfoTab) => {
    if (t === 'history') ut.sawHistory('T');
    setTab(t);
    if (glowTab === t) setGlowTab(null);
    if (fresh && fresh.tab !== t) setFresh(null);
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

  /** 체결 완료 알림: 구매는 보유, 판매는 내역으로 안내 */
  const announceDone = useCallback(
    (o: Order, immediate = false) => {
      const name = stockById(o.stockId).name;
      const verb = o.side === 'buy' ? '구매' : '판매';
      const to: InfoTab = o.side === 'buy' ? 'holdings' : 'history';
      // 바로 체결이면 이미 그 탭을 보고 있으므로 탭을 빛내지 않는다
      if (!immediate && tabRef.current !== to) setGlowTab(to);
      toast(
        `${verb}가 완료됐어요`,
        o.side === 'buy' ? '보유 확인' : '내역 보기',
        () => {
          setSnack(null);
          if (to === 'history') ut.sawHistory('S');
          setTab(to);
          setGlowTab(null);
          markFresh(to, to === 'holdings' ? o.stockId : String(o.id));
          scrollToInfo();
        },
        name,
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toast],
  );

  const fillTo = useCallback(
    (id: number, filled: number) => {
      const o = openRef.current.find((x) => x.id === id);
      if (!o || cancelled.current.has(id)) return;
      const target = Math.min(o.qty, filled);
      applyFill(o, target - o.filled);
      if (target >= o.qty) {
        flyAway([id], o.side === 'buy' ? 'holdings' : 'history', () => {
          setOpen((list) => list.filter((x) => x.id !== id));
          setHistory((h) => [{ ...o, filled: o.qty, status: 'filled', time: now(), at: Date.now(), isNew: false }, ...h]);
        });
        announceDone(o);
      } else {
        setOpen((list) => list.map((x) => (x.id === id ? { ...x, filled: target, status: 'partial' } : x)));
      }
    },
    [applyFill, announceDone, flyAway],
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
      toast(side === 'buy' ? '구매가능 금액에 맞춰 수량을 줄였어요' : `판매가능 수량은 ${maxQty}주예요`, '확인', () => setSnack(null), undefined, 'warning');
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
      time: now(), at: Date.now(),
      isNew: true,
    };
    setConfirming(false);
    ut.order({ side, stockId: stock.id, qty, price: effPrice, type: orderType, src: userPriced ? priceSrc.current : 'D', view });
    const verb = side === 'buy' ? '구매' : '판매';

    // 바로 체결될 수 있는 가격이면 상대 호가 물량만큼 그 자리에서 체결한다
    const levels = side === 'buy' ? [...market.asks].reverse() : market.bids; // 유리한 호가부터
    let got = 0;
    let cost = 0;
    for (const lv of levels) {
      if (side === 'buy' ? lv.price > effPrice : lv.price < effPrice) break;
      const take = Math.min(qty - got, lv.volume);
      got += take;
      cost += take * lv.price;
      if (got >= qty) break;
    }
    if (got > 0) {
      const avgPrice = Math.round(cost / got);
      applyFill({ ...order, price: avgPrice }, got);
      if (got >= qty) {
        setHistory((h) => [{ ...order, price: avgPrice, filled: qty, status: 'filled', isNew: false }, ...h]);
        const to: InfoTab = side === 'buy' ? 'holdings' : 'history';
        announceDone(order, true);
        setGlowTab(null);
        setTab(to); // 대기를 거치지 않고 바로 보유(판매는 내역)로
        markFresh(to, to === 'holdings' ? order.stockId : String(order.id));
        return;
      }
      order.filled = got;
      order.status = 'partial';
    }

    setOpen((l) => [order, ...l]);
    setTab('pending');
    toast(`${verb} 주문을 접수했어요`, '대기 보기', () => {
      setSnack(null);
      setTab('pending');
      scrollToInfo();
    }, stock.name);
    setTimeout(() => setOpen((l) => l.map((x) => (x.id === id ? { ...x, isNew: false } : x))), 3000);
  };

  const cancel = (id: number) => {
    const o = open.find((x) => x.id === id);
    if (!o || leaving[id]) return;
    cancelled.current.add(id); // 날아가는 동안 체결되지 않게
    flyAway([id], 'history', () => {
      setOpen((l) => l.filter((x) => x.id !== id));
      setHistory((h) => [{ ...o, status: 'cancelled', time: now(), at: Date.now(), isNew: false }, ...h]);
    });
  };
  const cancelAll = (only?: number[]) => {
    const list = open.filter((o) => !leaving[o.id] && (!only || only.includes(o.id)));
    list.forEach((o) => cancelled.current.add(o.id));
    flyAway(
      list.map((o) => o.id),
      'history',
      () => {
        const ids = new Set(list.map((o) => o.id));
        setHistory((h) => [...list.map((o) => ({ ...o, status: 'cancelled' as const, time: now(), at: Date.now(), isNew: false })), ...h]);
        setOpen((l) => l.filter((o) => !ids.has(o.id)));
      },
    );
  };

  const pickPrice = (p: number, src: PriceSrc = 'B') => {
    priceSrc.current = src;
    setPrice(p);
    if (!isUserPriced(orderType)) setOrderType('limit');
    if (!panelOpen) setPanelOpen(true);
  };

  const changeStock = (s: Stock) => {
    setPickerOpen(false);
    if (s.id === stock.id) return;
    setStock(s);
    priceSrc.current = 'D';
    setPrice(null);
    setQty(null);
  };

  const onHolding = (stockId: string) => {
    priceSrc.current = 'D';
    if (stockId !== stock.id) {
      setStock(stockById(stockId));
      setPrice(null);
    }
    setSide('sell');
    setPanelOpen(true);
    if (stockId === stock.id && price == null) setPrice(market.price);
    if (stockId !== stock.id) setPrice(priceOf(stockId));
    setQty(null); // 수량은 사용자가 직접 넣는다
    scrollerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const changeSide = (s: Side) => {
    if (s === side) return;
    setSide(s);
    setQty(null);
  };

  const stepPrice = (d: 1 | -1) => {
    priceSrc.current = 'T';
    setPrice((p) => {
      if (p == null) return market.price;
      const t = krxTick(d > 0 ? p : p - 1);
      return Math.max(t, p + d * t);
    });
  };
  const stepQty = (d: 1 | -1) => setQty((q) => (q == null ? (d > 0 ? 1 : null) : q + d <= 0 ? null : q + d));

  const iconPos =
    view === 'chart'
      ? { left: 16, top: 48 }
      : panelOpen
        ? { left: 'calc((100% - 236px) / 2 - 38px)', top: 15 }
        : { left: 19, top: 6 };

  return (
    <div
      className={`app ${framed ? 'framed' : ''} ${frameMode === 'mock' ? 'mock' : ''}`}
      style={frameMode === 'mock' ? { height: viewH } : undefined}
    >
      <div className="phone">
      <div className="device" style={frameMode === false && viewH !== window.innerHeight ? { height: viewH } : undefined}>
        {framed && <StatusBar />}
        <UtBar ut={ut} />
        <div className="scroller" ref={scrollerRef}>
          <TopAppBar name={stock.name} onSearch={() => setPickerOpen(true)} />
          <SubBar panelOpen={panelOpen} onTogglePanel={() => setPanelOpen((v) => !v)} />
          <section className="trade">
            {view === 'chart' ? (
              <MultiChart main={stock} onPickPrice={(p) => pickPrice(p, 'C')} panelOpen={panelOpen} />
            ) : panelOpen ? (
              <CompactOrderBook market={market} onPick={pickPrice} />
            ) : (
              <WideOrderBook market={market} onPick={pickPrice} />
            )}
            {panelShown && (
              <OrderPanel
                closing={!panelOpen}
                side={side}
                onSide={changeSide}
                price={price}
                qty={qty}
                onPrice={(p) => {
                  priceSrc.current = 'T';
                  setPrice(p);
                }}
                onQty={setQty}
                onStepPrice={stepPrice}
                onStepQty={stepQty}
                maxQty={maxQty}
                available={side === 'buy' ? `${fmt(CASH)} 원` : `${sellable} 주`}
                onSubmit={submit}
                orderType={orderType}
                onOpenTypes={() => {
                  ut.typesOpened();
                  setTypesOpen(true);
                }}
                autoPrice={auto}
              />
            )}
            <IconTabs view={view} onChange={setView} style={iconPos} />
          </section>
          <div ref={infoRef}>
            <OrderInfo
              tab={tab}
              onTab={goTab}
              glowTab={glowTab}
              fresh={fresh}
              open={open}
              history={history}
              holdings={holdings}
              priceOf={priceOf}
              currentStockId={stock.id}
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
            onCancel={() => {
              ut.stray();
              setConfirming(false);
            }}
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
        <UtLayer ut={ut} />
      </div>
      </div>
      {frameMode === 'mock' && ut.on && (
        <div className="ut-sidecol">
          <UtBar ut={ut} side />
          <UtLayer ut={ut} side />
          <UtFeedback ut={ut} />
        </div>
      )}
    </div>
  );
}
