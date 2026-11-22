import { useCallback, useEffect, useRef, useState } from 'react';
import type { Side } from '../components/OrderPanel';
import type { OrderType } from '../lib/orderTypes';

/**
 * 사용성 평가(UT) 모드: 주소에 ?ut=1 을 붙이면 켜진다.
 * 미션 4개를 차례로 주고, 미션마다 성공 여부, 걸린 시간, 화면 탭 수, 헤맨 횟수, 쉬움 점수(1~7)를 모은다.
 * 끝나면 설문에 붙여 넣을 결과 코드를 보여 주고, 결과 수집 시트가 있으면 함께 보낸다.
 */

export const UT_ON = new URLSearchParams(location.search).get('ut') === '1';

/**
 * 결과 수집 설정. 기존 UT 사이트와 섞이지 않게 이 앱 전용 시트와 Clarity 프로젝트를 쓴다.
 * - sheetUrl: 새 구글 시트에 /mnt 의 apps-script.gs 를 붙여 웹 앱으로 배포한 URL (task, final 탭에 쌓임)
 * - clarityId: Microsoft Clarity 새 프로젝트의 Project ID
 * 비워 두면 그 수집은 꺼지고 결과 코드만 보여 준다.
 */
export const UT_CONFIG = {
  sheetUrl: '',
  clarityId: '',
};
const SHEET_URL = UT_CONFIG.sheetUrl;
const SEND = new URLSearchParams(location.search).get('sheet') !== '0';
const VERSION = 'order-app-ut1';
const STORE = 'kiwoom-ut-v1';

export const MISSIONS = [
  '현대차 주식을 10주 구매해 보세요',
  '가지고 있는 현대차 주식 중 절반을 팔아 보세요',
  '차트를 보면서 원하는 가격을 골라 구매해 보세요',
  '오늘 판 주식이 얼마에 팔렸는지 확인해 보세요',
];

/** 주문 가격을 어디서 정했는지: 차트(C), 호가(B), 직접 입력 또는 +- 버튼(T), 손대지 않음(D) */
export type PriceSrc = 'C' | 'B' | 'T' | 'D';

export type UtOrder = {
  side: Side;
  stockId: string;
  qty: number;
  price: number;
  type: OrderType;
  src: PriceSrc;
  view: 'book' | 'chart';
};

export type MissionResult = {
  m: number;
  ok: boolean;
  sec: number;
  taps: number;
  errs: number;
  seq: number | null;
  /** 미션별 덧붙임 정보 (결과 코드 끝자리) */
  extra: string;
};

type Phase = 'intro' | 'ready' | 'run' | 'answer' | 'rate' | 'done';

type Run = {
  start: number;
  taps: number;
  errs: number;
  typesOpened: number;
  /** 미션 2: 시작 때 가지고 있던 수량 */
  holdAtStart: number;
  tries: number;
};

type Saved = { pid: string; idx: number; phase: Phase; results: MissionResult[] };

const TYPE_CODE: Record<OrderType, string> = {
  limit: 'L',
  market: 'M',
  mid: 'I',
  best: 'B',
  priority: 'P',
  conditional: 'C',
};

const newPid = () => {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => a[Math.floor(Math.random() * a.length)]).join('');
};

function load(): Saved | null {
  try {
    const s = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Saved | null;
    return s && typeof s.pid === 'string' ? s : null;
  } catch {
    return null;
  }
}
function save(s: Saved | null) {
  try {
    if (s) localStorage.setItem(STORE, JSON.stringify(s));
    else localStorage.removeItem(STORE);
  } catch {
    /* 저장이 막힌 브라우저에서도 그대로 진행 */
  }
}

function send(kind: 'task' | 'final', payload: Record<string, unknown>) {
  if (!SEND || !SHEET_URL) return;
  try {
    fetch(SHEET_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ kind, version: VERSION, ts: Date.now(), ...payload }),
    }).catch(() => {});
  } catch {
    /* 네트워크가 없어도 결과 코드로 받을 수 있다 */
  }
}

