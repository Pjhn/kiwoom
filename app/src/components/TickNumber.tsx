/**
 * 금액이 바뀌면 값이 달라진 자리만 아래에서 살짝 올라온다.
 * 자리는 오른쪽(일의 자리)부터 세어, 자릿수가 늘어도 그대로인 자리는 움직이지 않는다.
 */
export function TickNumber({ value, className }: { value: number; className?: string }) {
  const text = Math.round(value).toLocaleString('ko-KR');
  const n = text.length;
  return (
    <span className={`tick-num ${className ?? ''}`} aria-label={text} role="img">
      {text.split('').map((c, i) => (
        <span key={`${n - i}-${c}`} className={/\d/.test(c) ? 'tick-d' : 'tick-sep'} aria-hidden>
          {c}
        </span>
      ))}
    </span>
  );
}
