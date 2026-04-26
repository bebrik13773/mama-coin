// js/child.js — Все экраны ребёнка

let childTab  = 'home';
let childData = { tasks: [], leaderboard: [], wallet: {} };

async function renderChild(tab = 'home') {
  showScreen('child');
  childTab = tab;
  await loadChildData();
  drawChild();
}

async function loadChildData() {
  const [tk, lb, wl] = await Promise.all([
    api.getTasks(), api.getLeaderboard(), api.getWallet()
  ]);
  childData.tasks       = tk.data || [];
  childData.leaderboard = lb.data || [];
  childData.wallet      = wl.data || {};
}

function drawChild() {
  const el = document.getElementById('screen-child');
  el.innerHTML = `
    <div id="c-tab-home"   class="c-tab ${childTab==='home'   ?'':'hidden'}">${renderChildHome()}</div>
    <div id="c-tab-tasks"  class="c-tab ${childTab==='tasks'  ?'':'hidden'}">${renderChildTasks()}</div>
    <div id="c-tab-rank"   class="c-tab ${childTab==='rank'   ?'':'hidden'}">${renderChildLeaderboard()}</div>
    <div id="c-tab-wallet" class="c-tab ${childTab==='wallet' ?'':'hidden'}">${renderChildWallet()}</div>
    ${childBottomNav()}
  `;
}

