import kakao46 from '../assets/icons/logo-kakao-46.svg';
import kakao46Ring from '../assets/icons/logo-kakao-46-ring.svg';
import kakao46Holding from '../assets/icons/logo-kakao-46-holding.svg';
import kakao24 from '../assets/icons/logo-kakao-24.svg';
import type { Stock } from '../lib/market';

/** 종목 로고. 카카오는 Figma 로고, 나머지는 글자 원형 로고 */
export function StockLogo({ stock, size, ring }: { stock: Stock; size: 46 | 24; ring?: boolean }) {
  if (stock.id === 'kakao') {
    const src = size === 24 ? kakao24 : ring ? kakao46Ring : kakao46;
    return <img className="logo" src={src} alt="" width={size} height={size} />;
  }
  const { bg, fg, text } = stock.logo;
  const inner = size === 46 ? 36 : size;
  return (
    <span className={`logo text-logo ${ring ? 'ring' : ''}`} style={{ width: size, height: size }} aria-hidden>
      <span
        style={{
          width: inner,
          height: inner,
          background: bg,
          color: fg,
          fontSize: size === 46 ? (text.length > 1 ? 12 : 15) : text.length > 1 ? 8 : 11,
        }}
      >
        {text}
      </span>
    </span>
  );
}

export const kakaoHoldingLogo = kakao46Holding;
