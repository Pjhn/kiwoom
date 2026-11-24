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
  sheetUrl:
    'https://script.google.com/macros/s/AKfycbx-pIgOQ3SXgq3oYFYL-Gey3OpBmH_oAivlN9Wvm3xB3IXRKY44XMoqEeRbXHeyOjaq/exec',
  clarityId: 'zhhvc5fgwd',
};
const SHEET_URL = UT_CONFIG.sheetUrl;
const SEND = new URLSearchParams(location.search).get('sheet') !== '0';
const VERSION = 'order-app-ut1';
const STORE = 'kiwoom-ut-v1';

/** 미션이 끝나고 완료 안내를 띄우기까지 (앱의 완료 알림을 먼저 보게) */
const DONE_DELAY = 800;

export const MISSIONS = [
  '현대차 주식을 10주 구매해 보세요',
  '가지고 있는 현대차 주식 중 절반을 팔아 보세요',
  '차트를 보면서 원하는 가격을 골라 구매해 보세요',
  '오늘 판 주식의 내역을 확인해 보세요',
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

type Phase = 'intro' | 'pre' | 'ready' | 'run' | 'rate' | 'survey' | 'done';

type Run = {
  start: number;
  taps: number;
  errs: number;
  typesOpened: number;
  /** 미션 2: 시작 때 가지고 있던 수량 */
  holdAtStart: number;
  /** 무엇을 눌렀는지 시간순 기록 (시트 events 탭, 1차 UT 와 같은 칸) */
  events: UtEvent[];
};

type UtEvent = { t: number; event: string; target: string; value: string; on_path: string };

const MAX_EVENTS = 600;
function push(r: Run, event: string, target: string, value = '') {
  if (r.events.length >= MAX_EVENTS) return;
  r.events.push({ t: Math.round(performance.now() - r.start), event, target, value, on_path: '' });
}

/** 누른 요소의 이름: 접근성 이름 > 글자 > 종류 */
function nameOf(target: Element | null): string {
  if (!target) return '빈 곳';
  if (target.closest('canvas')) return '차트 영역';
  if (target.closest('.dim')) return '시트 바깥(닫기)';
  const el = target.closest('button, a, input, textarea, [role], label') ?? target;
  const aria = el.getAttribute('aria-label');
  if (aria) return aria.slice(0, 40);
  if (el instanceof HTMLInputElement) return el.placeholder || el.type;
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (text) return text.slice(0, 40);
  const cls = typeof el.className === 'string' ? el.className.split(' ')[0] : '';
  return cls || el.tagName.toLowerCase();
}

/** 마지막 화면 평가: 1차 UT(11월 16일)와 같은 문항, 같은 1~5점 (그렇다 = 불편, 낮을수록 좋음). 1차 7번(주문 취소)은 이번 미션에 없어 뺐다 */
export const SURVEY = [
  '화면이 복잡해서 내용에 집중하기 어려웠어요',
  '화면에는 이해가 안 되는 용어가 많았어요',
  '화면을 쓰려면 추가적인 검색이 필요할 것 같아요',
  '화면을 쓰기 전에 배워야 할 게 많았어요',
  '수량을 입력하는 과정이 번거로웠어요',
  '가격이나 금액을 정하는 과정이 번거로웠어요',
];
/** 뜻이 바로 와닿지 않은 말 (복수 선택). 결과 코드에는 번호로 남긴다 (0 = 없었어요) */
export const TERMS = ['가격 정해서 주문', '시장 가격으로 주문', '대기', '보유', '내역', '체결', '호가', '소수점', '미수거래'];
export type Survey = { scores: number[]; terms: number[]; etc: string };

type Saved = { pid: string; idx: number; phase: Phase; results: MissionResult[]; survey?: Survey | null; segment?: Segment };

/** 사전 질문 (1차 UT 와 같은 문항과 같은 기준) */
export const PRE_QS = [
  { key: 'exp', q: '주식 투자를 한 지 얼마나 됐나요?', opts: ['해 본 적 없어요', '1년 미만', '1~3년', '3년 이상'] },
  { key: 'kiwoom', q: '키움증권 앱을 써 봤나요?', opts: ['지금 쓰고 있어요', '써 본 적 있어요', '써 본 적 없어요'] },
] as const;
export type Segment = '' | '숙련' | '중간' | '입문';
/** 숙련: 3년 이상이면서 키움 앱 경험 있음. 입문: 해 본 적 없음, 1년 미만, 또는 키움 앱 경험 없음. 나머지는 중간 */
export function segmentOf(exp: string, kiwoom: string): Segment {
  if (exp === '3년 이상' && kiwoom !== '써 본 적 없어요') return '숙련';
  if (exp === '해 본 적 없어요' || exp === '1년 미만' || kiwoom === '써 본 적 없어요') return '입문';
  return '중간';
}
/** 모든 전송 행에 붙이는 참가자 구분 */
let SEGMENT: Segment = '';

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

function send(kind: 'pre' | 'task' | 'events' | 'sus' | 'final' | 'feedback', payload: Record<string, unknown>) {
  if (!SEND || !SHEET_URL) return;
  try {
    fetch(SHEET_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ kind, version: VERSION, ts: Date.now(), segment: SEGMENT, ...payload }),
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
 * 끝의 Q: 는 화면 평가 6문항 점수(1~5, 낮을수록 좋음), W: 는 뜻이 와닿지 않은 말 번호
 * 미션 2 판 수량-가진 수량, 미션 3 가격을 정한 곳(C 차트, B 호가, T 직접 입력, D 그대로), 미션 4 내역을 연 방법(T 탭, S 완료 알림)
 */
export function resultCode(pid: string, results: MissionResult[], survey?: Survey | null) {
  const parts = results.map((r) => `M${r.m}:${r.ok ? 'S' : 'F'},${r.sec},${r.taps},${r.errs},${r.seq ?? '-'},${r.extra || '-'}`);
  // Q: 화면 평가 6문항 점수 (1~5, 낮을수록 좋음)
  if (survey) parts.push(`Q:${survey.scores.join(',')}`);
  // W: 뜻이 바로 와닿지 않은 말 번호 (TERMS 순서 1부터, 0 = 없었어요)
  if (survey) parts.push(`W:${survey.terms?.length ? survey.terms.join(',') : '0'}`);
  return ['KU1', pid, ...parts].join(' ');
}

export type UtApi = ReturnType<typeof useUt>;

export function useUt(hooks: {
  /** 미션을 시작하기 직전에 화면 상태를 맞춘다 (예: 미션 2에서 팔 주식이 없으면 넣어 둔다) */
  prepare: (m: number) => void;
  holdingQty: (stockId: string) => number;
}) {
  const [saved] = useState(load);
  const [pid] = useState(() => saved?.pid ?? newPid());
  const [idx, setIdx] = useState(saved?.idx ?? 0);
  // 새로고침되면 진행 중이던 미션은 시작 카드부터 다시
  const [phase, setPhase] = useState<Phase>(
    saved ? (saved.phase === 'done' || saved.phase === 'survey' || saved.phase === 'intro' || saved.phase === 'pre' ? saved.phase : 'ready') : 'intro',
  );
  const [results, setResults] = useState<MissionResult[]>(saved?.results ?? []);
  const [survey, setSurvey] = useState<Survey | null>(saved?.survey ?? null);
  // 점수와 설문을 고르는 동안 프로토타입을 흐리게 가릴지 (1차 UT 의 「화면 흐리게」 토글)
  const [blur, setBlur] = useState(true);
  const [pendingOk, setPendingOk] = useState<boolean | null>(null);
  const run = useRef<Run | null>(null);
  const hooksRef = useRef(hooks);
  hooksRef.current = hooks;
  const draft = useRef<Omit<MissionResult, 'seq'> | null>(null);

  const [segment, setSegment] = useState<Segment>(saved?.segment ?? '');
  SEGMENT = segment;

  useEffect(() => {
    clarity('identify', pid);
    clarity('set', 'version', VERSION);
  }, [pid]);
  useEffect(() => {
    if (segment) clarity('set', 'segment', segment);
  }, [segment]);

  useEffect(() => {
    if (UT_ON) save({ pid, idx, phase, results, survey, segment });
  }, [pid, idx, phase, results, survey, segment]);

  const submitPre = (exp: string, kiwoom: string) => {
    const seg = segmentOf(exp, kiwoom);
    SEGMENT = seg;
    setSegment(seg);
    send('pre', { pid, exp, kiwoom, device: matchMedia('(pointer:coarse)').matches ? 'mobile' : 'desktop' });
    setPhase('ready');
  };

  // 미션 중 화면 탭 수와 무엇을 눌렀는지 (UT 안내 영역은 빼고 센다)
  useEffect(() => {
    if (!UT_ON || phase !== 'run') return;
    const on = (e: PointerEvent) => {
      const el = e.target as Element | null;
      if (el?.closest?.('.ut')) return;
      const r = run.current;
      if (!r) return;
      r.taps++;
      push(r, 'tap', nameOf(el));
    };
    // 입력칸에 넣은 값 (가격, 수량)
    const onChange = (e: Event) => {
      const el = e.target as HTMLInputElement | null;
      if (!el || el.closest?.('.ut') || !run.current) return;
      push(run.current, 'input', nameOf(el), el.value);
    };
    document.addEventListener('pointerdown', on, true);
    document.addEventListener('change', onChange, true);
    return () => {
      document.removeEventListener('pointerdown', on, true);
      document.removeEventListener('change', onChange, true);
    };
  }, [phase]);

  const m = idx + 1;
  const mRef = useRef(m);
  mRef.current = m;

  const begin = useCallback(() => {
    hooksRef.current.prepare(m);
    run.current = {
      start: performance.now(),
      taps: 0,
      errs: 0,
      typesOpened: 0,
      holdAtStart: hooksRef.current.holdingQty('hyundai'),
      events: [],
    };
    setPhase('run');
    clarity('set', 'mission', String(m));
    clarity('event', `m${m}_start`);
  }, [m]);

  const finish = useCallback(
    (ok: boolean, extra: string, delay = 0) => {
      const r = run.current;
      if (!r) return;
      run.current = null;
      push(r, ok ? 'mission_success' : 'mission_fail', `미션 ${m}`, extra);
      send('events', { pid, task: m, events: r.events });
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
      setBlur(true);
      if (delay) setTimeout(() => setPhase('rate'), delay);
      else setPhase('rate');
    },
    [m],
  );

  const finishRef = useRef(finish);
  finishRef.current = finish;

  const rate = (seq: number) => {
    const d = draft.current;
    if (!d) return;
    const res: MissionResult = { ...d, seq };
    draft.current = null;
    const next = [...results, res];
    setResults(next);
    send('task', { pid, task: res.m, ok: res.ok ? 1 : 0, sec: res.sec, taps: res.taps, errs: res.errs, seq, extra: res.extra });
    if (idx + 1 >= MISSIONS.length) {
      setBlur(true);
      setPhase('survey');
    } else {
      setIdx(idx + 1);
      setPhase('ready');
    }
  };

  const giveUp = () => {
    const r = run.current;
    if (!r) return;
    const extra = m === 1 ? `-${r.typesOpened ? 1 : 0}` : '';
    finish(false, extra);
  };

  /** 주문 확정 때마다 불러 미션 성공을 판정한다 */
  const order = (o: UtOrder) => {
    const r = run.current;
    if (!UT_ON || phase !== 'run' || !r) return;
    push(r, 'order', o.side === 'buy' ? '구매 확정' : '판매 확정', `${o.stockId} ${o.qty}주 ${o.price}원 ${o.type} 가격:${o.src} 화면:${o.view}`);
    if (m === 1) {
      if (o.side === 'buy' && o.stockId === 'hyundai' && o.qty === 10) {
        return finish(true, `${TYPE_CODE[o.type]}${r.typesOpened ? 1 : 0}`, DONE_DELAY);
      }
    } else if (m === 2) {
      const h = r.holdAtStart;
      if (o.side === 'sell' && o.stockId === 'hyundai' && h > 0 && (o.qty === Math.floor(h / 2) || o.qty === Math.ceil(h / 2))) {
        return finish(true, `${o.qty}-${h}`, DONE_DELAY);
      }
    } else if (m === 3) {
      if (o.side === 'buy' && o.view === 'chart' && (o.type === 'limit' || o.type === 'conditional')) {
        return finish(true, o.src, DONE_DELAY);
      }
    }
    r.errs++;
  };

  /** 미션과 상관없이 헤맨 것으로 볼 행동 (주문 확인 시트에서 취소 등) */
  const stray = () => {
    if (run.current && phase === 'run') {
      run.current.errs++;
      push(run.current, 'confirm_cancel', '주문 확인 취소');
    }
  };
  const typesOpened = () => {
    if (run.current) run.current.typesOpened++;
  };

  /** 미션 4: 내역 탭을 열면 성공 (T 탭을 직접 누름, S 완료 알림의 [내역 보기]) */
  const sawHistory = (via: 'T' | 'S') => {
    if (mRef.current === 4 && run.current) finishRef.current(true, via, DONE_DELAY);
  };

  /** 화면 평가 제출: 1차 UT 와 같은 sus 탭에 쌓아 두 차례를 바로 비교할 수 있게 한다 */
  const submitSurvey = (scores: number[], terms: number[], etc: string) => {
    const sv: Survey = { scores, terms, etc };
    setSurvey(sv);
    const row: Record<string, unknown> = {
      pid,
      version: VERSION,
      etc,
      terms: terms.length ? terms.map((i) => TERMS[i - 1]).join(', ') : '없었어요',
    };
    scores.forEach((v, i) => (row[`s${i + 1}`] = v));
    row.score = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
    send('sus', row);
    send('final', { pid, code: resultCode(pid, results, sv) });
    clarity('event', 'ut_done');
    setPhase('done');
  };

  /** 화면마다 받는 자유 의견. 어느 단계, 몇 번째 미션에서 남겼는지 함께 보낸다 */
  const feedback = (text: string) => {
    const where =
      ({ intro: '시작 안내', pre: '사전 질문', ready: `미션 ${m} 시작 전`, run: `미션 ${m} 진행 중`, rate: `미션 ${m} 쉬움 점수`, survey: '마지막 질문', done: '완료 화면' } as Record<Phase, string>)[phase] ?? phase;
    const r = run.current;
    send('feedback', { pid, where, phase, task: phase === 'intro' || phase === 'pre' || phase === 'survey' || phase === 'done' ? '' : m, t_ms: phase === 'run' && r ? Math.round(performance.now() - r.start) : '', text: text.slice(0, 1000) });
    clarity('event', 'feedback');
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
    survey,
    submitSurvey,
    blur,
    setBlur,
    pendingOk,
    segment,
    submitPre,
    start: () => setPhase('pre'),
    begin,
    giveUp,
    rate,
    order,
    stray,
    typesOpened,
    sawHistory,
    feedback,
    restart,
  };
}
