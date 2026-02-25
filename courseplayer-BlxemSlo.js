import{s as c,a as z,n as L,e as a,c as D,g as F,b as W}from"./index-DoPy8HRy.js";let n=null,$=null,h={};function E(e){if(!e||!isFinite(e))return"0:00";const s=Math.floor(e/60),i=Math.floor(e%60);return`${s}:${i<10?"0":""}${i}`}async function R(){const e=c.cacheData.courses.find(r=>r.id===c.currentCourseId);if(!e)return;if(!D(e)){z("Kein Zugriff auf diesen Kurs.","error"),L("courses");return}await U();const s=c.cacheData.chapters.filter(r=>r.course_id===c.currentCourseId).sort((r,d)=>(r.sort_order||0)-(d.sort_order||0)),i=s.length,t=s.filter(r=>{var d;return(d=h[r.id])==null?void 0:d.completed}).length,o=i?Math.round(t/i*100):0,v=document.getElementById("coursePlayerHero");v&&e.image_url&&(v.style.display="block",v.innerHTML=`
      <div class="chapter-hero-bg" style="background-image:url('${a(e.image_url)}')"></div>
      <div class="chapter-hero-content">
        <h1 class="chapter-hero-title">${a(e.name)}</h1>
        ${e.description?`<p class="chapter-hero-desc">${a(e.description)}</p>`:""}
        <div class="chapter-hero-progress">
          <div class="chapter-hero-bar"><div class="chapter-hero-bar-fill" style="width:${o}%"></div></div>
          <span class="chapter-hero-meta">${o}%</span>
        </div>
      </div>
    `);const f=document.getElementById("coursePlayerTitleSection");f&&(f.innerHTML=`
      <span class="eyebrow">Kurs</span>
      <h1 class="page-title">${a(e.name)}</h1>
      ${e.description?`<p class="page-intro">${a(e.description)}</p>`:""}
    `,e.image_url?f.style.display="none":f.style.display="");const b=document.getElementById("coursePlayerBreadcrumb");b&&(b.innerHTML=`
      <button class="breadcrumb-link" onclick="navigateTo('courses')">Kurse</button>
      <span class="breadcrumb-sep">›</span>
      <span>${a(e.name)}</span>
    `);const m=document.getElementById("coursePlayerChaptersList"),y=document.getElementById("coursePlayerLektionenHeader"),l=s.some(r=>r.audio_url);y&&(y.style.display=l?"":"none"),m&&(l?m.innerHTML=s.map((r,d)=>{const p=h[r.id],g=p==null?void 0:p.completed,u=r.chapter_type==="vorwort"?"Vorwort":r.chapter_type==="abschluss"?"Abschlusswort":"",k=g?"pill-done":"",T=g?"✓":`${d+1}`,w=r.image_url?`<div class="card-image"><img src="${a(r.image_url)}" alt="${a(r.name)}" loading="lazy"></div>`:'<div class="card-image card-image-placeholder"><span>✦</span></div>';return`<div class="image-card" onclick="openChapterPlayer('${r.id}')">
          ${w}
          <div class="image-card-body">
            <div class="image-card-header">
              <div class="image-card-title">${a(r.name)}</div>
              <div class="progress-pill ${k}">${T}</div>
            </div>
            ${u?`<div class="image-card-type">${u}</div>`:""}
            ${r.description?`<div class="image-card-desc">${a(r.description)}</div>`:""}
          </div>
        </div>`}).join(""):m.innerHTML="");const _=document.getElementById("coursePlayerExercisesList"),B=document.getElementById("coursePlayerExercisesHeader"),C=s.filter(r=>c.cacheData.exercises.some(d=>d.chapter_id===r.id));B&&(B.style.display=C.length?"":"none"),_&&(C.length?_.innerHTML=C.map(r=>{const d=F(r.id),p=d.length,g=d.filter(A=>c.cacheAnswers[A.id]&&c.cacheAnswers[A.id].trim()).length,u=p?Math.round(g/p*100):0,k=u>=100?"pill-done":u>0?"pill-active":"",T=u>=100?"✓":u+"%",w=r.image_url?`<div class="card-image"><img src="${a(r.image_url)}" alt="${a(r.name)}" loading="lazy"></div>`:'<div class="card-image card-image-placeholder"><span>✦</span></div>';return`<div class="image-card" onclick="navigateTo('exercises',{courseId:'${c.currentCourseId}',chapterId:'${r.id}'})">
          ${w}
          <div class="image-card-body">
            <div class="image-card-header">
              <div class="image-card-title">${a(r.name)}</div>
              <div class="progress-pill ${k}">${T}</div>
            </div>
            ${r.description?`<div class="image-card-desc">${a(r.description)}</div>`:""}
          </div>
        </div>`}).join(""):_.innerHTML="");const x=document.getElementById("coursePlayerExtensionsList"),H=document.getElementById("coursePlayerExtensionsHeader"),I=c.cacheData.courses.filter(r=>r.parent_course_id===e.id);H&&(H.style.display=I.length?"":"none"),x&&(I.length?x.innerHTML=I.map(r=>{const d=D(r),p=r.image_url?`<div class="card-image"><img src="${a(r.image_url)}" alt="${a(r.name)}" loading="lazy"></div>`:'<div class="card-image card-image-placeholder"><span>✦</span></div>',g=d?`navigateTo('coursePlayer',{courseId:'${r.id}'})`:r.sales_slug?`navigateTo('salesDetail',{slug:'${a(r.sales_slug)}'})`:"",u=d?"":'<div class="image-card-badge">Erweiterung</div>';return`<div class="image-card${d?"":" image-card-locked"}" onclick="${g}">
          ${p}
          <div class="image-card-body">
            <div class="image-card-header">
              <div class="image-card-title">${a(r.name)}</div>
            </div>
            ${r.description?`<div class="image-card-desc">${a(r.description)}</div>`:""}
            ${u}
          </div>
        </div>`}).join(""):x.innerHTML="")}function N(e){L("chapterPlayer",{courseId:c.currentCourseId,chapterId:e})}async function Z(){const e=c.cacheData.chapters.find(l=>l.id===c.currentChapterId);if(!e)return;const s=c.cacheData.courses.find(l=>l.id===c.currentCourseId);if(!s)return;await U();const i=h[e.id],t=document.getElementById("chapterPlayerBreadcrumb");t&&(t.innerHTML=`
      <button class="breadcrumb-link" onclick="navigateTo('courses')">Kurse</button>
      <span class="breadcrumb-sep">›</span>
      <button class="breadcrumb-link" onclick="navigateTo('coursePlayer',{courseId:'${s.id}'})">${a(s.name)}</button>
      <span class="breadcrumb-sep">›</span>
      <span>${a(e.name)}</span>
    `);const o=document.getElementById("chapterPlayerContent");if(!o)return;const v=e.audio_duration_seconds?E(e.audio_duration_seconds):"",b=c.cacheData.exercises.filter(l=>l.chapter_id===e.id).length>0&&(e.chapter_type==="standard"||!e.chapter_type),m=e.image_url||s.image_url||"",y=e.chapter_type==="vorwort"?"Vorwort":e.chapter_type==="abschluss"?"Abschlusswort":"Lektion";o.innerHTML=`
    <div class="chapter-player">
      ${m?`
        <div class="chapter-detail-hero">
          <img src="${a(m)}" alt="${a(e.name)}" loading="lazy">
          <div class="chapter-detail-hero-overlay">
            <span class="chapter-detail-hero-eyebrow">${y}</span>
            <h1 class="chapter-detail-hero-title">${a(e.name)}</h1>
          </div>
        </div>
      `:`
        <div class="chapter-detail-header">
          <span class="chapter-detail-hero-eyebrow">${y}</span>
          <h1 class="chapter-detail-hero-title">${a(e.name)}</h1>
        </div>
      `}

      ${e.audio_url?`
        <div class="chapter-audio-section">
          <div class="chapter-audio-player">
            <button class="chapter-audio-play" id="chapterPlayBtn" onclick="toggleChapterAudio()">
              <svg id="chapterPlayIcon" viewBox="0 0 24 24" fill="currentColor" stroke="none" width="28" height="28"><polygon points="5,3 19,12 5,21"/></svg>
            </button>
            <div class="chapter-audio-info">
              <div class="chapter-audio-time">
                <span id="chapterCurrentTime">0:00</span> / <span id="chapterTotalTime">${v||"--:--"}</span>
              </div>
            </div>
            <div class="chapter-audio-progress-wrap" onclick="seekChapterAudio(event)">
              <div class="chapter-audio-progress-bar" id="chapterProgress"></div>
            </div>
          </div>
        </div>
      `:""}

      ${V(e)}

      ${b?`
        <div class="chapter-exercise-link">
          <div class="chapter-exercise-link-inner">
            <div class="chapter-exercise-link-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            </div>
            <div class="chapter-exercise-link-text">
              <h4>Zur Übung</h4>
              <p>Wende das Gelernte an mit den Reflexionsfragen zu diesem Kapitel.</p>
            </div>
            <button class="btn btn-primary btn-sm" onclick="navigateTo('exercises',{courseId:'${s.id}',chapterId:'${e.id}'})">
              Übung starten
            </button>
          </div>
        </div>
      `:""}

      <div class="chapter-nav-buttons">
        ${K(e)?`<button class="btn btn-ghost btn-sm" onclick="openChapterPlayer('${K(e).id}')">← Vorheriges Kapitel</button>`:"<span></span>"}
        <button class="btn btn-primary btn-sm" onclick="markChapterCompleteAndNext('${e.id}')">
          ${j(e)?"Kapitel abschliessen →":"Kurs abschliessen ✓"}
        </button>
      </div>
    </div>
  `,e.audio_url&&(q(),n=new Audio(e.audio_url),n.preload="auto",i!=null&&i.audio_position_seconds&&!i.completed&&(n.currentTime=i.audio_position_seconds),n.addEventListener("loadedmetadata",()=>{const l=document.getElementById("chapterTotalTime");l&&(l.textContent=E(n.duration))}),n.addEventListener("ended",()=>{P(!1),clearInterval($),M(e.id,Math.round(n.duration),!1)}))}function V(e){const s=(c.cacheData.chapterContentBlocks||[]).filter(i=>i.chapter_id===e.id).sort((i,t)=>(i.sort_order??0)-(t.sort_order??0));return s.length?`<div class="chapter-text-section"><div class="chapter-text-content">${s.map(t=>{const o=t.content||"";return t.type==="heading"?`<div class="content-block content-heading">${a(o)}</div>`:t.type==="subheading"?`<div class="content-block content-subheading">${a(o)}</div>`:t.type==="text"?`<div class="content-block content-text">${a(o).replace(/\n/g,"<br>")}</div>`:t.type==="quote"?`<div class="content-block content-quote">„${a(o)}"</div>`:t.type==="divider"?'<div class="content-block content-divider"><span>· · ·</span></div>':t.type==="image"?`<div class="content-block content-image"><img src="${a(o)}" alt="" loading="lazy"></div>`:""}).join("")}</div></div>`:e.chapter_text?`<div class="chapter-text-section"><div class="chapter-text-content">${e.chapter_text.split(`

`).map(t=>t.trim()).filter(t=>t).map(t=>t.startsWith("### ")?`<h4>${a(t.slice(4))}</h4>`:t.startsWith("## ")?`<h3>${a(t.slice(3))}</h3>`:t.startsWith("# ")?`<h2>${a(t.slice(2))}</h2>`:t.startsWith("> ")?`<blockquote>${a(t.slice(2))}</blockquote>`:t.startsWith("---")?"<hr>":`<p>${a(t).replace(/\n/g,"<br>")}</p>`).join("")}</div></div>`:""}function K(e){const s=c.cacheData.chapters.filter(t=>t.course_id===e.course_id).sort((t,o)=>(t.sort_order||0)-(o.sort_order||0)),i=s.findIndex(t=>t.id===e.id);return i>0?s[i-1]:null}function j(e){const s=c.cacheData.chapters.filter(t=>t.course_id===e.course_id).sort((t,o)=>(t.sort_order||0)-(o.sort_order||0)),i=s.findIndex(t=>t.id===e.id);return i<s.length-1?s[i+1]:null}function G(){if(n)if(n.paused)n.play(),P(!0),$=setInterval(S,250);else{n.pause(),P(!1),clearInterval($);const e=c.currentChapterId;e&&M(e,Math.round(n.currentTime),!1)}}function P(e){const s=document.getElementById("chapterPlayIcon");s&&(s.innerHTML=e?'<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>':'<polygon points="5,3 19,12 5,21"/>')}function S(){if(!n||!isFinite(n.duration))return;const e=n.currentTime/n.duration*100,s=document.getElementById("chapterProgress");s&&(s.style.width=e+"%");const i=document.getElementById("chapterCurrentTime");i&&(i.textContent=E(n.currentTime))}function Q(e){if(!n||!isFinite(n.duration))return;const i=e.currentTarget.getBoundingClientRect(),t=Math.max(0,Math.min(1,(e.clientX-i.left)/i.width));n.currentTime=t*n.duration,S()}function q(){n&&(n.pause(),n.src="",n=null),clearInterval($),$=null}async function U(){if(!c.currentUser)return;const{data:e}=await W.from("chapter_progress").select("*").eq("user_id",c.currentUser.id);h={},(e||[]).forEach(s=>{h[s.chapter_id]=s})}async function M(e,s,i){if(!c.currentUser)return;const t={user_id:c.currentUser.id,chapter_id:e,audio_position_seconds:s||0,completed:i||!1,updated_at:new Date().toISOString()};i&&(t.completed_at=new Date().toISOString()),await W.from("chapter_progress").upsert(t,{onConflict:"user_id,chapter_id"}),h[e]={...h[e],...t}}async function X(e){const s=c.cacheData.chapters.find(o=>o.id===e);if(!s)return;q();const i=n?Math.round(n.duration||0):0;await M(e,i,!0);const t=j(s);t?N(t.id):(z("Kurs abgeschlossen! 🎉"),L("coursePlayer",{courseId:s.course_id}))}export{X as markChapterCompleteAndNext,N as openChapterPlayer,Z as renderChapterPlayer,R as renderCoursePlayer,Q as seekChapterAudio,q as stopChapterAudio,G as toggleChapterAudio};
