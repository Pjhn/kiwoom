import { useState } from 'react';
import { CLARITY_ON, MISSIONS, SURVEY, TERMS, resultCode, type UtApi } from './useUt';
import './ut.css';

const SEQ_LABELS = ['매우 어려웠어요', '', '', '보통이에요', '', '', '매우 쉬웠어요'];

/** 미션 안내: PC 목업에서는 폰 오른쪽 카드, 폰에서는 왼쪽 위 떠 있는 버튼을 누르면 펼쳐지는 카드 */
export function UtBar({ ut, side = false }: { ut: UtApi; side?: boolean }) {
  if (!ut.on || ut.phase !== 'run') return null;
  if (!side) return <UtFloat key={ut.m} ut={ut} />;
  return (
    <div className="ut ut-bar ut-side" role="region" aria-label="미션 안내">
      <MissionBody ut={ut} total />
    </div>
  );
}

function MissionBody({ ut, total = false }: { ut: UtApi; total?: boolean }) {
  return (
    <>
      <div className="ut-bar-row">
        <span className="ut-bar-no">
          미션 {ut.m}
          {total && ` / ${MISSIONS.length}`}
        </span>
        <p className="ut-bar-text">{MISSIONS[ut.m - 1]}</p>
      </div>
      <div className="ut-bar-actions">
        <button className="ut-btn ghost" onClick={ut.giveUp}>
          잘 모르겠어요
        </button>
      </div>
    </>
  );
}

function UtFloat({ ut }: { ut: UtApi }) {
  const [open, setOpen] = useState(false);
  const shown = open;
  return (
    <div className="ut ut-float-wrap">
      <button
        className={`ut-fab ${shown ? 'on' : ''}`}
        aria-expanded={shown}
        aria-label={`미션 ${ut.m} ${shown ? '닫기' : '보기'}`}
        onClick={() => setOpen(!shown)}
      >
        <span className="ut-fab-label">미션</span>
        <span className="ut-fab-no">{ut.m}</span>
      </button>
      {shown && (
        <div className="ut-bar ut-pop" role="region" aria-label="미션 안내">
          <MissionBody ut={ut} total />
        </div>
      )}
    </div>
  );
}

/** 시작 안내, 미션 카드, 쉬움 점수, 정답 입력, 결과 코드 (화면 전체를 덮는 층) */
export function UtLayer({ ut }: { ut: UtApi }) {
  if (!ut.on) return null;
  switch (ut.phase) {
    case 'intro':
      return <Intro onStart={ut.start} />;
    case 'ready':
      return <Ready m={ut.m} onBegin={ut.begin} />;
    case 'rate':
      return <Rate ok={ut.pendingOk} onRate={ut.rate} />;
    case 'survey':
      return <SurveyCard onSubmit={ut.submitSurvey} />;
    case 'done':
      return <Done code={resultCode(ut.pid, ut.results, ut.survey)} onRestart={ut.restart} />;
    default:
      return null;
  }
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="ut ut-cover">
      <div className="ut-card">
        <p className="ut-eyebrow">사용성 테스트</p>
        <h1 className="ut-title">주식 주문 화면을 써 보고 의견을 들려주세요</h1>
        <ul className="ut-list">
          <li>미션 4개를 차례로 해 봐요. 5분쯤 걸려요.</li>
          <li>실제 돈은 쓰지 않아요. 연습용 계좌예요.</li>
          <li>평가받는 건 여러분이 아니라 앱이에요. 정답도 없어요.</li>
          <li>막히면 언제든 [잘 모르겠어요]를 눌러 다음으로 넘어가도 돼요.</li>
          <li>미션마다 걸린 시간과 누른 횟수를 기록해요. 이름 같은 개인 정보는 모으지 않아요.</li>
          {CLARITY_ON && (
            <li>화면을 누른 위치와 화면 녹화가 익명으로 수집돼요. 녹화 도구(Microsoft Clarity)는 쿠키를 사용해요.</li>
          )}
        </ul>
      </div>
      <button className="ut-btn primary wide" onClick={onStart}>
        {CLARITY_ON ? '동의하고 시작할게요' : '시작할게요'}
      </button>
    </div>
  );
}

function Ready({ m, onBegin }: { m: number; onBegin: () => void }) {
  return (
    <div className="ut ut-cover">
      <div className="ut-card">
        <p className="ut-eyebrow">
          미션 {m} / {MISSIONS.length}
        </p>
        <h1 className="ut-title">{MISSIONS[m - 1]}</h1>
        <p className="ut-sub">
          다 하면 자동으로 다음 미션으로 넘어가요.
        </p>
      </div>
      <button className="ut-btn primary wide" onClick={onBegin}>
        미션 시작
      </button>
    </div>
  );
}

