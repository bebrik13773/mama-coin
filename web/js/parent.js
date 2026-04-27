// js/parent.js

let parentTab  = localStorage.getItem('p_tab') || 'home';
let parentData = { children:[], tasks:[], pending:[], family:null, exchanges:[] };
let parentRefreshTimer = null;

async function renderParent(tab) {
  if (tab) parentTab = tab;
  showScreen('parent');
  localStorage.setItem('p_tab', parentTab);
  await loadParentData();
  drawParent();
  startParentAutoRefresh();
}

async function loadParentData() {
  const [ch,tk,pd,fm,ex] = await Promise.all([
    api.getChildren(), api.getTasks(), api.getPending(),
    api.getFamily(),   api.getPendingExchanges()
  ]);
  parentData.children  = ch.data  || [];
  parentData.tasks     = tk.data  || [];
  parentData.pending   = pd.data  || [];
  parentData.family    = fm.data  || null;
  parentData.exchanges = ex.data  || [];
}

function startParentAutoRefresh() {
  if (parentRefreshTimer) clearInterval(parentRefreshTimer);
  parentRefreshTimer = setInterval(async () => {
    await loadParentData();
    const tab = parentTab;
    // Обновляем только данные активного таба без полного перерендера
    if (tab === 'home')     document.getElementById('p-tab-home')    ?.replaceWith(Object.assign(document.createElement('div'), {id:'p-tab-home',    className:'p-tab', innerHTML:renderParentHome()}));
    if (tab === 'tasks')    document.getElementById('p-tab-tasks')   ?.replaceWith(Object.assign(document.createElement('div'), {id:'p-tab-tasks',   className:'p-tab', innerHTML:renderParentTasks()}));
    if (tab === 'review')   document.getElementById('p-tab-review')  ?.replaceWith(Object.assign(document.createElement('div'), {id:'p-tab-review',  className:'p-tab', innerHTML:renderParentReview()}));
    if (tab === 'settings') document.getElementById('p-tab-settings')?.replaceWith(Object.assign(document.createElement('div'), {id:'p-tab-settings',className:'p-tab', innerHTML:renderParentSettings()}));
  }, 10000); // каждые 15 сек
}

function drawParent() {
  document.getElementById('screen-parent').innerHTML = `
    <div id="p-tab-home"     class="p-tab ${parentTab==='home'    ?'':'hidden'}">${renderParentHome()}</div>
    <div id="p-tab-tasks"    class="p-tab ${parentTab==='tasks'   ?'':'hidden'}">${renderParentTasks()}</div>
    <div id="p-tab-review"   class="p-tab ${parentTab==='review'  ?'':'hidden'}">${renderParentReview()}</div>
    <div id="p-tab-settings" class="p-tab ${parentTab==='settings'?'':'hidden'}">${renderParentSettings()}</div>
    ${parentBottomNav()}
  `;
  ensureSheets();
}

function ensureSheets() {
  let s = document.getElementById('p-sheets');
  if (!s) { s = document.createElement('div'); s.id='p-sheets'; document.body.appendChild(s); }
  s.innerHTML = `
    <div id="p-overlay" class="overlay" onclick="closeAllSheets()"></div>
    <div id="p-reject-sheet" class="bottom-sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-title">Причина отклонения</div>
      <textarea class="input" id="reject-reason" rows="3" placeholder="Опционально..." style="resize:none;width:100%;margin-bottom:12px;"></textarea>
      <button class="btn btn-outline-red" onclick="submitReject()">Отклонить</button>
    </div>
    <div id="p-create-task-sheet" class="bottom-sheet">
      <div id="p-create-task-inner"></div>
    </div>
    <div id="p-child-sheet" class="bottom-sheet">
      <div id="p-child-inner"></div>
    </div>
  `;
}

