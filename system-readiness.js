/* SHIFRA Production Readiness & Resilience System v1 */
(function(){
  'use strict';

  const STYLE_ID = 'shifra-production-readiness-v1';
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .sys-hero{display:grid;gap:14px;margin-bottom:14px}
      @media(min-width:760px){.sys-hero{grid-template-columns:1.25fr .75fr}}
      .sys-hero-main{padding:20px;border:1px solid rgba(255,255,255,.08);border-radius:18px;background:linear-gradient(135deg,rgba(124,92,255,.13),rgba(56,189,248,.05) 55%,rgba(255,255,255,.02));box-shadow:0 22px 60px -34px rgba(0,0,0,.95)}
      .sys-kicker{font:700 11px var(--mono);letter-spacing:1px;color:#9fa9b8;text-transform:uppercase}
      .sys-title{font-size:24px;font-weight:800;margin-top:5px}
      .sys-sub{font-size:12px;color:#7e8999;margin-top:6px;line-height:1.8}
      .sys-status{display:inline-flex;align-items:center;gap:8px;margin-top:13px;padding:7px 11px;border-radius:999px;font-size:11px;font-weight:700;background:rgba(52,211,153,.10);border:1px solid rgba(52,211,153,.18);color:#a8f1d3}
      .sys-status.warn{background:rgba(251,191,36,.10);border-color:rgba(251,191,36,.18);color:#ffe39a}
      .sys-status.fail{background:rgba(248,113,113,.10);border-color:rgba(248,113,113,.18);color:#ffc0c0}
      .sys-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:15px}
      .sys-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:14px}
      @media(min-width:760px){.sys-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
      .sys-stat{padding:15px;border:1px solid rgba(255,255,255,.065);border-radius:14px;background:rgba(255,255,255,.022)}
      .sys-stat .k{font-size:11px;color:#758194}
      .sys-stat .v{font:800 22px var(--mono);margin-top:4px}
      .sys-stat .s{font-size:10px;color:#616d7e;margin-top:3px}
      .sys-card{padding:15px;margin-bottom:12px;border:1px solid rgba(255,255,255,.065);border-radius:16px;background:linear-gradient(180deg,rgba(17,20,27,.88),rgba(11,13,18,.83))}
      .sys-card h3{font-size:13px;margin-bottom:10px}
      .sys-check{display:flex;gap:10px;align-items:flex-start;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.045)}
      .sys-check:last-child{border-bottom:0}
      .sys-dot{width:9px;height:9px;border-radius:50%;margin-top:6px;flex:0 0 auto;background:#34d399;box-shadow:0 0 0 4px rgba(52,211,153,.08)}
      .sys-dot.fail{background:#fb7185;box-shadow:0 0 0 4px rgba(251,113,133,.08)}
      .sys-check-main{flex:1;min-width:0}
      .sys-check-row{display:flex;justify-content:space-between;gap:10px;align-items:center}
      .sys-check-name{font-size:12.5px;font-weight:700}
      .sys-check-meta{font-size:10px;color:#677385;margin-top:3px}
      .sys-check-detail{font-size:10.5px;color:#9ba6b6;line-height:1.75;margin-top:5px;white-space:pre-wrap;word-break:break-word}
      .sys-badge{font:700 9.5px var(--mono);padding:4px 7px;border-radius:999px;background:rgba(52,211,153,.10);color:#9be7c9;border:1px solid rgba(52,211,153,.12)}
      .sys-badge.fail{background:rgba(248,113,113,.10);color:#ffb7bd;border-color:rgba(248,113,113,.12)}
      .sys-warning{padding:11px 12px;border:1px solid rgba(251,191,36,.16);background:rgba(251,191,36,.06);color:#f7d98c;border-radius:12px;font-size:11px;line-height:1.7;margin-top:8px}
      .sys-client-grid{display:grid;grid-template-columns:1fr;gap:8px}
      @media(min-width:700px){.sys-client-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      .sys-mini{display:flex;justify-content:space-between;gap:10px;padding:9px 10px;border-radius:11px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);font-size:11px}
      .sys-mini .k{color:#707b8c}.sys-mini .v{font-weight:700}
      .sys-list{display:grid;gap:7px}
      .sys-error-row{font-size:10.5px;padding:9px 10px;border-radius:11px;background:rgba(248,113,113,.05);border:1px solid rgba(248,113,113,.10);color:#d7b1b7}
    `;
    document.head.appendChild(style);
  }

  const clientErrors = [];
  function capture(kind, payload){
    clientErrors.unshift({kind, at:new Date().toISOString(), message:String(payload?.message || payload || 'unknown error')});
    if(clientErrors.length > 25) clientErrors.length = 25;
  }
  window.addEventListener('error', function(e){ capture('error', e.error || e.message); });
  window.addEventListener('unhandledrejection', function(e){ capture('promise', e.reason); });

  function safe(s){ return typeof esc === 'function' ? esc(s) : String(s ?? ''); }
  function statusClass(status){ return status === 'PASS' ? '' : 'fail'; }
  function valueText(v){
    if (v === null || v === undefined) return '—';
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return v.map(x => {
      if (x && typeof x === 'object') return Object.entries(x).map(([k,val]) => k+': '+val).join(' · ');
      return String(x);
    }).join(' | ');
    if (typeof v === 'object') return Object.entries(v).map(([k,val]) => k+': '+(typeof val==='object' ? JSON.stringify(val) : val)).join(' · ');
    return String(v);
  }

  function patchApp(){
    if (typeof NAV_BY_ROLE === 'undefined' || typeof VIEW_META === 'undefined' || typeof RENDERERS === 'undefined') return false;

    NAV_BY_ROLE.OWNER = NAV_BY_ROLE.OWNER || [];
    NAV_BY_ROLE.ADMIN = NAV_BY_ROLE.ADMIN || [];
    if (!NAV_BY_ROLE.OWNER.some(x=>x.id==='system-readiness')) {
      NAV_BY_ROLE.OWNER.push({id:'system-readiness',label:'مركز الجاهزية',icon:'◈'});
    }
    if (!NAV_BY_ROLE.ADMIN.some(x=>x.id==='system-readiness')) {
      NAV_BY_ROLE.ADMIN.push({id:'system-readiness',label:'مركز الجاهزية',icon:'◈'});
    }

    if (typeof MOBILE_PRIMARY_BY_ROLE !== 'undefined') {
      const owner = MOBILE_PRIMARY_BY_ROLE.OWNER || [];
      const admin = MOBILE_PRIMARY_BY_ROLE.ADMIN || [];
      MOBILE_PRIMARY_BY_ROLE.OWNER = ['owner-home','system-readiness',...owner.filter(x=>x!=='system-readiness'&&x!=='owner-home').slice(0,2)];
      MOBILE_PRIMARY_BY_ROLE.ADMIN = ['owner-home','system-readiness',...admin.filter(x=>x!=='system-readiness'&&x!=='owner-home').slice(0,2)];
    }

    VIEW_META['system-readiness'] = {
      title:'مركز الجاهزية',
      sub:'فحص حي للتطبيق، قاعدة البيانات، الجلسات، التشغيل، والأمان'
    };

    RENDERERS['system-readiness'] = async function(el){
      el.innerHTML = `
        <div class="sys-hero">
          <div class="sys-hero-main">
            <div class="sys-kicker">SHIFRA PRODUCTION CONTROL</div>
            <div class="sys-title">مركز الجاهزية والتشغيل</div>
            <div class="sys-sub">نظام قراءة وتشخيص داخل التطبيق. كل الفحوصات هنا قراءة فقط ولا تغيّر الحسابات أو الأرباح أو الصلاحيات.</div>
            <div id="sys-status" class="sys-status">● جارِ الفحص...</div>
            <div class="sys-actions">
              <button class="btn btn-primary btn-sm" id="sys-refresh">إعادة الفحص</button>
              <button class="btn btn-ghost btn-sm" id="sys-copy">نسخ تقرير التشخيص</button>
            </div>
          </div>
          <div class="sys-card" style="margin:0">
            <h3>حالة الجهاز والواجهة</h3>
            <div class="sys-client-grid" id="sys-client-grid"></div>
          </div>
        </div>
        <div class="sys-grid" id="sys-stats">
          <div class="sys-stat"><div class="k">فحوصات ناجحة</div><div class="v">—</div><div class="s">Backend</div></div>
          <div class="sys-stat"><div class="k">فحوصات فاشلة</div><div class="v">—</div><div class="s">Backend</div></div>
          <div class="sys-stat"><div class="k">تحذيرات</div><div class="v">—</div><div class="s">Backend</div></div>
          <div class="sys-stat"><div class="k">زمن الفحص</div><div class="v">—</div><div class="s">milliseconds</div></div>
        </div>
        <div class="sys-card"><h3>الفحوصات الحية</h3><div id="sys-checks"><div class="loading-row"><span class="spinner"></span> جارِ الفحص...</div></div></div>
        <div class="sys-card"><h3>الأحداث والأخطاء داخل الواجهة</h3><div id="sys-errors"><div style="font-size:11px;color:#697587">لا توجد أخطاء مسجلة منذ فتح الصفحة.</div></div></div>
        <div class="sys-card"><h3>الوصول الحالي</h3><div id="sys-actor" style="font-size:11px;color:#768194">—</div></div>
      `;

      const client = [
        ['الاتصال بالإنترنت', navigator.onLine ? 'متصل' : 'غير متصل'],
        ['نوع الجهاز', /Android/i.test(navigator.userAgent) ? 'Android' : /iPhone|iPad/i.test(navigator.userAgent) ? 'iOS' : 'Desktop'],
        ['المتصفح', navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Browser'],
        ['API داخل التطبيق', (state && state.apiBase) || '—'],
        ['الجلسة المحلية', state && state.token ? 'موجودة' : 'غير موجودة'],
        ['حالة التطبيق', document.getElementById('app-shell')?.classList.contains('active') ? 'داخل التطبيق' : 'واجهة الدخول']
      ];
      el.querySelector('#sys-client-grid').innerHTML = client.map(([k,v]) => '<div class="sys-mini"><span class="k">'+safe(k)+'</span><span class="v">'+safe(v)+'</span></div>').join('');

      async function run(){
        const status = el.querySelector('#sys-status');
        status.className='sys-status'; status.textContent='● جارِ الفحص...';
        try{
          const report = await api('/system/readiness');
          window.__SHIFRA_LAST_READINESS = report;
          const s = report.summary || {};
          status.className='sys-status'+(s.failed?' fail':(s.warnings?' warn':''));
          status.textContent = s.failed ? '● يوجد فحص يحتاج تدخلًا' : (s.warnings ? '● النظام يعمل مع تحذيرات' : '● الفحوصات الأساسية ناجحة');
          el.querySelector('#sys-stats').innerHTML = [
            ['فحوصات ناجحة',s.passed||0,'Backend'],
            ['فحوصات فاشلة',s.failed||0,'Backend'],
            ['تحذيرات',s.warnings||0,'Backend'],
            ['زمن الفحص',(report.durationMs||0),'ms']
          ].map(x=>'<div class="sys-stat"><div class="k">'+safe(x[0])+'</div><div class="v">'+safe(x[1])+'</div><div class="s">'+safe(x[2])+'</div></div>').join('');

          el.querySelector('#sys-checks').innerHTML = (report.checks||[]).map(ch =>
            '<div class="sys-check">'+
              '<div class="sys-dot '+statusClass(ch.status)+'"></div>'+
              '<div class="sys-check-main">'+
                '<div class="sys-check-row"><div class="sys-check-name">'+safe(ch.label)+'</div><span class="sys-badge '+statusClass(ch.status)+'">'+safe(ch.status)+'</span></div>'+
                '<div class="sys-check-meta">'+safe(ch.key)+' · '+safe(ch.durationMs)+'ms</div>'+
                '<div class="sys-check-detail">'+safe(ch.status==='FAIL' ? (ch.error||'فشل الفحص') : valueText(ch.value))+'</div>'+
              '</div>'+
            '</div>'
          ).join('') || '<div style="font-size:11px;color:#697587">لا توجد نتائج.</div>';

          el.querySelector('#sys-actor').textContent = (report.actor?.fullName||'—')+' · '+(report.actor?.role||'—')+' · User #'+(report.actor?.id||'—')+' · release '+(report.release||'—');
          if ((report.warnings||[]).length) {
            el.querySelector('#sys-checks').insertAdjacentHTML('afterend','<div>'+report.warnings.map(w=>'<div class="sys-warning">⚠ '+safe(w)+'</div>').join('')+'</div>');
          }
        }catch(e){
          status.className='sys-status fail';
          status.textContent='● تعذر تنفيذ فحص الجاهزية';
          el.querySelector('#sys-checks').innerHTML='<div class="sys-warning">تعذر الوصول لنظام التشخيص: '+safe(e.message)+'</div>';
        }

        const errBox=el.querySelector('#sys-errors');
        errBox.innerHTML = clientErrors.length
          ? '<div class="sys-list">'+clientErrors.map(x=>'<div class="sys-error-row"><b>'+safe(x.kind)+'</b> · '+safe(x.at)+'<br>'+safe(x.message)+'</div>').join('')+'</div>'
          : '<div style="font-size:11px;color:#697587">لا توجد أخطاء مسجلة منذ فتح الصفحة.</div>';

        const copyBtn=el.querySelector('#sys-copy');
        copyBtn.onclick=async()=>{
          const report={generatedAt:new Date().toISOString(),client:{online:navigator.onLine,apiBase:state.apiBase,role:state.user?.role||null},backend:window.__SHIFRA_LAST_READINESS||null,clientErrors};
          const text=JSON.stringify(report,null,2);
          try{await navigator.clipboard.writeText(text);toast('اتنسخ تقرير التشخيص','ok');}
          catch(_){modal('<h3>تقرير التشخيص</h3><textarea style="width:100%;height:320px;background:#0b0e14;color:#eef2f7;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px;font:10px var(--mono)">'+safe(text)+'</textarea><div class="modal-actions"><button class="btn btn-ghost btn-block" onclick="closeModal()">إغلاق</button></div>');}
        };
      }
      el.querySelector('#sys-refresh').onclick=run;
      await run();
    };
    return true;
  }

  function boot(){
    if(!patchApp()) return;
    if (typeof state !== 'undefined' && state.user && (state.user.role==='OWNER' || state.user.role==='ADMIN')) {
      try { renderNav(); } catch(e) { capture('patch',e); }
    }

    let lastAuthSeen = null;
    setInterval(function(){
      const auth = document.getElementById('auth-screen');
      const app = document.getElementById('app-shell');
      if(!auth || !app || typeof state==='undefined') return;
      const authVisible = getComputedStyle(auth).display !== 'none';
      const appVisible = app.classList.contains('active');
      const tokenPresent = !!state.token;
      const signature = authVisible+'|'+appVisible+'|'+tokenPresent;
      if(signature!==lastAuthSeen) lastAuthSeen=signature;

      if(tokenPresent && authVisible && !appVisible){
        const key='shifra-auth-stuck-warning';
        const until=Number(sessionStorage.getItem(key)||0);
        if(Date.now()>until){
          sessionStorage.setItem(key,String(Date.now()+30000));
          try{toast('الجلسة موجودة لكن التطبيق لم يدخل بعد؛ أعد المحاولة من زر الدخول.', 'err');}catch(_){}
        }
      }
    },1200);

    window.addEventListener('online',function(){try{toast('الاتصال رجع للعمل','ok');}catch(_){}});
    window.addEventListener('offline',function(){try{toast('الجهاز حاليًا بدون إنترنت','err');}catch(_){}});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();