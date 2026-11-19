# 키움 주문 앱 (모바일 웹)

Figma 「키움 UX 개선」 파일의 주문 화면을 React + TypeScript(Vite)로 옮긴 작업물입니다. 데이터는 모두 목업입니다.

## 실행

```bash
npm install
npm run dev        # 개발 서버
npm run build      # 타입 검사 후 dist/ 빌드
npm run preview    # 빌드 결과 미리보기
```

- 폭 500px 이상 화면에서는 375px 아이폰 프레임(상태바와 홈 인디케이터 포함)으로 보입니다.
- `?frame=1` 은 프레임을 강제로 켜고, `?frame=0` 은 끕니다. Figma와 1:1로 비교할 때는 375 x 1097 창에서 `?frame=1` 로 엽니다.

## 구조

| 파일 | 내용 |
| --- | --- |
| `src/styles/base.css` | Figma 변수(색상), Pretendard, 기본 스타일 |
| `src/styles/app.css` | 화면 전체 스타일 |
| `src/lib/market.ts` | 목업 시세, 호가, 체결 데이터 |
| `src/components/Chrome.tsx` | 상태바, 상단 앱바, 계좌 바, 홈 인디케이터 |
| `src/components/OrderBook.tsx` | 좁은 호가(패널 열림), 넓은 호가(패널 닫힘) |
| `src/components/OrderPanel.tsx` | 구매/판매 주문 패널, 입력칸, 슬라이더, 토글 |
| `src/components/MultiChart.tsx` | 멀티 차트 |
| `src/components/OrderInfo.tsx` | 대기, 보유, 내역 탭 |
| `src/components/Overlays.tsx` | 주문 확인 바텀 시트, 스낵바 |
| `src/assets/` | Figma에서 내보낸 아이콘, 차트, 빈 화면 그래픽 |

## 동작

- 구매/판매 전환, 가격과 수량 입력(직접 입력, -/+ 버튼), 슬라이더로 가능 수량의 비율 선택
- 호가를 누르면 그 가격이 입력됨(패널이 닫혀 있으면 열림)
- 오른쪽 위 패널 버튼으로 주문 패널 열기/닫기, 왼쪽 아이콘 탭으로 호가와 차트 전환
- 구매하기 → 확인 시트(세부 사항 펼치기) → 접수 스낵바와 대기 목록
- 매도 1호가(31,750원) 이상 구매 주문은 약 2.5초 뒤 일부 체결, 5초 뒤 전량 체결되고 보유로 옮겨짐. 그보다 낮은 가격은 체결대기로 남음
- 체결되면 보유 탭이 빛나고 「보유 확인」을 누르면 보유 탭과 툴팁이 뜸
- 보유 종목을 누르면 판매 모드로 바뀌고 판매가능 수량이 채워짐
- 대기 주문은 하나씩 또는 「N건 취소」로 한꺼번에 취소, 취소와 체결 결과는 내역 탭에 쌓임

## 아직 없는 것

- 주문 유형(지정가) 드롭다운, 일반주문 드롭다운, 주문 안내, AI 도우미: 시안이 정해지면 추가
- Capacitor 앱 포장
