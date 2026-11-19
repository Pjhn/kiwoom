import { useState } from 'react';
import chart1 from '../assets/charts/chart-1.svg';
import chart2 from '../assets/charts/chart-2.svg';
import chart3 from '../assets/charts/chart-3.svg';
import arrowDown from '../assets/icons/arrow-down-12-chart.svg';
import expand from '../assets/icons/expand.svg';
import settings from '../assets/icons/settings.svg';

const PERIODS = ['일', '주', '월', '년'];

export function MultiChart() {
  const [period, setPeriod] = useState('일');
  return (
    <div className="mchart">
      <div className="mchart-head">
        <div className="l">
          <button className="interval">
            <span>15분</span>
            <img src={arrowDown} alt="" />
          </button>
          {PERIODS.map((p) => (
            <button key={p} className={`text-btn ${p === period ? 'on' : ''}`} onClick={() => setPeriod(p)}>
              {p}
            </button>
          ))}
        </div>
        <div className="r">
          <button className="icon-32" aria-label="크게 보기">
            <img src={expand} alt="" />
          </button>
          <button className="icon-32" aria-label="차트 설정">
            <img src={settings} alt="" />
          </button>
        </div>
      </div>
      {[chart1, chart2, chart3].map((src, i) => (
        <div className="mchart-pane" key={i}>
          <img src={src} alt="" />
        </div>
      ))}
    </div>
  );
}
