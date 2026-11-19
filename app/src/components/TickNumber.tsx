import { useRef } from 'react';

/**
 * 금액이 바뀌면 값이 달라진 자리만 새 숫자가 아래에서 올라오고, 이전 숫자는 위로 밀려난다.
 * 두 숫자가 함께 움직여 자리가 비는 순간이 없으므로 깜빡이지 않는다.
 * 자리는 오른쪽(일의 자리)부터 세어, 자릿수가 늘어도 그대로인 자리는 움직이지 않는다.
 */
export function TickNumber({ value, className }: { value: number; className?: string }) {
  const text = Math.round(value).toLocaleString('ko-KR');
  // 값이 바뀔 때만 이전 값을 기억한다 (다른 이유로 다시 그려져도 굴러가던 자리가 끊기지 않게)
  const pair = useRef({ from: text, to: text });
  if (pair.current.to !== text) pair.current = { from: pair.current.to, to: text };
  const before = pair.current.from;
  const n = text.length;
  const m = before.length;
  return (
    <span className={`tick-num ${className ?? ''}`} aria-label={text} role="img">
      {text.split('').map((c, i) => {
        const place = n - i;
        if (!/\d/.test(c)) {
          return (
            <span key={`s${place}`} className="tick-sep" aria-hidden>
              {c}
            </span>
          );
        }
        const old = before[m - place];
        const changed = old !== c;
        return (
          <span key={`${place}-${c}`} className={`tick-d ${changed ? 'roll' : ''}`} aria-hidden>
            {changed && old && /\d/.test(old) && <span className="tick-old">{old}</span>}
            <span className="tick-new">{c}</span>
          </span>
        );
      })}
    </span>
  );
}