type ClarityFn = ((...a: unknown[]) => void) & { q?: unknown[][] };
let clarityLoaded = false;
/** UT 모드에서만 Clarity 를 불러온다. 미션별 히트맵과 녹화를 나눠 볼 수 있게 태그를 단다 */
function clarity(...a: unknown[]) {
  if (!UT_ON || !UT_CONFIG.clarityId) return;
  const w = window as unknown as { clarity?: ClarityFn };
  if (!clarityLoaded) {
    clarityLoaded = true;
    if (!w.clarity) {
      const f: ClarityFn = (...args: unknown[]) => {
        (f.q = f.q || []).push(args);
      };
      w.clarity = f;
    }
    const t = document.createElement('script');
    t.async = true;
    t.src = 'https://www.clarity.ms/tag/' + UT_CONFIG.clarityId;
    document.head.appendChild(t);
  }
  try {
    w.clarity?.(...a);
  } catch {
    /* 녹화 도구가 막혀도 UT 는 그대로 진행 */
  }
}
export const CLARITY_ON = UT_ON && !!UT_CONFIG.clarityId;

/**
 * 결과 코드: KU1 참가코드 M1:S,42,18,0,6,L1 M2:...
 * 미션마다 성공 S 실패 F, 걸린 초, 탭 수, 헤맨 횟수, 쉬움 점수, 덧붙임
 * 덧붙임: 미션 1 주문유형(L 가격 정해서, M 시장 가격)과 주문유형 목록을 열었는지(1/0),
 * 미션 2 판 수량-가진 수량, 미션 3 가격을 정한 곳(C 차트, B 호가, T 직접 입력, D 그대로), 미션 4 입력 횟수
 */
export function resultCode(pid: string, results: MissionResult[]) {
  const parts = results.map((r) => `M${r.m}:${r.ok ? 'S' : 'F'},${r.sec},${r.taps},${r.errs},${r.seq ?? '-'},${r.extra || '-'}`);
  return ['KU1', pid, ...parts].join(' ');
}

export type UtApi = ReturnType<typeof useUt>;

