import { useState } from 'react';
import { CLARITY_ON, MISSIONS, resultCode, type UtApi } from './useUt';
import './ut.css';

const SEQ_LABELS = ['매우 어려웠어요', '', '', '보통이에요', '', '', '매우 쉬웠어요'];

/** 미션 안내: 폰에서는 화면 아래 막대, PC 목업에서는 폰 오른쪽 카드 */
export function UtBar({ ut, side = false }: { ut: UtApi; side?: boolean }) {
  if (!ut.on || (ut.phase !== 'run' && ut.phase !== 'answer')) return null;
  return (
    <div className={`ut ut-bar ${side ? 'ut-side' : 'ut-bottom'}`} role="region" aria-label="미션 안내">
      {ut.answerMsg && <p className="ut-bar-msg">{ut.answerMsg}</p>}
      <div className="ut-bar-row">
        <span className="ut-bar-no">
          미션 {ut.m}
          {side && ` / ${MISSIONS.length}`}
        </span>
        <p className="ut-bar-text">{MISSIONS[ut.m - 1]}</p>
      </div>
      <div className="ut-bar-actions">
        <button className="ut-btn ghost" onClick={ut.giveUp}>
          잘 모르겠어요
        </button>
        {ut.m === 4 && (
          <button className="ut-btn primary" onClick={ut.openAnswer}>
            찾았어요
          </button>
        )}
      </div>
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
    case 'answer':
      return <Answer onClose={ut.closeAnswer} onSubmit={ut.answer} />;
    case 'done':
      return <Done code={resultCode(ut.pid, ut.results)} onRestart={ut.restart} />;
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
          {m === 4
            ? '찾았으면 아래 [찾았어요]를 눌러 가격을 적어 주세요.'
            : '다 하면 자동으로 다음 미션으로 넘어가요.'}
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

function Answer({ onClose, onSubmit }: { onClose: () => void; onSubmit: (v: number) => void }) {
  const [v, setV] = useState('');
  const n = Number(v.replace(/[^0-9]/g, ''));
  return (
    <div className="ut ut-cover dim">
      <form
        className="ut-card"
        onSubmit={(e) => {
          e.preventDefault();
          if (n > 0) onSubmit(n);
        }}
      >
        <p className="ut-eyebrow">미션 4</p>
        <h1 className="ut-title">한 주에 얼마에 팔렸나요?</h1>
        <label className="ut-input">
          <input
            autoFocus
            inputMode="numeric"
            value={v ? Number(v.replace(/[^0-9]/g, '') || 0).toLocaleString('ko-KR') : ''}
            onChange={(e) => setV(e.target.value)}
            placeholder="가격"
            aria-label="팔린 가격"
          />
          <span>원</span>
        </label>
        <div className="ut-row">
          <button type="button" className="ut-btn ghost" onClick={onClose}>
            다시 볼게요
          </button>
          <button type="submit" className="ut-btn primary" disabled={!(n > 0)}>
            확인
          </button>
        </div>
      </form>
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