function Rate({ ok, onRate }: { ok: boolean | null; onRate: (n: number) => void }) {
  return (
    <div className="ut ut-cover dim">
      <div className="ut-card">
        <p className="ut-eyebrow">{ok ? '미션 완료' : '다음으로 넘어갈게요'}</p>
        <h1 className="ut-title">방금 미션은 얼마나 쉬웠나요?</h1>
        <div className="ut-seq" role="radiogroup" aria-label="쉬움 점수 1점부터 7점">
          {SEQ_LABELS.map((_, i) => (
            <button key={i} className="ut-seq-btn" role="radio" aria-checked={false} onClick={() => onRate(i + 1)}>
              {i + 1}
            </button>
          ))}
        </div>
        <div className="ut-seq-legend">
          <span>{SEQ_LABELS[0]}</span>
          <span>{SEQ_LABELS[6]}</span>
        </div>
      </div>
    </div>
  );
}

/** 화면 평가 6문항 (1차 UT 와 같은 문항, 1 전혀 아니에요 ~ 5 매우 그래요) */
function SurveyCard({ onSubmit }: { onSubmit: (scores: number[], terms: number[], etc: string) => void }) {
  const [scores, setScores] = useState<(number | null)[]>(() => SURVEY.map(() => null));
  const [etc, setEtc] = useState('');
  // 고른 말 번호 (1부터). 0 은 「없었어요」로 다른 보기와 함께 고를 수 없다
  const [terms, setTerms] = useState<number[]>([]);
  const toggleTerm = (n: number) =>
    setTerms((t) => (n === 0 ? (t.includes(0) ? [] : [0]) : t.includes(n) ? t.filter((x) => x !== n) : [...t.filter((x) => x !== 0), n]));
  const done = scores.every((v) => v != null) && terms.length > 0;
  return (
    <div className="ut ut-cover ut-scroll">
      <div className="ut-card">
        <p className="ut-eyebrow">마지막 질문</p>
        <h1 className="ut-title">방금 쓴 화면 전체를 떠올리며 답해 주세요</h1>
        <p className="ut-sub">1은 전혀 아니에요, 5는 매우 그래요</p>
        {SURVEY.map((q, i) => (
          <div key={i} className="ut-q">
            <p className="ut-q-text">{q}</p>
            <div className="ut-scale" role="radiogroup" aria-label={q}>
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={scores[i] === v}
                  className={`ut-seq-btn ${scores[i] === v ? 'on' : ''}`}
                  onClick={() => setScores((s) => s.map((x, j) => (j === i ? v : x)))}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="ut-q">
          <p className="ut-q-text">화면에서 뜻이 바로 와닿지 않은 말을 모두 골라 주세요</p>
          <div className="ut-chips" role="group" aria-label="뜻이 와닿지 않은 말">
            {[...TERMS, '없었어요'].map((t, i) => {
              const n = i < TERMS.length ? i + 1 : 0;
              const on = terms.includes(n);
              return (
                <button key={t} type="button" aria-pressed={on} className={`ut-chip ${on ? 'on' : ''}`} onClick={() => toggleTerm(n)}>
                  {t}
                </button>
              );
            })}
          </div>
        </div>
        <label className="ut-q">
          <span className="ut-q-text">그 밖에 불편했던 점이 있다면 적어 주세요</span>
          <textarea className="ut-code ut-etc" rows={3} value={etc} onChange={(e) => setEtc(e.target.value)} placeholder="없다면 비워 두셔도 돼요" />
        </label>
        <button className="ut-btn primary wide" disabled={!done} onClick={() => onSubmit(scores as number[], terms.filter((x) => x > 0).sort((a, b) => a - b), etc.trim())}>
          제출하기
        </button>
      </div>
    </div>
  );
}

function Done({ code, onRestart }: { code: string; onRestart: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      const el = document.querySelector<HTMLTextAreaElement>('.ut-code');
      el?.select();
    }
  };
  return (
    <div className="ut ut-cover">
      <div className="ut-card">
        <p className="ut-eyebrow">모든 미션을 마쳤어요</p>
        <h1 className="ut-title">고마워요! 아래 결과 코드를 설문에 붙여 넣어 주세요</h1>
        <textarea className="ut-code" readOnly value={code} rows={3} onFocus={(e) => e.currentTarget.select()} />
        <button className="ut-btn primary wide" onClick={copy}>
          {copied ? '복사했어요' : '결과 코드 복사'}
        </button>
        <p className="ut-sub">설문을 끝까지 마치면 추첨 대상이 돼요.</p>
      </div>
      <button className="ut-link" onClick={onRestart}>
        처음부터 다시 하기
      </button>
    </div>
  );
}