export function useUt(hooks: {
  /** 미션을 시작하기 직전에 화면 상태를 맞춘다 (예: 미션 2에서 팔 주식이 없으면 넣어 둔다) */
  prepare: (m: number) => void;
  holdingQty: (stockId: string) => number;
  /** 오늘 체결된 판매 주문 가격들 (미션 4 정답) */
  soldPrices: () => number[];
}) {
  const [saved] = useState(load);
  const [pid] = useState(() => saved?.pid ?? newPid());
  const [idx, setIdx] = useState(saved?.idx ?? 0);
  // 새로고침되면 진행 중이던 미션은 시작 카드부터 다시
  const [phase, setPhase] = useState<Phase>(
    saved ? (saved.phase === 'done' ? 'done' : saved.phase === 'intro' ? 'intro' : 'ready') : 'intro',
  );
  const [results, setResults] = useState<MissionResult[]>(saved?.results ?? []);
  const [pendingOk, setPendingOk] = useState<boolean | null>(null);
  const [answerMsg, setAnswerMsg] = useState<string | null>(null);
  const run = useRef<Run | null>(null);
  const hooksRef = useRef(hooks);
  hooksRef.current = hooks;
  const draft = useRef<Omit<MissionResult, 'seq'> | null>(null);

  useEffect(() => {
    clarity('identify', pid);
    clarity('set', 'version', VERSION);
  }, [pid]);

  useEffect(() => {
    if (UT_ON) save({ pid, idx, phase, results });
  }, [pid, idx, phase, results]);

  // 미션 중 화면 탭 수 (UT 안내 영역은 빼고 센다)
  useEffect(() => {
    if (!UT_ON || phase !== 'run') return;
    const on = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest?.('.ut')) return;
      if (run.current) run.current.taps++;
    };
    document.addEventListener('pointerdown', on, true);
    return () => document.removeEventListener('pointerdown', on, true);
  }, [phase]);

  const m = idx + 1;

  const begin = useCallback(() => {
    hooksRef.current.prepare(m);
    run.current = {
      start: performance.now(),
      taps: 0,
      errs: 0,
      typesOpened: 0,
      holdAtStart: hooksRef.current.holdingQty('hyundai'),
      tries: 0,
    };
    setAnswerMsg(null);
    setPhase('run');
    clarity('set', 'mission', String(m));
    clarity('event', `m${m}_start`);
  }, [m]);

  const finish = useCallback(
    (ok: boolean, extra: string, delay = 0) => {
      const r = run.current;
      if (!r) return;
      run.current = null;
      draft.current = {
        m,
        ok,
        sec: Math.round((performance.now() - r.start) / 1000),
        taps: r.taps,
        errs: r.errs,
        extra,
      };
      setPendingOk(ok);
      clarity('event', `m${m}_${ok ? 'success' : 'fail'}`);
      // 앱의 완료 안내를 잠깐 보여 준 뒤 점수 카드를 띄운다
      if (delay) setTimeout(() => setPhase('rate'), delay);
      else setPhase('rate');
    },
    [m],
  );

  const rate = (seq: number) => {
    const d = draft.current;
    if (!d) return;
    const res: MissionResult = { ...d, seq };
    draft.current = null;
    const next = [...results, res];
    setResults(next);
    send('task', { pid, task: res.m, ok: res.ok ? 1 : 0, sec: res.sec, taps: res.taps, errs: res.errs, seq, extra: res.extra });
    if (idx + 1 >= MISSIONS.length) {
      send('final', { pid, code: resultCode(pid, next) });
      clarity('event', 'ut_done');
      setPhase('done');
    } else {
      setIdx(idx + 1);
      setPhase('ready');
    }
  };

  const giveUp = () => {
    const r = run.current;
    if (!r) return;
    const extra = m === 1 ? `-${r.typesOpened ? 1 : 0}` : m === 4 ? String(r.tries) : '';
    finish(false, extra);
  };

  /** 주문 확정 때마다 불러 미션 성공을 판정한다 */
  const order = (o: UtOrder) => {
    const r = run.current;
    if (!UT_ON || phase !== 'run' || !r) return;
    if (m === 1) {
      if (o.side === 'buy' && o.stockId === 'hyundai' && o.qty === 10) {
        return finish(true, `${TYPE_CODE[o.type]}${r.typesOpened ? 1 : 0}`, 1400);
      }
    } else if (m === 2) {
      const h = r.holdAtStart;
      if (o.side === 'sell' && o.stockId === 'hyundai' && h > 0 && (o.qty === Math.floor(h / 2) || o.qty === Math.ceil(h / 2))) {
        return finish(true, `${o.qty}-${h}`, 1400);
      }
    } else if (m === 3) {
      if (o.side === 'buy' && o.view === 'chart' && (o.type === 'limit' || o.type === 'conditional')) {
        return finish(true, o.src, 1400);
      }
    }
    r.errs++;
  };

  /** 미션과 상관없이 헤맨 것으로 볼 행동 (주문 확인 시트에서 취소 등) */
  const stray = () => {
    if (run.current && phase === 'run') run.current.errs++;
  };
  const typesOpened = () => {
    if (run.current) run.current.typesOpened++;
  };

  const openAnswer = () => {
    setAnswerMsg(null);
    setPhase('answer');
  };
  const closeAnswer = () => setPhase('run');
  const answer = (v: number) => {
    const r = run.current;
    if (!r) return;
    r.tries++;
    const sold = hooksRef.current.soldPrices();
    if (sold.includes(v)) return finish(true, String(r.tries));
    r.errs++;
    if (r.tries >= 3) return finish(false, String(r.tries));
    setAnswerMsg('적어 주신 가격과 달라요. 한 번 더 확인해 볼까요?');
    setPhase('run');
  };

  const restart = () => {
    save(null);
    location.reload();
  };

  return {
    on: UT_ON,
    pid,
    m,
    phase,
    results,
    pendingOk,
    answerMsg,
    start: () => setPhase('ready'),
    begin,
    giveUp,
    rate,
    order,
    stray,
    typesOpened,
    openAnswer,
    closeAnswer,
    answer,
    restart,
  };
}
