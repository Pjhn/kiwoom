import { useState, type ReactNode } from 'react';
import { CLARITY_ON, MISSIONS, SURVEY, TERMS, type UtApi } from './useUt';
import './ut.css';

const SEQ_LABELS = ['매우 어려웠어요', '', '', '보통이에요', '', '', '매우 쉬웠어요'];

/**
 * 미션 안내 (화면을 가리지 않는다)
 * - PC 목업: 폰 오른쪽 카드
 * - 폰: 지난 UT 처럼 화면 위쪽 막대. 누르면 미션 내용이 펼쳐진다. 미션이 끝나면 막대 색이 바뀌고, 눌러서 쉬움 점수를 남긴다
 */
export function UtBar({ ut, side = false }: { ut: UtApi; side?: boolean }) {
  if (!ut.on || (ut.phase !== 'run' && ut.phase !== 'rate')) return null;
  if (!side) return <UtPill key={ut.m} ut={ut} />;
  return (
    <div className="ut ut-bar ut-side" role="region" aria-label="미션 안내">
      <PanelBody ut={ut} />
    </div>
  );
}

function PanelBody({ ut }: { ut: UtApi }) {
  if (ut.phase === 'rate') return <RateBody ok={ut.pendingOk} onRate={ut.rate} />;
  return (
    <>
      <div className="ut-bar-row">
        <span className="ut-bar-no">
          미션 {ut.m} / {MISSIONS.length}
        </span>
        <p className="ut-bar-text">{MISSIONS[ut.m - 1]}</p>
      </div>
      <div className="ut-bar-actions">
        <button className="ut-btn ghost" onClick={ut.giveUp}>
          잘 모르겠어요, 넘어갈게요
        </button>
      </div>
    </>
  );
}

