import type { IPanePrimitive, PaneAttachedParameter, Time } from 'lightweight-charts';
import type { CanvasRenderingTarget2D } from 'fancy-canvas';

/**
 * TradingView 차트의 기존 격자선에만 터치 위치 중심 그라데이션을 입힌다.
 * 격자를 그린 직후(시리즈를 그리기 전) 캔버스에 source-atop 으로 원형 그라데이션을 덮어,
 * 이미 그려진 격자 픽셀만 물들인다. 차트 배경이 투명이어야 한다.
 */
export class GridGlow implements IPanePrimitive<Time> {
  private x = 0;
  private y = 0;
  private tx = 0;
  private ty = 0;
  private a = 0;
  private ta = 0;
  private raf = 0;
  private request: (() => void) | null = null;

  attached({ requestUpdate }: PaneAttachedParameter<Time>) {
    this.request = requestUpdate;
  }
  detached() {
    cancelAnimationFrame(this.raf);
    this.request = null;
  }

  /** 패인 기준 좌표 */
  move(x: number, y: number) {
    if (this.a < 0.02) {
      this.x = x;
      this.y = y;
    }
    this.tx = x;
    this.ty = y;
    this.ta = 1;
    this.kick();
  }
  hide() {
    this.ta = 0;
    this.kick();
  }

  private kick() {
    if (this.raf) return;
    const step = () => {
      this.x += (this.tx - this.x) * 0.25;
      this.y += (this.ty - this.y) * 0.25;
      this.a += (this.ta - this.a) * 0.15;
      this.request?.();
      const done = Math.abs(this.tx - this.x) < 0.5 && Math.abs(this.ty - this.y) < 0.5 && Math.abs(this.ta - this.a) < 0.01;
      if (done) {
        this.a = this.ta;
        this.raf = 0;
        this.request?.();
      } else this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  private readonly view = {
    zOrder: () => 'normal' as const,
    renderer: () => ({
      draw: () => {},
      drawBackground: (target: CanvasRenderingTarget2D) => {
        if (this.a < 0.01) return;
        target.useBitmapCoordinateSpace(({ context: ctx, horizontalPixelRatio: hr, verticalPixelRatio: vr }) => {
          const cx = this.x * hr;
          const cy = this.y * vr;
          const r = 120 * hr;
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          g.addColorStop(0, `rgba(229,0,125,${0.38 * this.a})`);
          g.addColorStop(0.45, `rgba(229,0,125,${0.16 * this.a})`);
          g.addColorStop(1, 'rgba(229,0,125,0)');
          ctx.save();
          ctx.globalCompositeOperation = 'source-atop';
          ctx.fillStyle = g;
          ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
          ctx.restore();
        });
      },
    }),
  };
  paneViews() {
    return [this.view];
  }
}