function switchParentTab(tab) {
  document.querySelectorAll('.p-tab').forEach(t=>t.classList.add('hidden'));
  document.getElementById(`p-tab-${tab}`)?.classList.remove('hidden');
  document.querySelectorAll('#screen-parent .nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById(`p-nav-${tab}`)?.classList.add('active');
  parentTab = tab;
  localStorage.setItem('p_tab', tab);
}

function parentBottomNav() {
  const badge = parentData.pending.length > 0
    ? `<span style="position:absolute;top:-2px;right:6px;background:var(--red);color:#fff;border-radius:99px;font-size:0.55rem;font-weight:900;padding:1px 5px;">${parentData.pending.length}</span>` : '';
  return `<nav class="bottom-nav">
    ${[['home','🏠','Главная'],['tasks','📋','Задания'],['review','🔍','Проверка'],['settings','⚙️','Настройки']].map(([t,ic,lb])=>`
      <div class="nav-item ${parentTab===t?'active':''}" id="p-nav-${t}" onclick="switchParentTab('${t}')">
        <div class="nav-icon" style="position:relative;">${ic}${t==='review'?badge:''}</div><span>${lb}</span>
      </div>`).join('')}
  </nav>`;
}

// ── HOME ──────────────────────────────────────────────────
function renderParentHome() {
  const {children,tasks,pending} = parentData;
  return `<div class="page" style="padding-bottom:80px;">
    <div class="topbar"><span class="topbar-title">МамаКоин</span></div>
    <div class="stat-row">
      <div class="stat-box"><div class="stat-val" style="color:var(--gold);">${children.length}</div><div class="stat-lbl">Детей</div></div>
      <div class="stat-box"><div class="stat-val" style="color:var(--blue);">${tasks.length}</div><div class="stat-lbl">Заданий</div></div>
      <div class="stat-box"><div class="stat-val" style="color:var(--red);">${pending.length}</div><div class="stat-lbl">Проверка</div></div>
    </div>
    ${pending.length>0?`<div class="section-header"><h3>На проверке 🔍</h3><a onclick="switchParentTab('review')">Все →</a></div>${pending.slice(0,2).map(claimCardHTML).join('')}`:''}
    <div class="section-header"><h3>Дети 👨‍👩‍👧</h3></div>
    ${children.length===0
      ? `<div class="empty-state"><div class="icon">👶</div><h3>Нет детей</h3><p>Поделись кодом семьи</p></div>`
      : children.map(c=>`<div class="child-row" onclick="openChildSheet(${c.id})" style="cursor:pointer;">
          <div class="child-ava">${c.avatar}</div>
          <div class="child-info"><div class="child-name">${esc(c.name)}</div>
          <div class="child-sub">${c.tasks_today>0?c.tasks_today+' выполнено сегодня':'ничего сегодня'}</div></div>
          <div class="child-bal">${c.coins_balance} 🪙</div>
        </div>`).join('')}
  </div>`;
}

// ── CHILD SHEET ───────────────────────────────────────────
async function openChildSheet(childId) {
  const child = parentData.children.find(c=>c.id===childId);
  if (!child) return;
  document.getElementById('p-child-inner').innerHTML = `
    <div class="sheet-handle"></div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
      <div style="font-size:2.5rem;">${child.avatar}</div>
      <div><div style="font-size:1.2rem;font-weight:900;">${esc(child.name)}</div>
      <div style="color:var(--gold);font-weight:700;">${child.coins_balance} 🪙</div></div>
    </div>

    <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:var(--radius);padding:12px;margin-bottom:12px;">
      <div style="font-size:0.7rem;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Личный код входа</div>
      ${child.child_code
        ? `<div style="font-size:1.4rem;font-weight:900;color:var(--purple);letter-spacing:4px;">${child.child_code}</div>
           <div style="font-size:0.72rem;color:var(--muted);margin-top:4px;">Ребёнок вводит этот код чтобы войти снова</div>`
        : `<div style="color:var(--muted);font-size:0.82rem;">Код ещё не создан</div>`}
      <button class="btn btn-outline" style="margin-top:10px;padding:8px;" onclick="resetChildCode(${childId})">
        🔄 ${child.child_code ? 'Обновить код' : 'Создать код'}
      </button>
    </div>

    <button class="btn btn-gold" style="margin-bottom:8px;" onclick="closeAllSheets();setTimeout(()=>openCreateTask(${childId}),150)">
      ➕ Дать личное задание
    </button>
    <button class="btn btn-outline-red" onclick="confirmDeleteChild(${childId},'${esc(child.name)}')">
      🗑️ Удалить ребёнка
    </button>
  `;
  openSheet('p-child-sheet');
}

async function resetChildCode(childId) {
  const r = await apiRequest('POST', `children/${childId}/reset-code`);
  if (r.ok) {
    toast('Код: ' + r.data.child_code);
    await loadParentData();
    openChildSheet(childId);
  } else toast(r.error||'Ошибка создания кода', 'error');
}

async function confirmDeleteChild(id, name) {
  if (!confirm(`Удалить ${name}? Все задания и монеты будут удалены.`)) return;
  const r = await apiRequest('DELETE', `children/${id}`);
  if (r.ok) { closeAllSheets(); toast('Ребёнок удалён'); await renderParent('home'); }
  else toast(r.error||'Ошибка', 'error');
}

// ── TASKS ─────────────────────────────────────────────────
function renderParentTasks() {
  const {tasks} = parentData;
  return `<div class="page" style="padding-bottom:80px;">
    <div class="topbar"><span class="topbar-title">Задания</span>
      <button class="btn btn-gold" style="width:auto;padding:6px 14px;font-size:0.8rem;" onclick="openCreateTask()">＋ Добавить</button>
    </div>
    ${tasks.length===0
      ? `<div class="empty-state"><div class="icon">📋</div><h3>Нет заданий</h3></div>`
      : tasks.map(t=>`<div class="task-item" onclick="openTaskSheet(${t.id})" style="cursor:pointer;">
          <div class="task-icon ${t.is_daily?'daily':'common'}">${t.emoji}</div>
          <div class="task-info">
            <div class="task-name">${esc(t.title)}</div>
            <div class="task-badges">
              ${t.is_daily?'<span class="badge badge-blue">Ежедневное</span>':''}
              ${t.type==='common'?'<span class="badge badge-green">Общее</span>':`<span class="badge badge-gold">${esc(t.target_child_name||'Личное')}</span>`}
              ${t.one_time_claim?'<span class="badge badge-gold">1 раз</span>':''}
              ${t.description?'<span class="badge badge-purple">📝 Описание</span>':''}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
            <span class="task-coins">+${t.coins_reward} 🪙</span>
            <span style="font-size:1rem;cursor:pointer;opacity:0.5;" onclick="event.stopPropagation();deleteTask(${t.id})">🗑️</span>
          </div>
        </div>`).join('')}
  </div>`;
}

function openTaskSheet(taskId) {
  const t = parentData.tasks.find(x=>x.id===taskId);
  if (!t) return;
  let el = document.getElementById('p-task-view-sheet');
  if (!el) {
    el = document.createElement('div');
    el.id = 'p-task-view-sheet';
    el.className = 'bottom-sheet';
    document.getElementById('p-sheets').appendChild(el);
  }
  el.innerHTML = `
    <div class="sheet-handle"></div>
    <div style="font-size:2rem;margin-bottom:8px;">${t.emoji}</div>
    <div style="font-size:1.1rem;font-weight:900;margin-bottom:8px;">${esc(t.title)}</div>
    ${t.description?`<div style="color:var(--muted);font-size:0.85rem;margin-bottom:12px;line-height:1.5;">${esc(t.description)}</div>`:''}
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;">
      ${t.is_daily?'<span class="badge badge-blue">Ежедневное</span>':''}
      ${t.type==='common'?'<span class="badge badge-green">Общее</span>':`<span class="badge badge-gold">${esc(t.target_child_name||'Личное')}</span>`}
      ${t.one_time_claim?'<span class="badge badge-gold">1 раз</span>':''}
      <span class="badge badge-gold">+${t.coins_reward} 🪙</span>
    </div>
    <button class="btn btn-outline-red" onclick="deleteTask(${t.id});closeAllSheets()">🗑️ Удалить задание</button>
  `;
  openSheet('p-task-view-sheet');
}

// ── REVIEW ────────────────────────────────────────────────
function renderParentReview() {
  const {pending,exchanges} = parentData;
  const total = pending.length + exchanges.length;
  return `<div class="page" style="padding-bottom:80px;">
    <div class="topbar"><span class="topbar-title">На проверке</span>
      ${total>0?`<span style="background:var(--red);color:#fff;border-radius:99px;padding:2px 8px;font-size:0.7rem;font-weight:900;">${total}</span>`:''}
    </div>
    ${total===0?`<div class="empty-state"><div class="icon">✅</div><h3>Всё проверено!</h3></div>`:''}
    ${pending.map(claimCardHTML).join('')}
    ${exchanges.map(exchangeCardHTML).join('')}
  </div>`;
}

function claimCardHTML(cl) {
  return `<div class="claim-card">
    <div class="claim-top">
      <div><div class="claim-name">${cl.emoji} ${esc(cl.title)}</div>
      <div class="claim-who">${cl.child_avatar} ${esc(cl.child_name)}</div></div>
      <div style="color:var(--gold);font-weight:800;">+${cl.coins_reward} 🪙</div>
    </div>
    <div class="claim-actions">
      <button class="btn btn-ghost-green" onclick="approveClaim(${cl.id})">✓ Принять</button>
      <button class="btn btn-ghost-red"   onclick="openRejectSheet(${cl.id})">✕ Отклонить</button>
    </div>
  </div>`;
}

function exchangeCardHTML(ex) {
  return `<div class="claim-card">
    <div class="claim-top">
      <div><div class="claim-name">💱 Запрос обмена</div>
      <div class="claim-who">${esc(ex.child_name||'')} · ${ex.coins_amount} 🪙 → ${ex.rub_amount} ₽</div></div>
      <span class="badge badge-gold">${ex.rub_amount} ₽</span>
    </div>
    <div class="claim-actions">
      <button class="btn btn-ghost-green" onclick="approveExchange(${ex.id})">✓ Выдать</button>
      <button class="btn btn-ghost-red"   onclick="rejectExchange(${ex.id})">✕ Отклонить</button>
    </div>
  </div>`;
}

// ── SETTINGS ──────────────────────────────────────────────
function renderParentSettings() {
  const {family} = parentData;
  return `<div class="page" style="padding-bottom:80px;padding:0 16px 80px;">
    <div class="topbar" style="padding-left:0;padding-right:0;"><span class="topbar-title">Настройки</span></div>
    <div class="card">
      <div class="card-title">👨‍👩‍👧 Код семьи</div>
      <div class="invite-code-box">
        <div>
          <div style="font-size:0.65rem;color:var(--gold);font-weight:700;letter-spacing:1px;margin-bottom:4px;">КОД СЕМЬИ</div>
          <div class="invite-code">${family?.invite_code||'...'}</div>
        </div>
        <span style="font-size:1.3rem;cursor:pointer;" onclick="copyCode()">📋</span>
      </div>
    </div>
    <div class="card">
      <div class="card-title">💱 Курс обмена</div>
      <div class="input-group">
        <div class="input-label">₽ за каждые 100 монет</div>
        <input class="input" id="set-rate" type="number" value="${family?.coin_rate||50}" min="1">
      </div>
      <div class="input-group">
        <div class="input-label">Лимит монет в месяц на ребёнка</div>
        <input class="input" id="set-limit" type="number" value="${family?.monthly_limit||500}" min="1">
      </div>
      <div id="settings-error" style="color:var(--red);font-size:0.8rem;min-height:16px;margin-bottom:8px;"></div>
      <button class="btn btn-gold" onclick="saveSettings()">Сохранить</button>
    </div>
    <button class="btn btn-outline-red mt-12" onclick="doLogout()">Выйти из аккаунта</button>
  </div>`;
}

// ── CREATE TASK ───────────────────────────────────────────
let selType='common', selChildId=null;

function openCreateTask(preselectedChildId=null) {
  selType='common'; selChildId=preselectedChildId||null;
  document.getElementById('p-create-task-inner').innerHTML = createTaskSheetHTML(preselectedChildId);
  if (preselectedChildId) { selType='individual'; setTimeout(()=>setTaskType('individual'),0); }
  openSheet('p-create-task-sheet');
}

function createTaskSheetHTML(preChildId=null) {
  const children = parentData.children;
  return `
    <div class="sheet-handle"></div>
    <div class="sheet-title">Новое задание</div>
    <div class="input-group">
      <div class="input-label">Название</div>
      <input class="input" id="t-title" placeholder="Помыть посуду...">
    </div>
    <div class="input-group">
      <div class="input-label">Описание (как выполнить, необязательно)</div>
      <textarea class="input" id="t-desc" rows="2" placeholder="Вымыть все тарелки и кастрюли..." style="resize:none;"></textarea>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:12px;">
      <div style="flex:0 0 80px;"><div class="input-label">Иконка</div>
        <input class="input" id="t-emoji" value="📋" style="text-align:center;font-size:1.2rem;"></div>
      <div style="flex:1;"><div class="input-label">Монет 🪙</div>
        <input class="input" id="t-coins" type="number" value="20" min="1" max="9999"></div>
    </div>
    <div class="input-label" style="margin-bottom:6px;">Тип задания</div>
    <div class="type-toggle" style="margin-bottom:12px;">
      <div class="type-btn active-common" id="type-btn-common" onclick="setTaskType('common')">🌐 Общее<br><small>Для всех</small></div>
      <div class="type-btn" id="type-btn-individual" onclick="setTaskType('individual')">👤 Личное<br><small>Для одного</small></div>
    </div>
    <div id="child-selector" style="display:${preChildId?'block':'none'};margin-bottom:12px;">
      <div class="input-label" style="margin-bottom:6px;">Для кого</div>
      <div class="child-chips">${children.map(c=>`<div class="child-chip${preChildId===c.id?' selected':''}" data-id="${c.id}" onclick="selectChild(${c.id},this)">${c.avatar} ${esc(c.name)}</div>`).join('')}</div>
    </div>
    <div class="toggle-row">
      <div class="toggle-info"><h4>📅 Ежедневное</h4><p>Сбрасывается каждый день</p></div>
      <label class="toggle"><input type="checkbox" id="t-daily"><span class="toggle-slider"></span></label>
    </div>
    <div class="toggle-row" style="margin-bottom:12px;">
      <div class="toggle-info"><h4>🔒 Только 1 раз</h4><p>После взятия другим — недоступно</p></div>
      <label class="toggle"><input type="checkbox" id="t-onetime"><span class="toggle-slider"></span></label>
    </div>
    <div id="task-form-error" style="color:var(--red);font-size:0.8rem;min-height:16px;margin-bottom:8px;"></div>
    <button class="btn btn-gold" onclick="submitCreateTask()">Создать задание ✓</button>
    <button class="btn btn-outline" style="margin-top:8px;" onclick="closeAllSheets()">Отмена</button>
  `;
}

function setTaskType(type) {
  selType=type; selChildId=null;
  document.getElementById('type-btn-common').className    ='type-btn'+(type==='common'?     ' active-common':'');
  document.getElementById('type-btn-individual').className='type-btn'+(type==='individual'?' active-individual':'');
  document.getElementById('child-selector').style.display = type==='individual'?'block':'none';
  document.querySelectorAll('.child-chip').forEach(c=>c.classList.remove('selected'));
}
function selectChild(id,el) {
  selChildId=id;
  document.querySelectorAll('.child-chip').forEach(c=>c.classList.remove('selected'));
  el.classList.add('selected');
}

async function submitCreateTask() {
  const title=document.getElementById('t-title').value.trim();
  const desc =document.getElementById('t-desc').value.trim();
  const emoji=document.getElementById('t-emoji').value.trim()||'📋';
  const coins=parseInt(document.getElementById('t-coins').value)||10;
  const daily=document.getElementById('t-daily').checked;
  const one  =document.getElementById('t-onetime').checked;
  const errEl=document.getElementById('task-form-error');
  if (!title) { errEl.textContent='Введи название'; return; }
  if (selType==='individual'&&!selChildId) { errEl.textContent='Выбери ребёнка'; return; }

  const r = await api.createTask({
    title, description:desc||null, emoji, coins_reward:coins,
    type:selType, target_child_id:selType==='individual'?selChildId:null,
    is_daily:daily, one_time_claim:one
  });
  if (r.ok || r.status===201) {
    closeAllSheets(); toast('Задание создано! 📋');
    await renderParent('tasks');
  } else {
    errEl.textContent = r.error||'Ошибка';
  }
}

async function deleteTask(id) {
  if (!confirm('Удалить задание?')) return;
  await api.deleteTask(id);
  toast('Задание удалено');
  await renderParent('tasks');
}

// ── CLAIMS ────────────────────────────────────────────────
async function approveClaim(id) {
  const r = await api.approveClaim(id);
  if (r.ok) { toast('✅ Принято! Монеты начислены'); await renderParent(parentTab); }
  else toast(r.error,'error');
}
let rejectClaimId=null;
function openRejectSheet(id) {
  rejectClaimId=id;
  const el=document.getElementById('reject-reason');
  if (el) el.value='';
  openSheet('p-reject-sheet');
}
async function submitReject() {
  const reason=document.getElementById('reject-reason').value.trim();
  const r=await api.rejectClaim(rejectClaimId,reason||null);
  if (r.ok) { closeAllSheets(); toast('Задание отклонено'); await renderParent(parentTab); }
  else toast(r.error,'error');
}
async function approveExchange(id) {
  const r=await api.approveExchange(id);
  if (r.ok) { toast('💰 Обмен подтверждён!'); await renderParent(parentTab); }
  else toast(r.error,'error');
}
async function rejectExchange(id) {
  const r=await api.rejectExchange(id);
  if (r.ok) { toast('Обмен отклонён'); await renderParent(parentTab); }
  else toast(r.error,'error');
}

// ── HELPERS ───────────────────────────────────────────────
async function saveSettings() {
  const rate =parseFloat(document.getElementById('set-rate').value);
  const limit=parseInt(document.getElementById('set-limit').value);
  const errEl=document.getElementById('settings-error');
  if (!rate||rate<1) { errEl.textContent='Введи корректный курс'; return; }
  const r=await api.updateFamily({coin_rate:rate,monthly_limit:limit});
  if (r.ok) { toast('Настройки сохранены ✓'); errEl.textContent=''; await loadParentData(); }
  else { errEl.textContent=r.error||'Ошибка'; toast(r.error||'Ошибка','error'); }
}
function copyCode() {
  const code=parentData.family?.invite_code||'';
  if (!code) return;
  navigator.clipboard?.writeText(code).then(()=>toast('Код скопирован: '+code)).catch(()=>toast(code));
}
async function doLogout() {
  if (!confirm('Выйти?')) return;
  if (parentRefreshTimer) clearInterval(parentRefreshTimer);
  await api.logout();
  Store.clear();
  renderSplash();
  showScreen('splash');
}
function openSheet(id) {
  // Закрываем другие шторки перед открытием новой
  ['p-create-task-sheet','p-reject-sheet','p-child-sheet','p-task-view-sheet'].forEach(s => {
    if (s !== id) document.getElementById(s)?.classList.remove('open');
  });
  document.getElementById('p-overlay')?.classList.add('open');
  document.getElementById(id)?.classList.add('open');
}
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