/** 1차 UT 처럼 어느 화면에서든 떠오르는 불편을 바로 적어 보내는 칸 */
export function UtFeedback({ ut, dark = false }: { ut: UtApi; dark?: boolean }) {
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  if (!ut.on) return null;
  const v = text.trim();
  return (
    <form
      className={`ut-fb ${dark ? 'dark' : ''}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!v) return;
        ut.feedback(v);
        setText('');
        setSent(true);
      }}
    >
      <label className="ut-fb-label">
        <span>불편한 점이 있었나요?</span>
        <small>언제든 떠오르는 대로 짧게 적어 주세요</small>
        <span className="ut-fb-row">
          <textarea
            rows={1}
            value={text}
            placeholder="예: 가격 바꾸는 곳이 헷갈렸어요"
            onChange={(e) => {
              setText(e.target.value);
              setSent(false);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
          />
          <button className="ut-fb-send" type="submit" disabled={!v}>
            보내기
          </button>
        </span>
      </label>
      {sent && <p className="ut-fb-sent">의견을 받았어요. 고마워요!</p>}
    </form>
  );
}

function UtPill({ ut }: { ut: UtApi }) {
  const rating = ut.phase === 'rate';
  // 미션 중에 펼쳐 둔 내용은 완료되면 접는다 (화면을 가리지 않게)
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === ut.phase;
  const setOpen = (v: boolean) => setOpenFor(v ? ut.phase : null);
  const shown = open;
  return (
    <div className="ut ut-pill-wrap">
      <button className={`ut-pill ${rating ? 'done' : ''}`} aria-expanded={shown} onClick={() => setOpen(!shown)}>
        <span className="ut-pill-no">{rating && ut.pendingOk ? `미션 ${ut.m} 완료` : `미션 ${ut.m}`}</span>
        <span className="ut-pill-text">{rating ? '눌러서 점수를 남겨 주세요' : MISSIONS[ut.m - 1]}</span>
        <span className="ut-pill-ar" aria-hidden>{shown ? '접기 ▴' : rating ? '점수 남기기 ▾' : '내용 보기 ▾'}</span>
      </button>
      {shown && (
        <div className="ut-bar ut-pop" role="region" aria-label="미션 안내">
          <PanelBody ut={ut} />
          <UtFeedback ut={ut} dark />
        </div>
      )}
    </div>
  );
}

function RateBody({ ok, onRate }: { ok: boolean | null; onRate: (n: number) => void }) {
  return (
    <>
      <div className="ut-bar-row">
        <span className="ut-bar-no">{ok ? '미션 완료' : '다음으로 넘어갈게요'}</span>
        <p className="ut-bar-text">방금 미션은 얼마나 쉬웠나요?</p>
      </div>
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
    </>
  );
}

/** 시작 안내, 미션 카드, 쉬움 점수, 정답 입력, 결과 코드 (화면 전체를 덮는 층) */
/**
 * 시작 안내, 미션 카드, 화면 평가, 완료 화면
 * - 폰: 화면 전체를 덮는다
 * - PC 목업(side): 폰 오른쪽 카드로 띄우고, 폰 화면은 흐리게 막아 둔다 (CSS 의 .ut-in)
 */
export function UtLayer({ ut, side = false }: { ut: UtApi; side?: boolean }) {
  if (!ut.on) return null;
  const cls = side ? 'ut ut-aside' : 'ut ut-cover ut-in';
  switch (ut.phase) {
    case 'rate':
      // 미션 완료: 프로토타입을 흐리게 막고, 점수는 토글(폰은 위쪽 막대, PC 는 오른쪽 카드)에서 고른다
      return side ? null : (
        <Veil ut={ut}>
          <span className="ut-veil-text ut-veil-phone">위쪽 분홍 막대를 눌러 점수를 남겨 주세요</span>
          <span className="ut-veil-text ut-veil-desk">오른쪽에서 점수를 남겨 주세요 →</span>
        </Veil>
      );
    case 'intro':
      return <Intro cls={cls} onStart={ut.start} />;
    case 'ready':
      return <Ready cls={cls} m={ut.m} onBegin={ut.begin} fb={side ? null : <UtFeedback ut={ut} />} />;
    case 'survey':
      // PC 목업은 오른쪽 카드에서 답하고, 폰 화면은 흐리게 두되 토글로 다시 볼 수 있다
      if (side) return <SurveyCard cls={`${cls} ut-scroll`} onSubmit={ut.submitSurvey} />;
      return (
        <>
          <SurveyCard cls="ut ut-cover ut-scroll ut-phone-only" onSubmit={ut.submitSurvey} />
          <Veil ut={ut} deskOnly>
            <span className="ut-veil-text">오른쪽 질문에 답해 주세요 →</span>
          </Veil>
        </>
      );
    case 'done':
<<<<<<< HEAD
      return <Done cls={cls} fb={side ? null : <UtFeedback ut={ut} />} />;
=======
      return <Done cls={cls} />;
>>>>>>> origin/main
    default:
      return null;
  }
}

/** 지난 UT 처럼 「화면 흐리게」 스위치로 프로토타입을 가렸다 보였다 한다. 보일 때도 누르기는 막는다 */
function Veil({ ut, deskOnly = false, children }: { ut: UtApi; deskOnly?: boolean; children: ReactNode }) {
  return (
    <div className={`ut ut-veil ${ut.blur ? '' : 'off'} ${deskOnly ? 'ut-desk-only' : ''}`}>
      {ut.blur && children}
      <label className="ut-blur-t">
        <span>화면 흐리게</span>
        <input type="checkbox" checked={ut.blur} onChange={(e) => ut.setBlur(e.target.checked)} />
        <i aria-hidden />
      </label>
    </div>
  );
}

function Intro({ cls, onStart }: { cls: string; onStart: () => void }) {
  return (
    <div className={cls}>
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
            <li>이 프로토타입 안에서 누른 위치와 움직임이 익명으로 녹화돼요. 기기의 다른 화면이나 앱은 녹화되지 않아요. 녹화 도구(Microsoft Clarity)는 쿠키를 사용해요.</li>
          )}
        </ul>
        <button className="ut-btn primary wide" onClick={onStart}>
          {CLARITY_ON ? '동의하고 시작할게요' : '시작할게요'}
        </button>
      </div>
    </div>
  );
}

function Ready({ cls, m, onBegin, fb }: { cls: string; m: number; onBegin: () => void; fb: ReactNode }) {
  return (
    <div className={cls}>
      <div className="ut-card">
        <p className="ut-eyebrow">
          미션 {m} / {MISSIONS.length}
        </p>
        <h1 className="ut-title">{MISSIONS[m - 1]}</h1>
        <p className="ut-sub">
          다 하면 자동으로 다음 미션으로 넘어가요.
        </p>
        <button className="ut-btn primary wide" onClick={onBegin}>
          미션 시작
        </button>
      </div>
<<<<<<< HEAD
      {fb}
=======
>>>>>>> origin/main
    </div>
  );
}

/** 화면 평가 6문항 (1차 UT 와 같은 문항, 1 전혀 아니에요 ~ 5 매우 그래요) */
function SurveyCard({ cls, onSubmit }: { cls: string; onSubmit: (scores: number[], terms: number[], etc: string) => void }) {
  const [scores, setScores] = useState<(number | null)[]>(() => SURVEY.map(() => null));
  const [etc, setEtc] = useState('');
  // 고른 말 번호 (1부터). 0 은 「없었어요」로 다른 보기와 함께 고를 수 없다
  const [terms, setTerms] = useState<number[]>([]);
  const toggleTerm = (n: number) =>
    setTerms((t) => (n === 0 ? (t.includes(0) ? [] : [0]) : t.includes(n) ? t.filter((x) => x !== n) : [...t.filter((x) => x !== 0), n]));
  const done = scores.every((v) => v != null) && terms.length > 0;
  return (
    <div className={cls}>
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

<<<<<<< HEAD
function Done({ cls, fb }: { cls: string; fb: ReactNode }) {
=======
function Done({ cls }: { cls: string }) {
>>>>>>> origin/main
  return (
    <div className={cls}>
      <div className="ut-card">
        <p className="ut-eyebrow">모든 미션을 마쳤어요</p>
        <h1 className="ut-title">참여해 주셔서 감사합니다!</h1>
        <p className="ut-sub">보내 주신 답변은 주문 화면을 더 쉽게 만드는 데 쓰여요. 이제 창을 닫으셔도 돼요.</p>
      </div>
<<<<<<< HEAD
      {fb}
=======
>>>>>>> origin/main
    </div>
  );
}
