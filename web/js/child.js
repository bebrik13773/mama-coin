// js/child.js

let childTab  = localStorage.getItem('c_tab') || 'home';
let childData = { tasks:[], leaderboard:[], wallet:{} };
let childRefreshTimer = null;

async function renderChild(tab) {
  if (tab) childTab = tab;
  showScreen('child');
  localStorage.setItem('c_tab', childTab);
  await loadChildData();
  drawChild();
  startChildAutoRefresh();
}

async function loadChildData() {
  const [tk,lb,wl] = await Promise.all([api.getTasks(), api.getLeaderboard(), api.getWallet()]);
  childData.tasks       = tk.data || [];
  childData.leaderboard = lb.data || [];
  childData.wallet      = wl.data || {};
}

function startChildAutoRefresh() {
  if (childRefreshTimer) clearInterval(childRefreshTimer);
  childRefreshTimer = setInterval(async () => {
    await loadChildData();
    const tab = childTab;
    if (tab==='home')   document.getElementById('c-tab-home')  ?.replaceWith(Object.assign(document.createElement('div'),{id:'c-tab-home',  className:'c-tab',innerHTML:renderChildHome()}));
    if (tab==='tasks')  document.getElementById('c-tab-tasks') ?.replaceWith(Object.assign(document.createElement('div'),{id:'c-tab-tasks', className:'c-tab',innerHTML:renderChildTasks()}));
    if (tab==='rank')   document.getElementById('c-tab-rank')  ?.replaceWith(Object.assign(document.createElement('div'),{id:'c-tab-rank',  className:'c-tab',innerHTML:renderChildLeaderboard()}));
    if (tab==='wallet') document.getElementById('c-tab-wallet')?.replaceWith(Object.assign(document.createElement('div'),{id:'c-tab-wallet',className:'c-tab',innerHTML:renderChildWallet()}));
  }, 10000);
}

function drawChild() {
  document.getElementById('screen-child').innerHTML = `
    <div id="c-tab-home"   class="c-tab ${childTab==='home'  ?'':'hidden'}">${renderChildHome()}</div>
    <div id="c-tab-tasks"  class="c-tab ${childTab==='tasks' ?'':'hidden'}">${renderChildTasks()}</div>
    <div id="c-tab-rank"   class="c-tab ${childTab==='rank'  ?'':'hidden'}">${renderChildLeaderboard()}</div>
    <div id="c-tab-wallet" class="c-tab ${childTab==='wallet'?'':'hidden'}">${renderChildWallet()}</div>
    ${childBottomNav()}
  `;
  // Task detail sheet
  let s = document.getElementById('c-task-sheet');
  if (!s) { s=document.createElement('div'); s.id='c-task-sheet'; s.className='bottom-sheet'; document.body.appendChild(s); }
  let ov = document.getElementById('c-overlay');
  if (!ov) { ov=document.createElement('div'); ov.id='c-overlay'; ov.className='overlay'; ov.onclick=closeChildSheets; document.body.appendChild(ov); }
}

function switchChildTab(tab) {
  document.querySelectorAll('.c-tab').forEach(t=>t.classList.add('hidden'));
  document.getElementById(`c-tab-${tab}`)?.classList.remove('hidden');
  document.querySelectorAll('#screen-child .nav-item').forEach(n=>n.classList.remove('active','child-nav'));
  document.getElementById(`c-nav-${tab}`)?.classList.add('active','child-nav');
  childTab=tab;
  localStorage.setItem('c_tab', tab);
}

function childBottomNav() {
  return `<nav class="bottom-nav">
    ${[['home','🏠','Главная'],['tasks','📋','Задания'],['rank','🏆','Рейтинг'],['wallet','🪙','Кошелёк']].map(([t,ic,lb])=>`
      <div class="nav-item ${childTab===t?'active child-nav':''}" id="c-nav-${t}" onclick="switchChildTab('${t}')">
        <div class="nav-icon">${ic}</div><span>${lb}</span>
      </div>`).join('')}
  </nav>`;
}

function closeChildSheets() {
  document.getElementById('c-overlay')?.classList.remove('open');
  document.getElementById('c-task-sheet')?.classList.remove('open');
}

