import { type CSSProperties, useEffect, useRef, useState } from 'react';

const STRIP = Array.from({ length: 30 }, (_, i) => i % 10);

/**
 * 숫자가 바뀌면 자리마다 슬롯머신처럼 굴러서 멈춘다.
 * 오른쪽 자리일수록 조금 늦게 멈춰 릴이 차례로 서는 느낌을 준다.
 */
export function SlotNumber({ value, className }: { value: number; className?: string }) {
  const text = Math.round(value).toLocaleString('ko-KR');
  const prev = useRef(text);
  const [spin, setSpin] = useState(0);
  useEffect(() => {
    if (prev.current !== text) {
      prev.current = text;
      setSpin((s) => s + 1);
    }
  }, [text]);
  const chars = text.split('');
  let di = 0;
  return (
    <span className={`slot ${className ?? ''}`} aria-label={text} role="img">
      {chars.map((c, i) => {
        if (!/\d/.test(c)) {
          return (
            <span key={`s${i}`} className="slot-sep" aria-hidden>
              {c}
            </span>
          );
        }
        const d = Number(c);
        const order = di++;
        const delay = spin === 0 ? 0 : order * 55;
        const dur = spin === 0 ? 0 : 520 + order * 70;
        return (
          <span key={`d${i}-${spin}`} className="slot-col" aria-hidden>
            <span
              className="slot-strip"
              style={
                spin === 0
                  ? { transform: `translateY(${-(d + 20) * 1.2}em)` }
                  : ({
                      '--from': `${-d * 1.2}em`,
                      '--to': `${-(d + 20) * 1.2}em`,
                      animationDuration: `${dur}ms`,
                      animationDelay: `${delay}ms`,
                    } as CSSProperties)
              }
            >
              {STRIP.map((n, k) => (
                <span key={k}>{n}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
