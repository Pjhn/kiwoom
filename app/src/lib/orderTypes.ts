import { type Market, bestAsk as askOf, bestBid as bidOf, snap } from './market';
import type { Side } from '../components/OrderPanel';

export type OrderType = 'limit' | 'market' | 'mid' | 'best' | 'priority' | 'conditional';

export const ORDER_TYPES: { key: OrderType; label: string; desc: string[]; group: 'basic' | 'detail' }[] = [
  { key: 'limit', label: '지정가', desc: ['원하는 가격을 정해 사고 팔 수 있어요.'], group: 'basic' },
  { key: 'market', label: '시장가', desc: ['지금 바로 사고팔 수 있는 가격에 거래해요.'], group: 'basic' },
  { key: 'mid', label: '중간가', desc: ['지금 가장 비싸게 사려는 가격과 가장 싸게 팔려는 가격의 평균으로 주문해요.'], group: 'detail' },
  { key: 'best', label: '최유리 지정가', desc: ['살 때는 가장 싸게 팔려는 가격, 팔 때는 가장 비싸게 팔리는 가격으로 주문해요.'], group: 'detail' },
  { key: 'priority', label: '최우선 지정가', desc: ['살 때는 가장 비싸게 사려는 가격, 팔 때는 가장 싸게 팔리는 가격으로 주문해요.'], group: 'detail' },
  {
    key: 'conditional',
    label: '조건부 지정가',
    desc: ['장중에는 정한 가격으로 주문하고,', '장 끝날 때까지 거래되지 않으면 마감 때 시장가로 바뀌어 거래돼요.'],
    group: 'detail',
  },
];

export const typeLabel = (t: OrderType) => ORDER_TYPES.find((o) => o.key === t)!.label;

/** 직접 가격을 입력하는 주문유형인지 */
export const isUserPriced = (t: OrderType) => t === 'limit' || t === 'conditional';

/** 가격을 시장이 정하는 주문유형의 기준 가격 (호가 기준) */
export function autoPrice(t: OrderType, side: Side, m: Market): number {
  const bestAsk = askOf(m);
  const bestBid = bidOf(m);
  switch (t) {
    case 'market':
    case 'best':
      return side === 'buy' ? bestAsk : bestBid;
    case 'priority':
      return side === 'buy' ? bestBid : bestAsk;
    case 'mid':
      return snap((bestAsk + bestBid) / 2);
    default:
      return bestAsk;
  }
}