// ── HOME ──────────────────────────────────────────────────
function renderChildHome() {
  const {tasks,wallet} = childData;
  const name     = Store.name()||'';
  const balance  = wallet.balance||0;
  const coinRate = wallet.coin_rate||50;
  const rubEquiv = (balance*coinRate/100).toFixed(2);
  const approved = tasks.filter(t=>t.my_status==='approved').length;
  const total    = tasks.length;
  const pct      = total>0?Math.round(approved/total*100):0;

  const available  = tasks.filter(t=>t.available&&!t.my_status);
  const inProgress = tasks.filter(t=>t.my_status==='in_progress');
  const pending    = tasks.filter(t=>t.my_status==='pending');
  const blocked    = tasks.filter(t=>!t.available&&!t.my_status);

  return `<div class="page" style="padding-bottom:80px;">
    <div style="background:linear-gradient(180deg,rgba(167,139,250,0.12) 0%,transparent 100%);padding:12px 16px 16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div><div style="font-size:0.78rem;color:var(--muted);font-weight:600;">Привет,</div>
          <div style="font-size:1.5rem;font-weight:900;">${esc(name)} 👋</div></div>
      </div>
      <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(245,200,66,0.1);border:1.5px solid rgba(245,200,66,0.25);border-radius:12px;padding:8px 14px;margin-bottom:10px;">
        <span style="font-size:1.1rem;">🪙</span>
        <span style="font-size:1rem;font-weight:900;color:var(--gold);">${balance} МамаКоинов</span>
      </div>
      <div style="font-size:0.72rem;color:var(--muted);margin-bottom:12px;">≈ ${rubEquiv} ₽</div>
      <div style="background:rgba(167,139,250,0.1);border:1.5px solid rgba(167,139,250,0.2);border-radius:var(--radius);padding:12px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span style="font-weight:700;font-size:0.85rem;">${approved} из ${total} заданий</span>
          <span style="font-weight:800;font-size:0.85rem;color:var(--purple);">${pct}%</span>
        </div>
        <div class="progress-wrap"><div class="progress-fill purple" style="width:${pct}%;"></div></div>
      </div>
    </div>

    ${inProgress.length>0?`<div class="section-header"><h3>В процессе ⚡</h3></div>${inProgress.map(t=>childTaskCardHTML(t)).join('')}`:''}
    ${pending.length>0?`<div class="section-header"><h3>На проверке ⏳</h3></div>${pending.map(t=>childTaskCardHTML(t)).join('')}`:''}
    <div class="section-header"><h3>Доступные задания</h3></div>
    ${available.length===0&&inProgress.length===0
      ?`<div class="empty-state"><div class="icon">🎉</div><h3>Всё выполнено!</h3></div>`
      :available.map(t=>childTaskCardHTML(t)).join('')}
    ${blocked.length>0?`<div class="section-header"><h3>Недоступно 🔒</h3></div>${blocked.map(t=>childTaskCardHTML(t)).join('')}`:''}
  </div>`;
}

function childTaskCardHTML(t) {
  const isProgress = t.my_status==='in_progress';
  const isPending  = t.my_status==='pending';
  const isApproved = t.my_status==='approved';
  const isBlocked  = !t.available&&!t.my_status;

  let actionBtn='';
  if (!isBlocked&&!isApproved&&!isPending) {
    if (isProgress&&t.my_claim_id) {
      actionBtn=`<button class="btn btn-sm" style="background:rgba(74,222,128,0.15);color:var(--green);border:1px solid rgba(74,222,128,0.3);" onclick="event.stopPropagation();submitTask(${t.my_claim_id})">Сдать ✓</button>`;
    } else if (!t.my_status) {
      actionBtn=`<button class="btn btn-sm" style="background:rgba(167,139,250,0.15);color:var(--purple);border:1px solid rgba(167,139,250,0.3);" onclick="event.stopPropagation();claimTask(${t.id})">Взять</button>`;
    }
  }

  return `<div class="task-item${isBlocked?' blocked':''}" onclick="openTaskDetail(${t.id})" style="cursor:pointer;">
    <div class="task-icon ${t.is_daily?'daily':'common'}">${t.emoji}</div>
    <div class="task-info">
      <div class="task-name">${esc(t.title)}</div>
      <div class="task-badges">
        ${isBlocked?'<span class="badge badge-red">Занято</span>':''}
        ${isPending?'<span class="badge badge-gold">На проверке</span>':''}
        ${isProgress?'<span class="badge badge-blue">В процессе</span>':''}
        ${isApproved?'<span class="badge badge-green">✓ Готово</span>':''}
        ${!t.my_status&&!isBlocked&&t.is_daily?'<span class="badge badge-blue">Ежедневное</span>':''}
        ${t.description&&!t.my_status?'<span class="badge badge-purple">📝</span>':''}
      </div>
    </div>
    <div class="task-actions">
      <span class="task-coins" style="${isBlocked?'color:var(--muted)':''}">+${t.coins_reward} 🪙</span>
      ${actionBtn}
    </div>
  </div>`;
}

