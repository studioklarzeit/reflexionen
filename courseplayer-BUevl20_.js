import{s as i,a as w,n as _,e as o,c as M,b as I}from"./index-B-yco6M3.js";let s=null,f=null,u={};function v(e){if(!e||!isFinite(e))return"0:00";const t=Math.floor(e/60),r=Math.floor(e%60);return`${t}:${r<10?"0":""}${r}`}async function D(){const e=i.cacheData.courses.find(a=>a.id===i.currentCourseId);if(!e)return;if(!M(e)){w("Kein Zugriff auf diesen Kurs.","error"),_("courses");return}await B();const t=i.cacheData.chapters.filter(a=>a.course_id===i.currentCourseId).sort((a,l)=>(a.sort_order||0)-(l.sort_order||0)),r=t.length,n=t.filter(a=>{var l;return(l=u[a.id])==null?void 0:l.completed}).length,d=r?Math.round(n/r*100):0,p=document.getElementById("coursePlayerHero");p&&e.image_url&&(p.style.display="block",p.innerHTML=`
      <div class="chapter-hero-image" style="background-image:url('${o(e.image_url)}')"></div>
      <div class="chapter-hero-content">
        <h1 class="chapter-hero-title">${o(e.name)}</h1>
        ${e.description?`<p class="chapter-hero-desc">${o(e.description)}</p>`:""}
        <div class="chapter-hero-progress">
          <div class="chapter-hero-bar"><div class="chapter-hero-bar-fill" style="width:${d}%"></div></div>
          <span class="chapter-hero-pct">${d}%</span>
        </div>
      </div>
    `);const h=document.getElementById("coursePlayerTitleSection");h&&(h.innerHTML=`
      <span class="eyebrow">Online-Kurs</span>
      <h1 class="page-title">${o(e.name)}</h1>
      ${e.description?`<p class="page-intro">${o(e.description)}</p>`:""}
    `,e.image_url?h.style.display="none":h.style.display="");const m=document.getElementById("coursePlayerBreadcrumb");m&&(m.innerHTML=`
      <button class="breadcrumb-link" onclick="navigateTo('courses')">Kurse</button>
      <span class="breadcrumb-sep">›</span>
      <span>${o(e.name)}</span>
    `);const c=document.getElementById("coursePlayerChaptersList");if(c){if(!t.length){c.innerHTML='<div class="empty-state">Noch keine Kapitel verfügbar.</div>';return}c.innerHTML=t.map((a,l)=>{const g=u[a.id],C=g==null?void 0:g.completed,k=a.audio_duration_seconds?v(a.audio_duration_seconds):"",y=a.chapter_type==="vorwort"?"Vorwort":a.chapter_type==="abschluss"?"Abschlusswort":"";return(a.chapter_type==="standard"||a.chapter_type==="content")&&l+1,`
      <div class="course-chapter-card ${C?"completed":""}" onclick="openChapterPlayer('${a.id}')">
        <div class="course-chapter-indicator">
          ${C?'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>':`<span class="course-chapter-num">${l+1}</span>`}
        </div>
        <div class="course-chapter-info">
          ${y?`<span class="course-chapter-type">${y}</span>`:""}
          <h3 class="course-chapter-title">${o(a.name)}</h3>
          ${a.description?`<p class="course-chapter-desc">${o(a.description)}</p>`:""}
        </div>
        <div class="course-chapter-meta">
          ${k?`<span class="course-chapter-duration">${k}</span>`:""}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>
    `}).join("")}}function A(e){_("chapterPlayer",{courseId:i.currentCourseId,chapterId:e})}async function H(){const e=i.cacheData.chapters.find(c=>c.id===i.currentChapterId);if(!e)return;const t=i.cacheData.courses.find(c=>c.id===i.currentCourseId);if(!t)return;await B();const r=u[e.id],n=document.getElementById("chapterPlayerBreadcrumb");n&&(n.innerHTML=`
      <button class="breadcrumb-link" onclick="navigateTo('courses')">Kurse</button>
      <span class="breadcrumb-sep">›</span>
      <button class="breadcrumb-link" onclick="navigateTo('coursePlayer',{courseId:'${t.id}'})">${o(t.name)}</button>
      <span class="breadcrumb-sep">›</span>
      <span>${o(e.name)}</span>
    `);const d=document.getElementById("chapterPlayerContent");if(!d)return;const p=e.audio_duration_seconds?v(e.audio_duration_seconds):"",m=i.cacheData.exercises.filter(c=>c.chapter_id===e.id).length>0&&(e.chapter_type==="standard"||!e.chapter_type);d.innerHTML=`
    <div class="chapter-player">
      ${e.audio_url?`
        <div class="chapter-audio-section">
          <div class="chapter-audio-player">
            <button class="chapter-audio-play" id="chapterPlayBtn" onclick="toggleChapterAudio()">
              <svg id="chapterPlayIcon" viewBox="0 0 24 24" fill="currentColor" stroke="none" width="28" height="28"><polygon points="5,3 19,12 5,21"/></svg>
            </button>
            <div class="chapter-audio-info">
              <div class="chapter-audio-title">${o(e.name)}</div>
              <div class="chapter-audio-time">
                <span id="chapterCurrentTime">0:00</span> / <span id="chapterTotalTime">${p||"--:--"}</span>
              </div>
            </div>
            <div class="chapter-audio-progress-wrap" onclick="seekChapterAudio(event)">
              <div class="chapter-audio-progress-bar" id="chapterProgress"></div>
            </div>
          </div>
        </div>
      `:""}

      ${e.chapter_text?`
        <div class="chapter-text-section">
          <div class="chapter-text-content">${K(e.chapter_text)}</div>
        </div>
      `:""}

      ${m?`
        <div class="chapter-exercise-link">
          <div class="chapter-exercise-link-inner">
            <div class="chapter-exercise-link-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            </div>
            <div class="chapter-exercise-link-text">
              <h4>Zur Übung</h4>
              <p>Wende das Gelernte an mit den Reflexionsfragen zu diesem Kapitel.</p>
            </div>
            <button class="btn btn-primary btn-sm" onclick="navigateTo('exercises',{courseId:'${t.id}',chapterId:'${e.id}'})">
              Übung starten
            </button>
          </div>
        </div>
      `:""}

      <div class="chapter-nav-buttons">
        ${x(e)?`<button class="btn btn-ghost btn-sm" onclick="openChapterPlayer('${x(e).id}')">← Vorheriges Kapitel</button>`:"<span></span>"}
        <button class="btn btn-primary btn-sm" onclick="markChapterCompleteAndNext('${e.id}')">
          ${T(e)?"Kapitel abschliessen →":"Kurs abschliessen ✓"}
        </button>
      </div>
    </div>
  `,e.audio_url&&(E(),s=new Audio(e.audio_url),s.preload="auto",r!=null&&r.audio_position_seconds&&!r.completed&&(s.currentTime=r.audio_position_seconds),s.addEventListener("loadedmetadata",()=>{const c=document.getElementById("chapterTotalTime");c&&(c.textContent=v(s.duration))}),s.addEventListener("ended",()=>{b(!1),clearInterval(f),$(e.id,Math.round(s.duration),!1)}))}function K(e){return e.split(`

`).map(t=>t.trim()).filter(t=>t).map(t=>t.startsWith("### ")?`<h4>${o(t.slice(4))}</h4>`:t.startsWith("## ")?`<h3>${o(t.slice(3))}</h3>`:t.startsWith("# ")?`<h2>${o(t.slice(2))}</h2>`:t.startsWith("> ")?`<blockquote>${o(t.slice(2))}</blockquote>`:t.startsWith("---")?"<hr>":`<p>${o(t).replace(/\n/g,"<br>")}</p>`).join("")}function x(e){const t=i.cacheData.chapters.filter(n=>n.course_id===e.course_id).sort((n,d)=>(n.sort_order||0)-(d.sort_order||0)),r=t.findIndex(n=>n.id===e.id);return r>0?t[r-1]:null}function T(e){const t=i.cacheData.chapters.filter(n=>n.course_id===e.course_id).sort((n,d)=>(n.sort_order||0)-(d.sort_order||0)),r=t.findIndex(n=>n.id===e.id);return r<t.length-1?t[r+1]:null}function W(){if(s)if(s.paused)s.play(),b(!0),f=setInterval(P,250);else{s.pause(),b(!1),clearInterval(f);const e=i.currentChapterId;e&&$(e,Math.round(s.currentTime),!1)}}function b(e){const t=document.getElementById("chapterPlayIcon");t&&(t.innerHTML=e?'<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>':'<polygon points="5,3 19,12 5,21"/>')}function P(){if(!s||!isFinite(s.duration))return;const e=s.currentTime/s.duration*100,t=document.getElementById("chapterProgress");t&&(t.style.width=e+"%");const r=document.getElementById("chapterCurrentTime");r&&(r.textContent=v(s.currentTime))}function S(e){if(!s||!isFinite(s.duration))return;const r=e.currentTarget.getBoundingClientRect(),n=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));s.currentTime=n*s.duration,P()}function E(){s&&(s.pause(),s.src="",s=null),clearInterval(f),f=null}async function B(){if(!i.currentUser)return;const{data:e}=await I.from("chapter_progress").select("*").eq("user_id",i.currentUser.id);u={},(e||[]).forEach(t=>{u[t.chapter_id]=t})}async function $(e,t,r){if(!i.currentUser)return;const n={user_id:i.currentUser.id,chapter_id:e,audio_position_seconds:t||0,completed:r||!1,updated_at:new Date().toISOString()};r&&(n.completed_at=new Date().toISOString()),await I.from("chapter_progress").upsert(n,{onConflict:"user_id,chapter_id"}),u[e]={...u[e],...n}}async function j(e){const t=i.cacheData.chapters.find(d=>d.id===e);if(!t)return;E();const r=s?Math.round(s.duration||0):0;await $(e,r,!0);const n=T(t);n?A(n.id):(w("Kurs abgeschlossen! 🎉"),_("coursePlayer",{courseId:t.course_id}))}export{j as markChapterCompleteAndNext,A as openChapterPlayer,H as renderChapterPlayer,D as renderCoursePlayer,S as seekChapterAudio,E as stopChapterAudio,W as toggleChapterAudio};