function switchChildTab(tab) {
  document.querySelectorAll('.c-tab').forEach(t => t.classList.add('hidden'));
  document.getElementById(`c-tab-${tab}`).classList.remove('hidden');
  document.querySelectorAll('#screen-child .nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`c-nav-${tab}`).classList.add('active', 'child-nav');
  childTab = tab;
}

function childBottomNav() {
  const tabs = [['home','🏠','Главная'],['tasks','📋','Задания'],['rank','🏆','Рейтинг'],['wallet','🪙','Кошелёк']];
  return `<nav class="bottom-nav">
    ${tabs.map(([t,ic,lb]) => `
      <div class="nav-item ${childTab===t?'active child-nav':''}" id="c-nav-${t}" onclick="switchChildTab('${t}')">
        <div class="nav-icon">${ic}</div><span>${lb}</span>
      </div>`).join('')}
  </nav>`;
}

// ── HOME ──────────────────────────────────────────────────
function renderChildHome() {
  const { tasks, wallet } = childData;
  const name      = Store.name() || 'Привет';
  const balance   = wallet.balance || 0;
  const coinRate  = wallet.coin_rate || 50;
  const rubEquiv  = (balance * coinRate / 100).toFixed(2);

  const available   = tasks.filter(t => t.available && !t.my_status);
  const inProgress  = tasks.filter(t => t.my_status === 'in_progress');
  const pending     = tasks.filter(t => t.my_status === 'pending');
  const approved    = tasks.filter(t => t.my_status === 'approved');
  const progress    = tasks.length > 0 ? approved.length / tasks.length : 0;

  return `
    <div class="page" style="padding-bottom:80px;">
      <!-- Header -->
      <div style="background:linear-gradient(180deg,rgba(167,139,250,0.12) 0%,transparent 100%);
        padding:12px 16px 16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <div>
            <div style="font-size:0.78rem;color:var(--muted);font-weight:600;">Привет,</div>
            <div style="font-size:1.5rem;font-weight:900;">${esc(name)} 👋</div>
          </div>
          <div style="width:36px;height:36px;border-radius:50%;background:var(--card);
            border:1.5px solid var(--border);display:flex;align-items:center;justify-content:center;">🔔</div>
        </div>

        <!-- Balance badge -->
        <div style="display:inline-flex;align-items:center;gap:8px;
          background:rgba(245,200,66,0.1);border:1.5px solid rgba(245,200,66,0.25);
          border-radius:12px;padding:8px 14px;margin-bottom:12px;">
          <span style="font-size:1.1rem;">🪙</span>
          <span style="font-size:1rem;font-weight:900;color:var(--gold);">${balance} МамаКоинов</span>
        </div>
        <div style="font-size:0.72rem;color:var(--muted);font-weight:600;margin-bottom:12px;">≈ ${rubEquiv} ₽ по текущему курсу</div>

        <!-- Progress -->
        <div style="background:rgba(167,139,250,0.1);border:1.5px solid rgba(167,139,250,0.2);
          border-radius:var(--radius);padding:12px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="font-weight:700;font-size:0.85rem;">${approved.length} из ${tasks.length} заданий</span>
            <span style="font-weight:800;font-size:0.85rem;color:var(--purple);">${Math.round(progress*100)}%</span>
          </div>
          <div class="progress-wrap">
            <div class="progress-fill purple" style="width:${Math.round(progress*100)}%;"></div>
          </div>
        </div>
      </div>

      ${inProgress.length > 0 ? `
        <div class="section-header"><h3>В процессе ⚡</h3></div>
        ${inProgress.map(t => childTaskCardHTML(t)).join('')}
      ` : ''}

      ${pending.length > 0 ? `
        <div class="section-header"><h3>На проверке ⏳</h3></div>
        ${pending.map(t => childTaskCardHTML(t)).join('')}
      ` : ''}

      <div class="section-header"><h3>Доступные задания</h3></div>
      ${available.length === 0
        ? `<div class="empty-state"><div class="icon">🎉</div><h3>Всё выполнено!</h3><p>Новые задания появятся завтра</p></div>`
        : available.map(t => childTaskCardHTML(t)).join('')}

      ${tasks.filter(t => !t.available && !t.my_status).length > 0 ? `
        <div class="section-header"><h3>Недоступно 🔒</h3></div>
        ${tasks.filter(t => !t.available && !t.my_status).map(t => childTaskCardHTML(t)).join('')}
      ` : ''}
    </div>`;
}

function childTaskCardHTML(t) {
  const isProgress = t.my_status === 'in_progress';
  const isPending  = t.my_status === 'pending';
  const isApproved = t.my_status === 'approved';
  const isBlocked  = !t.available && !t.my_status;

  let actionBtn = '';
  if (!isBlocked && !isApproved) {
    if (isProgress) {
      actionBtn = `<button class="btn btn-sm" style="background:rgba(74,222,128,0.15);color:var(--green);border:1px solid rgba(74,222,128,0.3);font-size:0.72rem;" onclick="submitTask(${t.my_claim_id})">Сдать ✓</button>`;
    } else if (!isPending && !t.my_status) {
      actionBtn = `<button class="btn btn-sm" style="background:rgba(167,139,250,0.15);color:var(--purple);border:1px solid rgba(167,139,250,0.3);font-size:0.72rem;" onclick="claimTask(${t.id})">Взять</button>`;
    }
  }

  return `
    <div class="task-item${isBlocked?' blocked':''}">
      <div class="task-icon ${t.is_daily?'daily':'common'}">${t.emoji}</div>
      <div class="task-info">
        <div class="task-name">${esc(t.title)}</div>
        <div class="task-badges">
          ${isBlocked  ? '<span class="badge badge-red">Занято</span>' : ''}
          ${isPending  ? '<span class="badge badge-gold">На проверке</span>' : ''}
          ${isProgress ? '<span class="badge badge-blue">В процессе</span>' : ''}
          ${isApproved ? '<span class="badge badge-green">✓ Сделано</span>' : ''}
          ${!t.my_status && !isBlocked && t.is_daily ? '<span class="badge badge-blue">Ежедневное</span>' : ''}
        </div>
      </div>
      <div class="task-actions">
        <span class="task-coins" style="${isBlocked?'color:var(--muted)':''}">${isApproved?'':'+'} ${t.coins_reward} 🪙</span>
        ${actionBtn}
      </div>
    </div>`;
}

async function claimTask(taskId) {
  const r = await api.claimTask(taskId);
  if (r.ok) { toast('Задание взято! Выполни его 💪'); await renderChild(childTab); }
  else toast(r.error, 'error');
}

async function submitTask(claimId) {
  const r = await api.submitClaim(claimId);
  if (r.ok) { toast('Сдано на проверку! Жди одобрения 🎉'); await renderChild(childTab); }
  else toast(r.error, 'error');
}

// ── ALL TASKS TAB ─────────────────────────────────────────
function renderChildTasks() {
  const { tasks } = childData;
  return `
    <div class="page" style="padding-bottom:80px;">
      <div class="topbar"><span class="topbar-title purple">Задания</span></div>
      ${tasks.length === 0
        ? `<div class="empty-state"><div class="icon">📋</div><h3>Нет заданий</h3><p>Родитель ещё не создал задания</p></div>`
        : tasks.map(t => childTaskCardHTML(t)).join('')}
    </div>`;
}

// ── LEADERBOARD ───────────────────────────────────────────
function renderChildLeaderboard() {
  const { leaderboard } = childData;
  const myName = Store.name() || '';
  const top3   = leaderboard.slice(0, 3);

  let podiumHTML = '';
  if (top3.length >= 2) {
    // Order: 2nd, 1st, 3rd
    const order = [top3[1], top3[0], top3.length >= 3 ? top3[2] : null].filter(Boolean);
    const classes = top3.length >= 3 ? ['silver','gold','bronze'] : ['silver','gold'];
    const heights = top3.length >= 3 ? ['70px','100px','55px'] : ['70px','100px'];
    podiumHTML = `
      <div class="lb-podium">
        ${order.map((e, i) => {
          const cls = classes[i], h = heights[i];
          return `<div class="lb-podium-item">
            <div style="font-size:${i===1?'1.8rem':'1.5rem'}">${e.avatar}</div>
            <div class="name">${esc(e.name)}</div>
            <div class="podium-bar ${cls}" style="height:${h};">
              <div style="font-size:0.75rem;font-weight:800;color:${i===0?'#a8b0be':i===1?'var(--gold)':'#cd7f32'};">${e.coins_balance} 🪙</div>
              <div style="font-size:${i===1?'1.4rem':'1.1rem'}">${i===1?'🥇':i===0?'🥈':'🥉'}</div>
            </div>
          </div>`;
        }).join('')}
      </div>`;
  }

  return `
    <div class="page" style="padding-bottom:80px;">
      <div class="topbar"><span class="topbar-title purple">Рейтинг 🏆</span></div>
      <div style="text-align:center;padding:0 16px 12px;font-size:0.78rem;color:var(--muted);font-weight:600;">
        Этот месяц · семейный рейтинг
      </div>
      ${podiumHTML}
      <div class="card" style="margin:0 16px;padding:0;overflow:hidden;">
        ${leaderboard.map((e, i) => {
          const isMe = e.name === myName;
          return `<div class="lb-row${isMe?' me':''}">
            <div class="lb-rank">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</div>
            <div class="lb-ava">${e.avatar}</div>
            <div class="lb-name">${esc(e.name)}${isMe?' <span style="color:var(--purple);font-size:0.75rem;">(ты)</span>':''}</div>
            ${e.tasks_today > 0 ? `<span class="badge badge-green">+${e.tasks_today} сегодня</span>` : ''}
            <div class="lb-coins">${e.coins_balance} 🪙</div>
          </div>`;
        }).join('')}
      </div>
      <div style="text-align:center;padding:12px;font-size:0.7rem;color:var(--muted);font-weight:600;">
        Обновляется ежедневно в 00:00
      </div>
    </div>`;
}

// ── WALLET ────────────────────────────────────────────────
function renderChildWallet() {
  const { wallet } = childData;
  const balance   = wallet.balance        || 0;
  const coinRate  = wallet.coin_rate      || 50;
  const limit     = wallet.monthly_limit  || 500;
  const used      = wallet.used_this_month|| 0;
  const rubEquiv  = (balance * coinRate / 100).toFixed(2);
  const limitPct  = Math.min(100, Math.round(used / limit * 100));

  return `
    <div class="page" style="padding-bottom:80px;">
      <div class="topbar" style="padding-left:16px;padding-right:16px;">
        <span class="topbar-title purple">Кошелёк</span>
      </div>

      <div class="wallet-hero">
        <div class="wallet-lbl">МОЙ БАЛАНС</div>
        <div class="wallet-val">${balance} 🪙</div>
        <div class="wallet-rub">≈ ${rubEquiv} ₽ по текущему курсу</div>
      </div>

      <div style="display:flex;gap:8px;padding:0 16px;margin-bottom:12px;">
        <div class="card" style="flex:1;margin:0;text-align:center;">
          <div style="font-size:0.65rem;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Курс</div>
          <div style="font-weight:800;font-size:0.95rem;margin-top:3px;">100 🪙 = ${coinRate} ₽</div>
        </div>
        <div class="card" style="flex:1;margin:0;text-align:center;">
          <div style="font-size:0.65rem;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Лимит/мес</div>
          <div style="font-weight:800;font-size:0.95rem;color:var(--green);margin-top:3px;">${limit} 🪙</div>
        </div>
      </div>

      <div class="card" style="margin:0 16px 12px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span style="font-weight:700;font-size:0.85rem;">Лимит этого месяца</span>
          <span style="font-weight:800;font-size:0.85rem;color:var(--purple);">${used} / ${limit} 🪙</span>
        </div>
        <div class="progress-wrap">
          <div class="progress-fill purple" style="width:${limitPct}%;"></div>
        </div>
      </div>

      <div class="card" style="margin:0 16px 12px;">
        <div class="card-title">💱 Обменять монеты</div>
        <div class="input-group">
          <div class="input-label">Количество монет</div>
          <input class="input purple" id="exch-coins" type="number" value="100" min="1" max="${balance}"
            oninput="updateExchangePreview()">
        </div>
        <div id="exch-preview" style="display:flex;align-items:center;justify-content:center;gap:12px;
          background:var(--surface);border-radius:var(--radius-sm);padding:12px;margin-bottom:12px;">
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
  const coins    = parseInt(document.getElementById('exch-coins').value) || 0;
  const coinRate = childData.wallet.coin_rate || 50;
  const rub      = (coins * coinRate / 100).toFixed(2);
  document.getElementById('exch-preview').innerHTML = `
    <span style="font-size:1rem;font-weight:800;color:var(--gold);">${coins} 🪙</span>
    <span style="color:var(--muted);">→</span>
    <span style="font-size:1rem;font-weight:800;color:var(--green);">${rub} ₽</span>`;
}

async function requestExchange() {
  const coins = parseInt(document.getElementById('exch-coins').value);
  if (!coins || coins < 1) { toast('Введи количество монет', 'error'); return; }
  const r = await api.requestExchange(coins);
  if (r.ok) { toast('Запрос отправлен родителю! 💰'); await renderChild('wallet'); }
  else toast(r.error, 'error');
}

async function doChildLogout() {
  if (!confirm('Выйти?')) return;
  await api.logout();
  Store.clear();
  renderSplash();
  showScreen('splash');
}