function openTaskDetail(taskId) {
  const t = childData.tasks.find(x=>x.id===taskId);
  if (!t) return;
  const isProgress = t.my_status==='in_progress';
  const isPending  = t.my_status==='pending';
  const isApproved = t.my_status==='approved';
  const isBlocked  = !t.available&&!t.my_status;

  document.getElementById('c-task-sheet').innerHTML = `
    <div class="sheet-handle"></div>
    <div style="font-size:2.5rem;margin-bottom:8px;">${t.emoji}</div>
    <div style="font-size:1.2rem;font-weight:900;margin-bottom:8px;">${esc(t.title)}</div>
    ${t.description?`<div style="color:var(--muted);font-size:0.9rem;margin-bottom:12px;line-height:1.6;background:var(--card);border-radius:var(--radius-sm);padding:12px;">${esc(t.description)}</div>`:''}
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px;">
      <span class="badge badge-gold">+${t.coins_reward} 🪙</span>
      ${t.is_daily?'<span class="badge badge-blue">Ежедневное</span>':''}
      ${t.one_time_claim?'<span class="badge badge-gold">Только 1 раз</span>':''}
      ${isPending?'<span class="badge badge-gold">На проверке</span>':''}
      ${isApproved?'<span class="badge badge-green">✓ Выполнено</span>':''}
    </div>
    ${!isBlocked&&!isApproved&&!isPending
      ? isProgress&&t.my_claim_id
        ? `<button class="btn btn-gold" onclick="closeChildSheets();submitTask(${t.my_claim_id})">Сдать на проверку ✓</button>`
        : !t.my_status
          ? `<button class="btn btn-purple" onclick="closeChildSheets();claimTask(${t.id})">Взять задание</button>`
          : ''
      : isBlocked
        ? `<div style="text-align:center;color:var(--muted);font-size:0.85rem;">Задание занято другим</div>`
        : isPending
          ? `<div style="text-align:center;color:var(--gold);font-size:0.85rem;">⏳ Ожидает проверки родителя</div>`
          : ''}
  `;
  document.getElementById('c-overlay').classList.add('open');
  document.getElementById('c-task-sheet').classList.add('open');
}

async function claimTask(taskId) {
  const r = await api.claimTask(taskId);
  if (r.ok) { toast('Задание взято! 💪'); await renderChild(childTab); }
  else toast(r.error,'error');
}
async function submitTask(claimId) {
  const r = await api.submitClaim(claimId);
  if (r.ok) { toast('Сдано на проверку! 🎉'); await renderChild(childTab); }
  else toast(r.error,'error');
}

// ── TASKS TAB ─────────────────────────────────────────────
function renderChildTasks() {
  return `<div class="page" style="padding-bottom:80px;">
    <div class="topbar"><span class="topbar-title purple">Задания</span></div>
    ${childData.tasks.length===0
      ?`<div class="empty-state"><div class="icon">📋</div><h3>Нет заданий</h3></div>`
      :childData.tasks.map(t=>childTaskCardHTML(t)).join('')}
  </div>`;
}

// ── LEADERBOARD ───────────────────────────────────────────
function renderChildLeaderboard() {
  const {leaderboard} = childData;
  const myName = Store.name()||'';
  const top3 = leaderboard.slice(0,3);

  let podium='';
  if (top3.length>=2) {
    const order = top3.length>=3 ? [top3[1],top3[0],top3[2]] : [top3[1],top3[0]];
    const cls   = ['silver','gold','bronze'];
    const ht    = ['70px','100px','55px'];
    podium=`<div class="lb-podium">${order.map((e,i)=>`
      <div class="lb-podium-item">
        <div style="font-size:${i===1?'1.8rem':'1.5rem'}">${e.avatar}</div>
        <div class="name">${esc(e.name)}</div>
        <div class="podium-bar ${cls[i]}" style="height:${ht[i]};">
          <div style="font-size:0.75rem;font-weight:800;">${e.coins_balance} 🪙</div>
          <div style="font-size:${i===1?'1.4rem':'1.1rem'}">${i===1?'🥇':i===0?'🥈':'🥉'}</div>
        </div>
      </div>`).join('')}</div>`;
  }

  return `<div class="page" style="padding-bottom:80px;">
    <div class="topbar"><span class="topbar-title purple">Рейтинг 🏆</span></div>
    ${podium}
    <div class="card" style="margin:0 16px;padding:0;overflow:hidden;">
      ${leaderboard.map((e,i)=>{
        const isMe=e.name===myName;
        return `<div class="lb-row${isMe?' me':''}">
          <div class="lb-rank">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
          <div class="lb-ava">${e.avatar}</div>
          <div class="lb-name">${esc(e.name)}${isMe?' <span style="color:var(--purple);font-size:0.75rem;">(ты)</span>':''}</div>
          ${e.tasks_today>0?`<span class="badge badge-green">+${e.tasks_today}</span>`:''}
          <div class="lb-coins">${e.coins_balance} 🪙</div>
        </div>`;}).join('')}
    </div>
  </div>`;
}

