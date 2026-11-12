/* ═════════ A안(현행) 프로토타입 ═════════
   정훈 님이 준 현행 주문 화면 캡처 12장을 기준으로 재현. 계좌번호·보유 종목은 가상 값.
   인터페이스는 B안과 같음: PROTOTYPES.A.mount(device, taskId, hooks) */
(function(){
const css = `
.ka{position:absolute;inset:0;display:flex;flex-direction:column;background:#fff;color:#222;font-size:15px;letter-spacing:-.01em}
.ka button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
.ka .k-top{background:#2F2D6B;color:#fff;flex:none}
.ka .k-sb{height:30px;display:flex;justify-content:space-between;align-items:center;padding:0 22px 0 26px;font-size:14px;font-weight:600}
.ka .k-nav{height:56px;display:flex;align-items:center;gap:16px;padding:0 6px 0 10px;white-space:nowrap;overflow:hidden}
.ka .k-nav .back{font-size:24px;width:28px;opacity:.85}
.ka .k-nav .t{font-size:16px;color:rgba(255,255,255,.55);font-weight:600}
.ka .k-nav .t.on{color:#fff;font-weight:800}
.ka .k-nav .more{margin-left:auto;font-size:20px;font-weight:800;width:20px}
.ka .k-stock{display:flex;gap:8px;padding:8px 8px 0;align-items:stretch;flex:none}
.ka .k-sbox{flex:1;display:flex;border:1px solid #C9CCD3;border-radius:4px;height:50px}
.ka .k-sbox .nm{flex:1;padding:4px 8px;display:flex;flex-direction:column;justify-content:center;position:relative}
.ka .k-sbox .nm b{font-size:16px;display:flex;align-items:center;gap:6px}
.ka .k-sbox .nm b i{color:#F7C531;font-style:normal;font-size:18px}
.ka .k-sbox .nm small{font-size:11px;color:#333;display:flex;gap:6px;align-items:center}
.ka .k-sbox .nm small em{font-style:normal;border:1px solid #2E8B57;color:#2E8B57;font-size:9px;padding:0 2px}
.ka .k-sbox .nm .dd{position:absolute;right:8px;top:16px;color:#777;font-size:12px}
.ka .k-sbox .sr{width:38px;border-left:1px solid #C9CCD3;display:flex;align-items:center;justify-content:center}
.ka .k-px{width:96px;text-align:right;display:flex;flex-direction:column;justify-content:center}
.ka .k-px b{font-size:23px;font-weight:700;letter-spacing:-.02em}
.ka .k-px small{font-size:12px;display:flex;justify-content:space-between;padding-left:4px}
.ka .up{color:#E0245E}.ka .dn{color:#2350D8}
.ka .k-acct{display:flex;gap:6px;padding:8px 8px 0;flex:none}
.ka .k-acct>*{border:1px solid #C9CCD3;border-radius:4px;height:38px;display:flex;align-items:center;padding:0 8px;font-size:15px}
.ka .k-acct .a1{width:52px;gap:6px}.ka .k-acct .a1 i{width:5px;height:5px;border-radius:50%;background:#C9527E;display:block}
.ka .k-acct .a2{flex:1;justify-content:space-between;color:#333}
.ka .k-acct .a3{width:86px;justify-content:center;letter-spacing:2px;color:#444;font-size:13px}
.ka .k-tabs{display:flex;flex:none;height:42px;margin-top:4px;border-bottom:1px solid #E6C9D4}
.ka .k-tabs button{flex:1;font-size:15px;color:#9A9AA2;font-weight:500;position:relative}
.ka .k-tabs button.on{color:#E0336B;font-weight:800}
.ka .k-tabs button.on2{color:#2F2D6B;font-weight:800}
.ka .k-tabs button.on2::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;background:#2F2D6B}
.ka .k-body{flex:1;min-height:0;display:flex;position:relative}
.ka .k-book{width:127px;flex:none;display:flex;flex-direction:column;border-right:1px solid #E6C9D4}
.ka .k-bh{height:30px;display:flex;font-size:13px;color:#555;border-bottom:1px solid #ddd;flex:none}
.ka .k-bh span{flex:1;display:flex;align-items:center;justify-content:center}
.ka .k-bh span:first-child{border-right:1px solid #e5e5e5}
.ka .k-bl{flex:1;overflow-y:auto;scrollbar-width:none}
.ka .k-bl::-webkit-scrollbar{display:none}
.ka .k-row{display:flex;height:45px;width:100%;align-items:center;font-variant-numeric:tabular-nums}
.ka .k-row.s{background:#EEF4FD}.ka .k-row.b{background:#FDF1F5}
.ka .k-row .p{width:76px;text-align:right;padding-right:6px;font-size:15px;height:100%;display:flex;align-items:center;justify-content:flex-end;border-right:1px solid rgba(0,0,0,.05);box-sizing:border-box}
.ka .k-row.cur .p{outline:1.5px solid #C9527E;outline-offset:-2px}
.ka .k-row.pick .p{background:rgba(47,45,107,.08)}
.ka .k-row .v{flex:1;text-align:right;padding-right:6px;font-size:12.5px;height:100%;display:flex;align-items:center;justify-content:flex-end;position:relative}
.ka .k-row .v i{position:absolute;left:0;top:6px;bottom:6px;background:rgba(35,80,216,.10)}
.ka .k-row.b .v i{background:rgba(224,36,94,.10)}
.ka .k-form{flex:1;min-width:0;display:flex;flex-direction:column;background:#FFF8FA}
.ka .k-f{padding:9px 8px 0 8px;display:flex;flex-direction:column;gap:8px}
.ka .k-line{display:flex;gap:7px}
.ka .k-seg{display:flex;width:150px;height:42px;border:1px solid #C9CCD3;border-radius:4px;background:#F2F2F4;overflow:hidden}
.ka .k-seg button{flex:1;font-size:16px;color:#555}
.ka .k-seg button.on{background:#fff;border:1.5px solid #2F2D6B;border-radius:4px;font-weight:800;color:#222}
.ka .k-sel{width:150px;height:42px;border:1px solid #C9CCD3;border-radius:4px;background:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 10px;font-size:16px}
.ka .k-sel::after{content:"";border:6px solid transparent;border-top:7px solid #555;margin-top:6px}
.ka .k-sel.sm{width:75px;font-size:15px}
.ka .k-num{width:150px;height:42px;border:1px solid #C9CCD3;border-radius:4px;background:#fff;display:flex}
.ka .k-num .pm{width:31px;font-size:18px;color:#666;border-right:1px solid #C9CCD3}
.ka .k-num .pm:last-child{border-right:0;border-left:1px solid #C9CCD3}
.ka .k-num .val{flex:1;display:flex;align-items:center;justify-content:flex-end;padding-right:6px;font-size:16px;color:#222;min-width:0;overflow:hidden;white-space:nowrap}
.ka .k-num .val.kph{color:#BBB}
.ka .k-num .val.y{background:#FFF6CC}
.ka .k-num .val.dis{background:#F2F2F2;color:#999;justify-content:center;padding:0}
.ka .k-btn{width:74px;height:42px;border:1px solid #C9CCD3;border-radius:4px;background:#fff;font-size:15px;display:flex;align-items:center;justify-content:center;gap:2px}
.ka .k-btn.on{border-color:#2F2D6B;color:#2F2D6B;font-weight:700}
.ka .k-chk{display:flex;align-items:center;gap:5px;font-size:14px;white-space:nowrap}
.ka .k-chk i{width:16px;height:16px;border:1px solid #BFC3CA;border-radius:4px;background:#fff;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:11px;color:#fff}
.ka .k-chk.on i{background:#2F2D6B;border-color:#2F2D6B}
.ka .k-bottom{margin-top:auto}
.ka .k-amt{height:33px;display:flex;align-items:center;border-top:1px solid #EBD9E0;font-size:13px;background:#fff}
.ka .k-amt .x{width:32px;height:100%;background:#F3F3F5;display:flex;align-items:center;justify-content:center;font-size:12px}
.ka .k-amt .l{padding-left:6px;color:#444;display:flex;gap:3px;align-items:center}
.ka .k-amt .l i{width:13px;height:13px;border-radius:50%;background:#BBB;color:#fff;font-size:9px;font-style:normal;display:flex;align-items:center;justify-content:center}
.ka .k-amt .r{margin-left:auto;padding-right:6px;color:#E0245E;font-weight:700;font-size:15px}
.ka .k-buyrow{display:flex;height:50px}
.ka .k-buy{flex:1;background:#C9527E;color:#fff!important;font-size:18px;font-weight:800}
.ka .k-ono{width:62px;background:#fff;border-top:1px solid #EBD9E0;display:flex;align-items:center;justify-content:center;font-size:12px;color:#888}
.ka .k-tick{height:28px;flex:none;display:flex;align-items:center;gap:8px;padding:0 6px;border-top:1px solid #eee;font-size:12.5px;white-space:nowrap;overflow:hidden;background:#FAFAFB}
.ka .k-tick span{border:1px solid #E58BB0;border-radius:12px;padding:1px 6px;font-size:10px;color:#C9527E;flex:none}
.ka .k-bnav{height:52px;flex:none;display:flex;align-items:center;gap:0;padding:0 6px;border-top:1px solid #eee}
.ka .k-bnav .menu{width:46px;height:42px;border-radius:5px;background:#C9527E;color:#fff!important;font-size:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;margin-right:6px}
.ka .k-bnav .menu b{display:block;width:16px;height:2px;background:#fff;box-shadow:0 -5px #fff,0 5px #fff;margin:6px 0 4px}
.ka .k-bnav .n{flex:1;font-size:13.5px;color:#999}
.ka .k-bnav .n.on{color:#222;font-weight:800}
.ka .k-home{height:22px;flex:none;background:#F3F3F5}
.ka .k-dim{position:absolute;inset:0;background:rgba(0,0,0,.4);z-index:20}
.ka .k-sheet{position:absolute;left:0;right:0;bottom:0;top:178px;background:#fff;border-radius:16px 16px 0 0;z-index:21;display:flex;flex-direction:column;overflow:hidden}
.ka .k-sheet .hd{height:58px;flex:none;display:flex;align-items:center;padding:0 14px;border-bottom:1px solid #ddd;font-size:20px;font-weight:800;gap:6px}
.ka .k-sheet .hd i{width:16px;height:16px;border-radius:50%;background:#BBB;color:#fff;font-size:11px;font-style:normal;display:flex;align-items:center;justify-content:center}
.ka .k-sheet .hd .gear{margin-left:auto;font-size:20px;color:#666;font-weight:400}
.ka .k-sheet .bd{flex:1;display:flex;min-height:0}
.ka .k-sheet .lst{width:86px;flex:none;border-right:1px solid #ddd;display:flex;flex-direction:column;overflow-y:auto;scrollbar-width:none}
.ka .k-sheet .lst::-webkit-scrollbar{display:none}
.ka .k-sheet .lim{padding:4px 8px;font-size:12px;flex:none}
.ka .k-sheet .lim b{display:block;font-size:15px}
.ka .k-sheet .lim.u{background:#FDECF2;color:#E0245E}.ka .k-sheet .lim.d{background:#EEF4FD;color:#2350D8}
.ka .k-sheet .sp{display:block;text-align:right;padding:3px 6px;height:43px;flex:none;font-variant-numeric:tabular-nums}
.ka .k-sheet .sp b{display:block;font-size:15px;font-weight:500}
.ka .k-sheet .sp small{font-size:12px}
.ka .k-sheet .sp.cur{outline:1.5px solid #C9527E;outline-offset:-1.5px}
.ka .k-sheet .rt{flex:1;min-width:0;display:flex;flex-direction:column}
.ka .k-sheet .fl{padding:14px 14px 0;display:flex;flex-direction:column;gap:9px}
.ka .k-sheet .fr{display:flex;align-items:center}
.ka .k-sheet .fr label{width:68px;font-size:15px;color:#222}
.ka .k-sheet .fb{flex:1;height:37px;border:1px solid #C9CCD3;border-radius:4px;display:flex;background:#fff}
.ka .k-sheet .fb.f{border:1.5px solid #2F2D6B}
.ka .k-sheet .fb .pm{width:33px;font-size:18px;color:#777}
.ka .k-sheet .fb .pm:first-child{border-right:1px solid #C9CCD3}.ka .k-sheet .fb .pm:last-child{border-left:1px solid #C9CCD3}
.ka .k-sheet .fb.f .pm{border-color:#2F2D6B}
.ka .k-sheet .fb .vv{flex:1;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;font-size:15px;white-space:nowrap;overflow:hidden}
.ka .k-sheet .sim{text-align:right;font-size:13px;color:#555;padding:12px 14px 10px}
.ka .k-sheet .pct{height:46px;flex:none;background:#EDEEF1;display:flex;align-items:center}
.ka .k-sheet .pct button{flex:1;font-size:15px;color:#555;border-right:1px solid #D6D7DB}
.ka .k-sheet .pct button:last-child{border-right:0}
.ka .k-sheet .kp{flex:1;background:#EDEEF1;display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:0 8px 8px}
.ka .k-sheet .kp button{background:#fff;border-radius:6px;font-size:22px;font-weight:500}
.ka .k-sheet .kp button.s{font-size:15px}
.ka .k-sheet .kp button.e{background:transparent}
.ka .k-sheet .ft{display:flex;height:48px;flex:none}
.ka .k-sheet .ft button{flex:1;font-size:17px;font-weight:700;background:#E6E6E8}
.ka .k-sheet .ft button.ok{flex:1.4;background:#2F2D6B;color:#fff!important}
.ka .k-dlg{position:absolute;left:18px;right:18px;top:50%;transform:translateY(-50%);background:#fff;border-radius:10px;z-index:31;overflow:hidden}
.ka .k-dlg h4{margin:0;height:56px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;border-bottom:1px solid #D5D5D8}
.ka .k-dlg h4.pk{color:#E0336B}.ka .k-dlg h4.yl{color:#EDB72B}
.ka .k-dlg table{margin:20px 14px;width:calc(100% - 28px);border-collapse:collapse;font-size:15px}
.ka .k-dlg td{border:1px solid #E5E5E8;height:37px;padding:0 10px}
.ka .k-dlg td:first-child{background:#F3F3F5;text-align:center;width:42%}
.ka .k-dlg td:last-child{text-align:right}
.ka .k-dlg td.y{background:#FFF6CC;color:#2F2D6B;font-weight:600}
.ka .k-dlg .msg{padding:40px 16px;text-align:center;font-size:15px;line-height:1.5}
.ka .k-dlg .bt{display:flex;height:48px}
.ka .k-dlg .bt button{flex:1;font-size:17px;font-weight:700;background:#EFEFF1}
.ka .k-dlg .bt button.ok{flex:1.6;background:#C9527E;color:#fff!important}
.ka .k-dlg .bt button.ok.yl{background:#F2C94C}
.ka .k-dlgdim{position:absolute;inset:0;background:rgba(0,0,0,.4);z-index:30}
.ka .k-toast{position:absolute;left:50%;bottom:92px;transform:translateX(-50%);background:rgba(60,60,64,.92);color:#fff;font-size:14px;padding:10px 20px;border-radius:22px;white-space:nowrap;z-index:40}
.ka .k-banner{position:absolute;left:8px;right:8px;top:28px;height:58px;background:#C42C6C;color:#fff;border-radius:4px;z-index:25;display:flex;align-items:center;padding:0 10px;box-shadow:0 2px 6px rgba(0,0,0,.25)}
.ka .k-banner .l{display:flex;flex-direction:column;font-size:14px;font-weight:700;line-height:1.3}
.ka .k-banner .l b{font-size:16px}
.ka .k-banner .m{margin-left:auto;font-size:17px;font-weight:700;margin-right:22px}
.ka .k-banner .q{font-size:17px;font-weight:700;margin-right:20px}
.ka .k-banner .x{position:absolute;right:6px;top:4px;font-size:15px;color:#fff!important}
.ka .k-err{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);background:rgba(40,40,44,.92);color:#fff;font-size:14px;padding:12px 18px;border-radius:8px;z-index:45;white-space:nowrap}
.ka .k-menu{position:absolute;background:#fff;border:1px solid #C9CCD3;border-radius:4px;z-index:22;box-shadow:0 4px 12px rgba(0,0,0,.15)}
.ka .k-menu button{display:block;width:100%;text-align:left;padding:10px 12px;font-size:15px;border-bottom:1px solid #eee}
.ka .k-menu button:last-child{border-bottom:0}
.ka .k-menu button.on{color:#2F2D6B;font-weight:800}
.ka .k-pane{flex:1;display:flex;flex-direction:column;min-width:0}
.ka .k-tool{display:flex;align-items:center;gap:6px;padding:8px 8px;flex:none}
.ka .k-tool .yb{background:#FFF3C4;border:1px solid #C9B76A;border-radius:4px;height:30px;padding:0 8px;font-size:15px;display:flex;align-items:center;gap:4px}
.ka .k-tool .rf{margin-left:auto;color:#C9527E;font-size:15px;display:flex;align-items:center;gap:4px}
.ka .k-tool .ob{border:1px solid #C9CCD3;border-radius:4px;height:36px;padding:0 10px;font-size:15px;background:#fff}
.ka .k-tool .ob.pk{border-color:#C9527E;color:#C9527E}
.ka .k-tool .sg{display:flex;border:1px solid #C9CCD3;border-radius:4px;overflow:hidden;height:36px}
.ka .k-tool .sg button{padding:0 12px;font-size:15px;color:#666;background:#F4F4F6}
.ka .k-tool .sg button.on{background:#fff;border:1.5px solid #2F2D6B;color:#2F2D6B;font-weight:800;border-radius:4px}
.ka .k-tbl{flex:1;overflow:auto;scrollbar-width:none}
.ka .k-tbl::-webkit-scrollbar{display:none}
.ka .k-tbl table{border-collapse:collapse;font-size:15px;min-width:100%;white-space:nowrap}
.ka .k-tbl th{background:#F3F3F5;font-weight:500;color:#333;height:32px;padding:0 8px;font-size:14px}
.ka .k-tbl td{height:44px;padding:0 8px;border-bottom:1px solid #EEE;font-variant-numeric:tabular-nums}
.ka .k-tbl tr.sel td{background:#F8F2F5}
.ka .k-tbl .num{text-align:right}
.ka .k-tbl .ck{width:22px;height:22px;border-radius:50%;border:1.5px solid #C2C5CC;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:12px;vertical-align:middle;background:#fff}
.ka .k-tbl .ck.on{background:#2F2D6B;border-color:#2F2D6B}
.ka .k-empty{text-align:center;color:#AAA;font-size:14px;padding:40px 0}
.ka .k-ybar{height:48px;flex:none;background:#F2C94C;color:#fff!important;font-size:18px;font-weight:800;width:100%}
`;
if (!document.getElementById('ka-css')){ const s=document.createElement('style'); s.id='ka-css'; s.textContent=css; document.head.appendChild(s); }

window.PROTOTYPES = window.PROTOTYPES || {};
window.PROTOTYPES.A = { mount(root, taskId, H){
  const PREV=31000, CUR=31750, AVAIL=1000000, TICK=50, UPL=40300, DNL=21700;
  const SELL=[[32000,2184],[31950,1032],[31900,845],[31850,312],[31800,128],[31750,291]];
  const BUY=[[31700,1540],[31650,2876],[31600,7178],[31550,1023],[31500,122],[31450,310]];
  const MAXV=7178, ACCT='5512-3344 [위탁종합]';
  const KINDS=['보통(지정가)','시장가','조건부지정가','최유리지정가','최우선지정가'];
  const OTHER=[{name:'삼성전자',qty:3,rate:4.21,pl:12180},{name:'NAVER',qty:1,rate:-2.35,pl:-4700},{name:'현대차',qty:2,rate:1.10,pl:5060}];
  const st={ tab:'buy', kind:'보통(지정가)', qty:'', price:CUR, auto:false, misu:false, credit:false,
    pending:[], holdings:[], sel:{}, pick:null, sheet:null, dlg:null, toast:null, banner:null, orderNo:null, menu:null, err:null, cc:0, hsub:'loan' };
  let seq=407300;
  const L=(t,v)=>H.log('tap',t,v??'');
  const cls=p=>p>PREV?'up':p<PREV?'dn':'';
  const chg=p=>{ const d=(p-PREV)/PREV*100; return (d>0?'+':'')+d.toFixed(2)+'%'; };
  const isMkt=()=>st.kind==='시장가'||st.kind==='최유리지정가'||st.kind==='최우선지정가';
  const otype=()=>st.kind==='보통(지정가)'?'지정가':st.kind;

  function toast(t){ st.toast=t; clearTimeout(toast.h); toast.h=setTimeout(()=>{ st.toast=null; if(root.dataset.mid===mid) draw(); },2400); }
  function flash(t){ st.err=t; draw(); clearTimeout(flash.h); flash.h=setTimeout(()=>{ st.err=null; if(root.dataset.mid===mid) draw(); },1800); }

  if (taskId==='T5'){ st.pending=[{id:'old',no:'407211',price:31700,qty:7},{id:'new',no:'407363',price:31870,qty:7}]; st.price=31870; st.qty=7; st.orderNo='407363'; toast('KRX 매수주문이 완료되었습니다.'); }
  if (taskId==='T6'){ st.holdings=[{name:'카카오',qty:7,avg:32800}]; st.banner={price:32800,qty:7}; }

  const mid=Math.random().toString(36).slice(2); root.dataset.mid=mid;

  /* ── 화면 조각 ── */
  const top=()=>`<div class="k-top"><div class="k-sb"><span>9:41</span><span>▂▄▆ ◔ 47</span></div>
    <div class="k-nav"><button class="back" data-act="a_nav_back">←</button><button class="t on" data-act="a_nav_order">키움주문</button><button class="t" data-act="a_nav_hoga">호가주문</button><button class="t" data-act="a_nav_auto">자동감시주문</button><button class="t" data-act="a_nav_exec">체결</button><button class="more" data-act="a_nav_more">⋮</button></div></div>
    <div class="k-stock"><div class="k-sbox"><button class="nm" data-act="a_stock"><b><i>★</i>카카오</b><small>통합 <em>신</em> 035720</small><span class="dd">⌄</span></button><button class="sr" data-act="a_search" aria-label="검색"><svg width="20" height="20" viewBox="0 0 20 20"><circle cx="8.5" cy="8.5" r="6.5" fill="none" stroke="#555" stroke-width="1.4"/><path d="M13.3 13.3l4.5 4.5" stroke="#555" stroke-width="1.4"/></svg></button></div>
      <div class="k-px"><b class="up">${won(CUR)}</b><small class="up"><span>▲ ${won(CUR-PREV)}</span><span>${((CUR-PREV)/PREV*100).toFixed(2)}%</span></small></div></div>
    <div class="k-acct"><button class="a1" data-act="a_acct_type">통합<i></i></button><button class="a2" data-act="a_acct">${ACCT}<span style="color:#888;font-size:12px">⌄</span></button><button class="a3" data-act="a_pw">●●●●</button></div>
    <div class="k-tabs">${[['buy','매수'],['sell','매도'],['modify','정정/취소'],['pending','미체결'],['holdings','잔고']].map(([k,n])=>`<button class="${st.tab===k?(k==='buy'?'on':'on2'):''}" data-act="tab_${k}">${n}</button>`).join('')}</div>`;

  const bottom=()=>`<div class="k-tick"><span>지수 채팅</span>투자의 길, 함께 떠들면 덜 외로워요</div>
    <div class="k-bnav"><button class="menu" data-act="a_menu"><b></b>메뉴</button>${['관심종목','현재가','주문','차트','계좌'].map(n=>`<button class="n ${n==='주문'?'on':''}" data-act="a_bnav_${n}">${n}</button>`).join('')}</div><div class="k-home"></div>`;

  function bookHtml(){
    const row=(p,v,side)=>`<button class="k-row ${side} ${p===CUR?'cur':''} ${!isMkt()&&+st.price===p?'pick':''}" data-hoga="${p}"><span class="p ${cls(p)}">${won(p)}</span><span class="v"><i style="width:${Math.round(v/MAXV*100)}%"></i>${won(v)}</span></button>`;
    return SELL.map(([p,v])=>row(p,v,'s')).join('')+BUY.map(([p,v])=>row(p,v,'b')).join('');
  }
  function buyPane(){
    const amt = (+st.qty>0) ? (isMkt()?CUR:+st.price)*st.qty : 0;
    return `<div class="k-book"><div class="k-bh"><span>호가</span><span>잔량</span></div><div class="k-bl" id="kbook">${bookHtml()}</div></div>
      <div class="k-form"><div class="k-f">
        <div class="k-seg"><button class="${st.credit?'':'on'}" data-act="a_cash">현금</button><button class="${st.credit?'on':''}" data-act="a_credit">신용</button></div>
        <button class="k-sel" data-act="type_open" id="ka-type">${st.kind}</button>
        <div class="k-num"><button class="pm" data-act="qty_minus">−</button><button class="val ${st.qty?'':'kph'}" data-act="qty_field">${st.qty?won(st.qty)+'주':'수량'}</button><button class="pm" data-act="qty_plus">+</button></div>
        <div class="k-line" style="align-items:center"><button class="k-chk ${st.misu?'on':''}" data-act="a_misu"><i>✓</i>미수조회</button><button class="k-sel sm" data-act="qty_pct_open" id="ka-pct">%</button></div>
        <div class="k-num">${isMkt()?`<span class="val dis">${st.kind==='시장가'?'시장가':st.kind}</span>`:`<button class="pm" data-act="price_minus">−</button><button class="val y" data-act="price_field">${won(st.price)}원</button><button class="pm" data-act="price_plus">+</button>`}</div>
        <button class="k-chk ${st.auto?'on':''}" data-act="price_auto"><i>✓</i>가격 자동(현재가)</button>
      </div>
      <div style="position:absolute;right:8px;top:${9+42+8+42+8+42+8}px;display:flex;flex-direction:column;gap:8px">
        <button class="k-btn" data-act="avail">가능</button>
        <button class="k-btn ${st.kind==='시장가'?'on':''}" data-act="type_market">✓시장가</button>
        <button class="k-btn" data-act="a_hogabtn">호가</button>
      </div>
      <div class="k-bottom">
        <div class="k-amt"><span class="x">KRX</span><span class="l">주문금액 <i>?</i></span><span class="r">${amt?won(amt)+'원':''}</span></div>
        <div class="k-buyrow"><button class="k-buy" data-act="buy">현금매수</button>${st.orderNo?`<span class="k-ono">${st.orderNo}</span>`:''}</div>
      </div></div>`;
  }
  function orderTable(mode){
    if (!st.pending.length) return `<div class="k-tbl"><table><tr><th>${mode==='pending'?'<span class="ck"></span>':''}</th><th>주문번호</th><th>종목명</th><th>구분</th><th>주문가</th><th>주문량</th><th>미체결</th></tr></table><div class="k-empty">미체결 주문이 없습니다.</div></div>`;
    const all = st.pending.every(o=>st.sel[o.id]);
    const rows = st.pending.map(o=>{ const on = mode==='pending' ? !!st.sel[o.id] : st.pick===o.id;
      return `<tr class="${on?'sel':''}" data-row="${o.id}"><td><span class="ck ${on?'on':''}">✓</span></td><td>${o.no}</td><td>카카오</td><td style="color:#E0336B">매수</td><td class="num">${won(o.price)}</td><td class="num">${o.qty}</td><td class="num">${o.qty}</td></tr>`; }).join('');
    return `<div class="k-tbl"><table><tr><th>${mode==='pending'?`<button class="ck ${all?'on':''}" data-act="cancel_check_all">✓</button>`:''}</th><th>주문번호</th><th>종목명</th><th>구분</th><th>주문가</th><th>주문량</th><th>미체결</th></tr>${rows}</table></div>`;
  }
  function pendingPane(){
    const n = Object.values(st.sel).filter(Boolean).length;
    return `<div class="k-pane"><div class="k-tool"><button class="yb" data-act="cancel_krx">KRX주문취소 ›</button><button class="rf" data-act="a_refresh">⟳ 새로고침</button></div>
      ${orderTable('pending')}${n?`<button class="k-ybar" data-act="cancel_bar">${n}건 주문취소</button>`:''}</div>`;
  }
  function modifyPane(){
    return `<div class="k-pane"><div class="k-tool"><span style="font-size:14px;color:#555">정정·취소할 원주문을 선택하세요</span></div>${orderTable('modify')}
      ${st.pick?`<div style="display:flex"><button class="k-ybar" style="background:#8E8EA8" data-act="a_modify_order">정정주문</button><button class="k-ybar" data-act="cancel_order">취소주문</button></div>`:''}</div>`;
  }
  function holdingsPane(){
    const rows = OTHER.map(h=>({name:h.name,qty:h.qty,rate:h.rate,pl:h.pl}))
      .concat(st.holdings.map(h=>{ const pl=(CUR-h.avg)*h.qty; return {name:h.name,qty:h.qty,rate:(CUR-h.avg)/h.avg*100,pl}; }));
    const c=v=>v>0?'up':v<0?'dn':'';
    return `<div class="k-pane"><div class="k-tool"><div class="sg"><button class="${st.hsub==='loan'?'on':''}" data-act="a_hsub_loan">융자별</button><button class="${st.hsub==='sum'?'on':''}" data-act="a_hsub_sum">융자합</button></div><button class="ob" style="margin-left:auto" data-act="a_hdetail">잔고상세</button><button class="ob pk" data-act="a_hrefresh">⟳</button></div>
      <div class="k-tbl"><table style="width:100%"><tr><th style="text-align:left">종목명</th><th>가능/보유</th><th>수익률</th><th>평가손익</th></tr>
      ${rows.map(r=>`<tr><td>${r.name}</td><td style="text-align:center">${r.qty}/${r.qty}</td><td class="num ${c(r.rate)}">${r.rate>0?'+':''}${r.rate.toFixed(2)}%</td><td class="num ${c(r.pl)}">${r.pl>0?'+':''}${won(r.pl)}</td></tr>`).join('')}</table></div></div>`;
  }
  function sheetHtml(){
    const s=st.sheet; if(!s) return '';
    const list = [...SELL,...BUY].map(([p])=>`<button class="sp ${p===CUR?'cur':''}" data-shoga="${p}"><b class="${cls(p)}">${won(p)}</b><small class="${cls(p)}">${chg(p)}</small></button>`).join('');
    const box=(f,label,val,unit,pm)=>`<div class="fr"><label>${label}</label><div class="fb ${s.focus===f?'f':''}">${pm?`<button class="pm" data-act="${f}_sminus">−</button>`:''}<button class="vv" data-act="${f}_focus">${val!==''&&val!=null?won(val)+' ':''}${unit}</button>${pm?`<button class="pm" data-act="${f}_splus">+</button>`:''}</div></div>`;
    const k4 = s.focus==='price' ? ['price_cur','현재가'] : ['avail','가능'];
    const keys=[['1'],['2'],['3'],['bs','⌫'],['4'],['5'],['6'],['C'],['7'],['8'],['9'],[k4[0],k4[1]],['00'],['0'],['000'],['','']];
    return `<div class="k-dim" data-act="a_sheet_dim"></div><div class="k-sheet">
      <div class="hd">주문정보 입력 <i>?</i><span class="gear">⚙</span></div>
      <div class="bd"><div class="lst" id="kslist"><div class="lim u">↑ 상한가<b>${won(UPL)}</b></div>${list}<div class="lim d">↓ 하한가<b>${won(DNL)}</b></div></div>
        <div class="rt"><div class="fl">${box('qty','수량',s.qty,'주',true)}${isMkt()?`<div class="fr"><label>가격</label><div class="fb"><span class="vv" style="color:#999">${st.kind}</span></div></div>`:box('price','가격',s.price,'원',true)}${box('amount','주문금액',s.amount,'원',false)}</div>
          <div class="sim">미수거래 시뮬레이션 ›</div>
          <div class="pct">${s.focus==='qty'?[10,20,30,50].map(p=>`<button data-act="qty_pct_${p}">${p}%</button>`).join(''):''}</div>
          <div class="kp">${keys.map(([k,l])=>k===''?'<button class="e" disabled></button>':`<button class="${(l||k).length>2?'s':''}" data-key="${k}">${l||k}</button>`).join('')}</div>
          <div class="ft"><button data-act="a_sheet_cancel">취소</button><button class="ok" data-act="confirm_input">입력완료</button></div></div></div></div>`;
  }
  function dlgHtml(){
    const d=st.dlg; if(!d) return '';
    if (d.kind==='buy'){ const o=d.o;
      return `<div class="k-dlgdim"></div><div class="k-dlg"><h4 class="pk">현금 매수 주문 확인</h4><table>
        <tr><td>종목명</td><td>카카오</td></tr><tr><td>매매종류</td><td>${st.kind}</td></tr><tr><td>주문수량</td><td>${won(o.qty)}주</td></tr>
        <tr><td>주문가격</td><td class="y">${o.type==='지정가'||o.type==='조건부지정가'?won(o.price)+'원':st.kind}</td></tr><tr><td>거래소</td><td>KRX (한국거래소)</td></tr></table>
        <div class="bt"><button data-act="confirm_cancel">취소</button><button class="ok" data-act="confirm_buy">확인</button></div></div>`; }
    if (d.kind==='cancel') return `<div class="k-dlgdim"></div><div class="k-dlg"><h4 class="yl">주식 취소 주문</h4><div class="msg">선택하신 주문${d.ids.length}건에 대해<br>취소 주문을 내시겠습니까?</div>
        <div class="bt"><button data-act="cancel_dlg_close">취소</button><button class="ok yl" data-act="cancelsheet_ok">확인</button></div></div>`;
    return '';
  }
  function menuHtml(){
    if (st.menu==='type') return `<div class="k-dim" style="background:transparent" data-act="a_menu_close"></div><div class="k-menu" style="left:135px;top:${st.mtop}px;width:150px">${KINDS.map(k=>`<button class="${st.kind===k?'on':''}" data-kind="${k}">${k}</button>`).join('')}</div>`;
    if (st.menu==='pct') return `<div class="k-dim" style="background:transparent" data-act="a_menu_close"></div><div class="k-menu" style="left:210px;top:${st.mtop}px;width:75px">${[10,20,30,50,100].map(p=>`<button data-act="qty_pct_${p}">${p}%</button>`).join('')}</div>`;
    return '';
  }

  let bookY=null;
  function draw(){
    const kb=root.querySelector('#kbook'); if(kb) bookY=kb.scrollTop;
    const body = st.tab==='buy'?buyPane(): st.tab==='pending'?pendingPane(): st.tab==='modify'?modifyPane(): st.tab==='holdings'?holdingsPane(): buyPane();
    root.innerHTML = `<div class="ka">${top()}<div class="k-body">${body}</div>${bottom()}
      ${st.banner?`<div class="k-banner" data-act="a_banner"><span class="l">매수 체결<b>카카오</b></span><span class="m">${won(st.banner.price)}</span><span class="q">${st.banner.qty}주</span><button class="x" data-act="a_banner_close">✕</button></div>`:''}
      ${menuHtml()}${sheetHtml()}${dlgHtml()}${st.toast?`<div class="k-toast">${st.toast}</div>`:''}${st.err?`<div class="k-err">${st.err}</div>`:''}</div>`;
    const kb2=root.querySelector('#kbook'); if(kb2) kb2.scrollTop = bookY==null ? 45*6 - (kb2.clientHeight/2) + 22 : bookY;
    const sl=root.querySelector('#kslist'); if(sl && st.sheet && st.sheet.ly==null){ sl.scrollTop = 40+43*5-sl.clientHeight/2+20; st.sheet.ly=sl.scrollTop; } else if(sl&&st.sheet) sl.scrollTop=st.sheet.ly;
  }

  function openSheet(focus){ st.sheet={ focus, qty:st.qty, price:isMkt()?CUR:st.price, amount:'', fresh:true, ly:null }; recalc(); st.sheet.fresh=true; }
  function recalc(){ const s=st.sheet; const px=isMkt()?CUR:+s.price; if(s.focus==='amount'){ s.qty = px? Math.floor((+s.amount||0)/px)||'' : ''; } else { s.amount = (+s.qty>0 && px) ? s.qty*px : ''; } }
  function keyIn(k){
    const s=st.sheet, f=s.focus;
    if (k==='C') s[f]='';
    else if (k==='bs') { const v=String(s[f]||'').slice(0,-1); s[f]=v===''?'':+v; }
    else if (k==='avail') { const px=isMkt()?CUR:+s.price||CUR; s.qty=Math.floor(AVAIL/px); s.focus='qty'; }
    else if (k==='price_cur') { s.price=CUR; }
    else { let v=(s.fresh?'':String(s[f]||''))+k; v=v.replace(/^0+/,''); if(v.length>9) v=v.slice(0,9); s[f]=v===''?'':+v; }
    s.fresh=false; recalc();
  }
  function submit(){
    const q=+st.qty, px=isMkt()?CUR:+st.price;
    if (st.credit) return flash('이 테스트에서는 현금 주문만 할 수 있어요');
    if (!q) return flash('주문수량을 입력하세요.');
    if (!isMkt() && (!px || px%TICK)) return flash('주문가격이 호가단위에 맞지 않습니다.');
    if (!isMkt() && (px>UPL || px<DNL)) return flash('주문가격이 가격제한폭을 벗어났습니다.');
    if (px*q>AVAIL && !st.misu) return flash('주문가능금액을 초과했습니다.');
    st.dlg={kind:'buy', o:{type:otype(), price:px, qty:q}}; H.log('sheet_open','confirm',`${otype()} ${px} ${q}`); draw();
  }
  function cancelDone(ids){
    st.pending=st.pending.filter(o=>!ids.includes(o.id)); st.sel={}; st.pick=null; st.dlg=null;
    toast('KRX 매수취소 주문입력이 완료되었습니다'); draw();
    const ok = ids.length===1 && ids[0]==='new';
    H.onCancel({ok, target: ids.length>1?'여러 건 취소':(ids[0]==='new'?'방금 주문':'이전 주문')});
  }

  root.onclick = e => {
    const kd=e.target.closest('[data-key]'); if (kd){ const k=kd.dataset.key; const f=st.sheet.focus; L(k==='avail'?'avail':k==='price_cur'?'price_cur':`${f}_key_${k}`,k); keyIn(k); draw(); return; }
    const sh=e.target.closest('[data-shoga]'); if (sh){ const p=+sh.dataset.shoga; L('hoga_'+p,p); if(!isMkt()){ st.sheet.price=p; st.sheet.focus='price'; st.sheet.fresh=true; recalc(); } draw(); return; }
    const hg=e.target.closest('[data-hoga]'); if (hg){ const p=+hg.dataset.hoga; L('hoga_'+p,p); if(isMkt()) st.kind='보통(지정가)'; st.price=p; st.auto=false; draw(); return; }
    const kn=e.target.closest('[data-kind]'); if (kn){ st.kind=kn.dataset.kind; st.menu=null; L('type_'+st.kind,st.kind); draw(); return; }
    const rw=e.target.closest('[data-row]'); if (rw){ const id=rw.dataset.row; if(st.tab==='pending'){ st.sel[id]=!st.sel[id]; L('cancel_check_'+id, st.sel[id]?'on':'off'); } else { st.pick=st.pick===id?null:id; L('cancel_pick_'+id); } draw(); return; }
    const a=e.target.closest('[data-act]'); if (!a){ L('blank'); return; }
    const act=a.dataset.act;
    switch(act){
      case 'tab_buy': L(act); st.tab='buy'; draw(); return;
      case 'tab_sell': L(act); flash('이 테스트에서는 매수만 할 수 있어요'); return;
      case 'tab_modify': L(act); st.tab='modify'; st.pick=null; draw(); return;
      case 'tab_pending': L(act); st.tab='pending'; st.sel={}; draw(); return;
      case 'tab_holdings': L(act); st.tab='holdings'; draw(); H.onHoldings('tab'); return;
      case 'a_credit': L(act); flash('이 테스트에서는 현금 주문만 할 수 있어요'); return;
      case 'a_cash': L(act); return;
      case 'type_open': { L(act); const r=a.getBoundingClientRect(), d=root.getBoundingClientRect(), sc=+root.dataset.scale||1; st.mtop=(r.bottom-d.top)/sc+2; st.menu='type'; draw(); return; }
      case 'qty_pct_open': { L(act); const r=a.getBoundingClientRect(), d=root.getBoundingClientRect(), sc=+root.dataset.scale||1; st.mtop=(r.bottom-d.top)/sc+2; st.menu='pct'; draw(); return; }
      case 'a_menu_close': L(act); st.menu=null; draw(); return;
      case 'type_market': L(act); st.kind = st.kind==='시장가' ? '보통(지정가)' : '시장가'; draw(); return;
      case 'price_auto': L(act); st.auto=!st.auto; if(st.auto){ st.price=CUR; if(isMkt()) st.kind='보통(지정가)'; } draw(); return;
      case 'qty_minus': case 'qty_plus': L(act); st.qty=Math.max(0,(+st.qty||0)+(act==='qty_plus'?1:-1))||''; draw(); return;
      case 'price_minus': case 'price_plus': L(act); st.price=Math.max(TICK,(+st.price||CUR)+(act==='price_plus'?TICK:-TICK)); st.auto=false; draw(); return;
      case 'avail': L(act); if (st.sheet){ keyIn('avail'); } else { const px=isMkt()?CUR:+st.price||CUR; st.qty=Math.floor(AVAIL/px); } draw(); return;
      case 'qty_field': L(act); openSheet('qty'); draw(); return;
      case 'price_field': L(act); openSheet('price'); draw(); return;
      case 'qty_focus': case 'price_focus': case 'amount_focus': L(act); st.sheet.focus=act.split('_')[0]; st.sheet.fresh=true; draw(); return;
      case 'qty_sminus': case 'qty_splus': L(act); st.sheet.qty=Math.max(0,(+st.sheet.qty||0)+(act==='qty_splus'?1:-1))||''; st.sheet.focus='qty'; recalc(); draw(); return;
      case 'price_sminus': case 'price_splus': L(act); st.sheet.price=Math.max(TICK,(+st.sheet.price||CUR)+(act==='price_splus'?TICK:-TICK)); st.sheet.focus='price'; recalc(); draw(); return;
      case 'a_sheet_cancel': case 'a_sheet_dim': L(act); st.sheet=null; draw(); return;
      case 'confirm_input': L(act); st.qty=st.sheet.qty; if(!isMkt()){ if(+st.sheet.price!==+st.price) st.auto=false; st.price=st.sheet.price; } st.sheet=null; draw(); return;
      case 'buy': L(act); submit(); return;
      case 'confirm_cancel': L(act); st.cc++; st.dlg=null; draw(); return;
      case 'confirm_buy': { L(act); const o=st.dlg.o; st.dlg=null; seq++; st.orderNo=String(seq); st.pending.push({id:'p'+seq,no:String(seq),price:o.price,qty:o.qty}); st.qty=''; toast('KRX 매수주문이 완료되었습니다.'); draw();
        H.onOrder({type:o.type, price:o.price, qty:o.qty, meta:{confirm_cancel:st.cc}}); return; }
      case 'cancel_check_all': { L(act); const all=st.pending.every(o=>st.sel[o.id]); st.sel={}; if(!all) st.pending.forEach(o=>st.sel[o.id]=true); draw(); return; }
      case 'cancel_bar': L(act); st.dlg={kind:'cancel', ids:st.pending.filter(o=>st.sel[o.id]).map(o=>o.id)}; H.log('sheet_open','cancel',st.dlg.ids.join(',')); draw(); return;
      case 'cancel_order': L(act); st.dlg={kind:'cancel', ids:[st.pick]}; H.log('sheet_open','cancel',st.pick); draw(); return;
      case 'cancel_krx': L(act); st.tab='modify'; st.pick=null; draw(); return;
      case 'cancel_dlg_close': L(act); st.dlg=null; draw(); return;
      case 'cancelsheet_ok': L(act); cancelDone(st.dlg.ids); return;
      case 'a_modify_order': L(act); flash('이 테스트에서는 정정 주문을 쓸 수 없어요'); return;
      case 'a_banner_close': L(act); st.banner=null; draw(); return;
      case 'a_hsub_loan': case 'a_hsub_sum': L(act); st.hsub=act.slice(7); draw(); return;
      default:
        if (act.startsWith('qty_pct_')){ const p=+act.slice(8); L(act,p); const px=isMkt()?CUR:+(st.sheet?st.sheet.price:st.price)||CUR; const q=Math.floor(AVAIL*p/100/px)||'';
          if(st.sheet){ st.sheet.qty=q; st.sheet.focus='qty'; recalc(); } else { st.qty=q; st.menu=null; } draw(); return; }
        L(act);
        if (act.startsWith('a_nav_')||act.startsWith('a_bnav_')||act==='a_menu') flash('이 테스트에서는 주문 화면만 쓸 수 있어요');
        return;
    }
  };
  draw();
}};
})();
