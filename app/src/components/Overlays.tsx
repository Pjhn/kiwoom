import { useState } from 'react';
import logo24 from '../assets/icons/logo-kakao-24.svg';
import arrowDown12 from '../assets/icons/arrow-down-12.svg';
import arrowUp12 from '../assets/icons/arrow-up-12.svg';
import check from '../assets/icons/check.svg';
import { STOCK, fmt } from '../lib/market';
import type { Side } from './OrderPanel';

export function ConfirmSheet({
  side,
  price,
  qty,
  onCancel,
  onConfirm,
}: {
  side: Side;
  price: number;
  qty: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [detail, setDetail] = useState(false);
  const verb = side === 'buy' ? '구매' : '판매';
  return (
    <div className="sheet-layer">
      <div className="dim" onClick={onCancel} />
      <div className={`sheet ${detail ? 'detail' : ''}`} role="dialog" aria-modal="true" aria-label={`${verb} 확인`}>
        <span className="handle" />
        <div className="sheet-text">
          <p>
            <img src={logo24} alt="" width={24} height={24} />
            <b>{STOCK.name}</b>
            <span> 주식을</span>
          </p>
          <p>
            <b>{fmt(price)}</b>
            <span> 원에</span>
          </p>
          <p>
            <b>{qty}</b>
            <span> 주 {verb}할게요</span>
          </p>
          <p className="approx">≈ {fmt(price * qty)}원</p>
        </div>
        {detail && (
          <dl className="sheet-detail">
            <div>
              <dt>종목명</dt>
              <dd>{STOCK.name}</dd>
            </div>
            <div>
              <dt>거래소</dt>
              <dd>SOR(스마트 주문)</dd>
            </div>
            <div>
              <dt>주문유형</dt>
              <dd>지정가 {side === 'buy' ? '매수' : '매도'}</dd>
            </div>
            <div>
              <dt>주문가격</dt>
              <dd>{fmt(price)} 원</dd>
            </div>
            <div>
              <dt>주문수량</dt>
              <dd>{qty} 주</dd>
            </div>
          </dl>
        )}
        <button className="sheet-toggle" onClick={() => setDetail(!detail)}>
          {detail ? '접기' : '세부 사항'}
          <img src={detail ? arrowUp12 : arrowDown12} alt="" />
        </button>
        <div className="sheet-btns">
          <button className="secondary" onClick={onCancel}>
            취소
          </button>
          <button className={`primary ${side}`} onClick={onConfirm}>
            {verb}하기
          </button>
        </div>
      </div>
    </div>
  );
}

export type Snack = { id: number; text: string; action: string; onAction: () => void };

export function SnackBar({ snack }: { snack: Snack }) {
  return (
    <div className="snack" role="status" key={snack.id}>
      <img src={check} alt="" />
      <p>{snack.text}</p>
      <button onClick={snack.onAction}>{snack.action}</button>
    </div>
  );
}
