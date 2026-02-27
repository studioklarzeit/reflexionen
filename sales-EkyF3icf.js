import{s as o,a as u,n as g,b as l,e as t}from"./index-DoPy8HRy.js";async function $(){const r=document.getElementById("salesCoursesList");if(!r)return;const{data:a,error:i}=await l.from("courses").select("*").eq("sales_published",!0).order("sort_order");if(i||!(a!=null&&a.length)){r.innerHTML='<div class="empty-state">Aktuell keine Kurse verfügbar.</div>';return}r.innerHTML=a.map(s=>{const e=s.price_onetime_amount?`CHF ${(s.price_onetime_amount/100).toFixed(0)}`:s.price_subscription_amount?`CHF ${(s.price_subscription_amount/100).toFixed(0)}/Mt.`:"",n=s.image_url?`<div class="card-image"><img src="${t(s.image_url)}" alt="${t(s.name)}" loading="lazy"></div>`:'<div class="card-image card-image-placeholder"><span>✦</span></div>';return`<div class="image-card" onclick="navigateTo('salesDetail',{slug:'${t(s.sales_slug)}'})">
      ${n}
      <div class="image-card-body">
        <div class="image-card-type">Online-Kurs</div>
        <div class="image-card-header">
          <div class="image-card-title">${t(s.sales_headline||s.name)}</div>
        </div>
        ${s.description?`<div class="image-card-desc">${t(s.description)}</div>`:""}
        ${e?`<div class="sales-card-price">${e}</div>`:""}
      </div>
    </div>`}).join("")}async function f(r){const a=document.getElementById("salesDetailContent");if(!a)return;const{data:i,error:s}=await l.from("courses").select("*").eq("sales_slug",r).eq("sales_published",!0).limit(1);if(s||!(i!=null&&i.length)){a.innerHTML=`
      <div class="sales-header">
        <div class="sales-logo" onclick="navigateTo('salesOverview')">Studio Klarzeit</div>
      </div>
      <div class="empty-state">Kurs nicht gefunden.</div>
    `;return}const e=i[0],{data:n}=await l.from("chapters").select("id").eq("course_id",e.id),v=(n==null?void 0:n.length)||0;let d=!1;if(o.currentUser){const{data:c}=await l.from("course_access").select("course_id").eq("user_id",o.currentUser.id).eq("course_id",e.id).limit(1);d=c&&c.length>0}const p=e.sales_features||[],m=e.price_onetime_amount?(e.price_onetime_amount/100).toFixed(0):null,h=e.price_subscription_amount?(e.price_subscription_amount/100).toFixed(0):null;a.innerHTML=`
    <div class="sales-header">
      <div class="sales-logo" onclick="navigateTo('salesOverview')">Studio Klarzeit</div>
      <div class="sales-nav">
        <a href="https://www.studioklarzeit.ch" class="sales-nav-link" target="_top">Website</a>
        ${o.currentUser?`<button class="btn btn-ghost btn-sm" onclick="navigateTo('courses')">Meine Kurse</button>`:`<button class="btn btn-ghost btn-sm" onclick="navigateTo('auth')">Einloggen</button>`}
      </div>
    </div>

    <div class="sales-detail">
      ${e.image_url?`
        <div class="sales-hero">
          <div class="sales-hero-image" style="background-image:url('${t(e.image_url)}')"></div>
          <div class="sales-hero-overlay"></div>
          <div class="sales-hero-content">
            <span class="sales-hero-eyebrow">Online-Kurs · ${v} Kapitel</span>
            <h1 class="sales-hero-title">${t(e.sales_headline||e.name)}</h1>
          </div>
        </div>
      `:`
        <div class="sales-title-section">
          <span class="eyebrow">Online-Kurs · ${v} Kapitel</span>
          <h1 class="page-title">${t(e.sales_headline||e.name)}</h1>
        </div>
      `}

      ${e.sales_description?`
        <div class="sales-description">
          <p>${t(e.sales_description).replace(/\n/g,"<br>")}</p>
        </div>
      `:""}

      ${p.length?`
        <div class="sales-features">
          <h3>Was dich erwartet</h3>
          <ul>
            ${p.map(c=>`<li><span class="sales-feature-check">✓</span> ${t(c)}</li>`).join("")}
          </ul>
        </div>
      `:""}

      <div class="sales-pricing">
        <h3>Preise</h3>
        <div class="sales-pricing-cards">
          ${m?`
            <div class="sales-price-card">
              <div class="sales-price-label">Einmalzahlung</div>
              <div class="sales-price-amount">CHF ${m}</div>
              <div class="sales-price-detail">Lebenslanger Zugang</div>
              ${d?`<button class="btn btn-primary" onclick="navigateTo('coursePlayer',{courseId:'${e.id}'})">Zum Kurs</button>`:`<button class="btn btn-primary" onclick="handlePurchase('${e.id}','onetime')">${t(e.sales_cta_text||"Jetzt starten")}</button>`}
            </div>
          `:""}
          ${h?`
            <div class="sales-price-card">
              <div class="sales-price-label">Monatsabo</div>
              <div class="sales-price-amount">CHF ${h}<span class="sales-price-period">/Monat</span></div>
              <div class="sales-price-detail">Jederzeit kündbar</div>
              ${d?`<button class="btn btn-primary" onclick="navigateTo('coursePlayer',{courseId:'${e.id}'})">Zum Kurs</button>`:`<button class="btn btn-secondary" onclick="handlePurchase('${e.id}','subscription')">${t(e.sales_cta_text||"Jetzt starten")}</button>`}
            </div>
          `:""}
        </div>
      </div>
    </div>
  `}async function b(r,a){if(!o.currentUser){sessionStorage.setItem("pendingPurchase",JSON.stringify({courseId:r,paymentType:a})),u("Bitte melde dich an, um den Kurs zu kaufen."),g("auth");return}u("Weiterleitung zu Stripe...");try{const{data:i,error:s}=await l.functions.invoke("create-checkout-session",{body:{courseId:r,paymentType:a}});if(s)throw s;if(i!=null&&i.url)window.location.href=i.url;else throw new Error("Keine Checkout-URL erhalten.")}catch(i){console.error("Purchase error:",i),u("Fehler beim Erstellen der Checkout-Session. Bitte versuche es erneut.","error")}}async function y(){const r=sessionStorage.getItem("pendingPurchase");if(!r)return!1;sessionStorage.removeItem("pendingPurchase");try{const{courseId:a,paymentType:i}=JSON.parse(r);return await b(a,i),!0}catch(a){return console.error("Pending purchase error:",a),!1}}export{y as checkPendingPurchase,b as handlePurchase,f as renderSalesDetail,$ as renderSalesOverview};
