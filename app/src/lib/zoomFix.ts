/**
 * 목업을 창 높이에 맞추려고 문서(html)에 CSS zoom 을 걸면, Lightweight Charts 가
 * (clientX - getBoundingClientRect().left) 를 화면 픽셀 그대로 써서 차트 안 좌표가 zoom 배율만큼 어긋난다.
 * 차트 영역(.tv-wrap) 안에서만 이벤트 좌표와 요소 위치를 같은 배율로 나눠 줘서 맞춘다.
 */
let zoom = 1;
let installed = false;

const inChart = (t: EventTarget | null) => t instanceof Element && !!t.closest('.tv-wrap');

function scalePoint(o: object) {
  if ((o as { __z?: boolean }).__z) return;
  const p = o as { clientX: number; clientY: number; pageX: number; pageY: number };
  const { clientX, clientY, pageX, pageY } = p;
  Object.defineProperties(o, {
    clientX: { value: clientX / zoom, configurable: true },
    clientY: { value: clientY / zoom, configurable: true },
    pageX: { value: pageX / zoom, configurable: true },
    pageY: { value: pageY / zoom, configurable: true },
    __z: { value: true, configurable: true },
  });
}

function onEvent(e: Event) {
  if (zoom === 1 || !inChart(e.target)) return;
  if ('touches' in e) {
    const te = e as TouchEvent;
    for (const list of [te.touches, te.changedTouches, te.targetTouches]) for (const t of Array.from(list)) scalePoint(t);
  } else if ('clientX' in e) scalePoint(e);
}

function install() {
  if (installed) return;
  installed = true;
  const orig = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const r = orig.call(this);
    if (zoom === 1 || !this.closest('.tv-wrap')) return r;
    return new DOMRect(r.x / zoom, r.y / zoom, r.width / zoom, r.height / zoom);
  };
  const types = [
    'pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'pointerenter', 'pointerleave', 'pointerover', 'pointerout',
    'mousedown', 'mousemove', 'mouseup', 'mouseenter', 'mouseleave', 'mouseover', 'mouseout', 'click', 'dblclick', 'wheel', 'contextmenu',
    'touchstart', 'touchmove', 'touchend', 'touchcancel',
  ];
  for (const t of types) window.addEventListener(t, onEvent, { capture: true, passive: true });
}

/** html 에 건 zoom 배율을 알린다 (1 이면 아무것도 바꾸지 않음) */
export function setChartZoom(z: number) {
  zoom = z;
  if (z !== 1) install();
}