// ── WALLET ────────────────────────────────────────────────
function renderChildWallet() {
  const {wallet}=childData;
  const balance  = wallet.balance||0;
  const coinRate = wallet.coin_rate||50;
  const limit    = wallet.monthly_limit||500;
  const used     = wallet.used_this_month||0;
  const rubEquiv = (balance*coinRate/100).toFixed(2);
  const limitPct = Math.min(100,Math.round(used/limit*100));

  return `<div class="page" style="padding-bottom:80px;">
    <div class="topbar" style="padding-left:16px;padding-right:16px;"><span class="topbar-title purple">Кошелёк</span></div>
    <div class="wallet-hero">
      <div class="wallet-lbl">МОЙ БАЛАНС</div>
      <div class="wallet-val">${balance} 🪙</div>
      <div class="wallet-rub">≈ ${rubEquiv} ₽</div>
    </div>
    <div style="display:flex;gap:8px;padding:0 16px;margin-bottom:12px;">
      <div class="card" style="flex:1;margin:0;text-align:center;">
        <div style="font-size:0.65rem;color:var(--muted);font-weight:700;text-transform:uppercase;">Курс</div>
        <div style="font-weight:800;font-size:0.95rem;margin-top:3px;">100🪙=${coinRate}₽</div>
      </div>
      <div class="card" style="flex:1;margin:0;text-align:center;">
        <div style="font-size:0.65rem;color:var(--muted);font-weight:700;text-transform:uppercase;">Лимит/мес</div>
        <div style="font-weight:800;font-size:0.95rem;color:var(--green);margin-top:3px;">${limit}🪙</div>
      </div>
    </div>
    <div class="card" style="margin:0 16px 12px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span style="font-weight:700;font-size:0.85rem;">Использовано</span>
        <span style="font-weight:800;font-size:0.85rem;color:var(--purple);">${used}/${limit} 🪙</span>
      </div>
      <div class="progress-wrap"><div class="progress-fill purple" style="width:${limitPct}%;"></div></div>
    </div>
    <div class="card" style="margin:0 16px 12px;">
      <div class="card-title">💱 Обменять монеты</div>
      <div class="input-group">
        <div class="input-label">Количество монет</div>
        <input class="input purple" id="exch-coins" type="number" value="100" min="1" max="${balance}" oninput="updateExchangePreview()">
      </div>
      <div id="exch-preview" style="display:flex;align-items:center;justify-content:center;gap:12px;background:var(--surface);border-radius:var(--radius-sm);padding:12px;margin-bottom:12px;">
        <span style="font-size:1rem;font-weight:800;color:var(--gold);">100 🪙</span>
        <span style="color:var(--muted);">→</span>
        <span style="font-size:1rem;font-weight:800;color:var(--green);">${coinRate} ₽</span>
      </div>
      <button class="btn btn-purple" onclick="requestExchange()">Запросить обмен у родителя</button>
    </div>
    <button class="btn btn-outline-red" style="margin:0 16px;" onclick="doChildLogout()">Выйти</button>
    <div style="height:16px;"></div>
  </div>`;
}

function updateExchangePreview() {
  const coins=parseInt(document.getElementById('exch-coins')?.value)||0;
  const rate =childData.wallet.coin_rate||50;
  const rub  =(coins*rate/100).toFixed(2);
  const el   =document.getElementById('exch-preview');
  if (el) el.innerHTML=`
    <span style="font-size:1rem;font-weight:800;color:var(--gold);">${coins} 🪙</span>
    <span style="color:var(--muted);">→</span>
    <span style="font-size:1rem;font-weight:800;color:var(--green);">${rub} ₽</span>`;
}

async function requestExchange() {
  const coins=parseInt(document.getElementById('exch-coins')?.value);
  if (!coins||coins<1) { toast('Введи количество монет','error'); return; }
  const r=await api.requestExchange(coins);
  if (r.ok) { toast('Запрос отправлен! 💰'); await renderChild('wallet'); }
  else toast(r.error,'error');
}

async function doChildLogout() {
  if (!confirm('Выйти?')) return;
  if (childRefreshTimer) clearInterval(childRefreshTimer);
  await api.logout();
  Store.clear();
  renderSplash();
  showScreen('splash');
}
