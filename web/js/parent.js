// js/parent.js — Все экраны родителя

let parentTab   = 'home';
let parentData  = { children: [], tasks: [], pending: [], family: null, exchanges: [] };

async function renderParent(tab = 'home') {
  showScreen('parent');
  parentTab = tab;
  await loadParentData();
  drawParent();
}

async function loadParentData() {
  const [ch, tk, pd, fm, ex] = await Promise.all([
    api.getChildren(), api.getTasks(), api.getPending(),
    api.getFamily(),   api.getPendingExchanges()
  ]);

  // Debug: показать ошибки
  [['children',ch],['tasks',tk],['pending',pd],['family',fm],['exchanges',ex]].forEach(([name,r]) => {
    if (!r.ok) console.error('[loadParentData]', name, 'status:', r.status, 'error:', r.error);
  });

  parentData.children  = ch.data  || [];
  parentData.tasks     = tk.data  || [];
  parentData.pending   = pd.data  || [];
  parentData.family    = fm.data  || null;
  parentData.exchanges = ex.data  || [];

  // Если все запросы вернули 401 — значит токен невалиден
  const allUnauthorized = [ch,tk,pd,fm,ex].every(r => r.status === 401);
  if (allUnauthorized) {
    Store.clear();
    showReloginPrompt();
  }
}

function drawParent() {
  const el = document.getElementById('screen-parent');
  el.innerHTML = `
    <div id="p-tab-home"     class="p-tab ${parentTab==='home'    ?'':'hidden'}">${renderParentHome()}</div>
    <div id="p-tab-tasks"    class="p-tab ${parentTab==='tasks'   ?'':'hidden'}">${renderParentTasks()}</div>
    <div id="p-tab-review"   class="p-tab ${parentTab==='review'  ?'':'hidden'}">${renderParentReview()}</div>
    <div id="p-tab-settings" class="p-tab ${parentTab==='settings'?'':'hidden'}">${renderParentSettings()}</div>
    ${parentBottomNav()}
  `;

  // Шторки рендерим в body чтобы position:fixed работало правильно
  // (внутри overflow:auto контейнера fixed позиционирование ломается)
  let sheetsEl = document.getElementById('p-sheets');
  if (!sheetsEl) {
    sheetsEl = document.createElement('div');
    sheetsEl.id = 'p-sheets';
    document.body.appendChild(sheetsEl);
  }
  sheetsEl.innerHTML = `
    <div id="p-overlay" class="overlay" onclick="closeAllSheets()"></div>
    <div id="p-reject-sheet" class="bottom-sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-title">Причина отклонения</div>
      <div class="input-group">
        <textarea class="input" id="reject-reason" rows="3"
          placeholder="Опционально: опиши что не так..." style="resize:none;"></textarea>
      </div>
      <button class="btn btn-outline-red mt-8" onclick="submitReject()">Отклонить</button>
    </div>
    <div id="p-create-task-sheet" class="bottom-sheet">
      <div id="p-create-task-inner"></div>
    </div>
  `;
}

function switchParentTab(tab) {
  document.querySelectorAll('.p-tab').forEach(t => t.classList.add('hidden'));
  document.getElementById(`p-tab-${tab}`).classList.remove('hidden');
  document.querySelectorAll('#screen-parent .nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`p-nav-${tab}`).classList.add('active');
  parentTab = tab;
}

function parentBottomNav() {
  const tabs = [
    ['home','🏠','Главная'], ['tasks','📋','Задания'],
    ['review','🔍','Проверка'], ['settings','⚙️','Настройки']
  ];
  const badge = parentData.pending.length > 0
    ? `<span style="position:absolute;top:-2px;right:6px;background:var(--red);color:#fff;border-radius:99px;font-size:0.55rem;font-weight:900;padding:1px 5px;">${parentData.pending.length}</span>`
    : '';
  return `<nav class="bottom-nav">
    ${tabs.map(([t,ic,lb]) => `
      <div class="nav-item ${parentTab===t?'active':''}" id="p-nav-${t}" onclick="switchParentTab('${t}')">
        <div class="nav-icon" style="position:relative;">${ic}${t==='review'?badge:''}</div>
        <span>${lb}</span>
      </div>`).join('')}
  </nav>`;
}

// ── HOME ──────────────────────────────────────────────────
function renderParentHome() {
  const { children, tasks, pending } = parentData;
  return `
    <div class="page" style="padding-bottom:80px;">
      <div class="topbar">
        <span class="topbar-title">МамаКоин</span>
        <div style="display:flex;gap:8px;">
          <div style="width:36px;height:36px;border-radius:50%;background:var(--card);border:1.5px solid var(--border);
            display:flex;align-items:center;justify-content:center;cursor:pointer;" onclick="switchParentTab('review')">🔔</div>
        </div>
      </div>

      <div class="stat-row">
        <div class="stat-box"><div class="stat-val" style="color:var(--gold);">${children.length}</div><div class="stat-lbl">Детей</div></div>
        <div class="stat-box"><div class="stat-val" style="color:var(--blue);">${tasks.length}</div><div class="stat-lbl">Заданий</div></div>
        <div class="stat-box"><div class="stat-val" style="color:var(--red);">${pending.length}</div><div class="stat-lbl">На проверке</div></div>
      </div>

      ${pending.length > 0 ? `
        <div class="section-header"><h3>На проверке 🔍</h3><a onclick="switchParentTab('review')">Все →</a></div>
        ${pending.slice(0,2).map(claimCardHTML).join('')}
      ` : ''}

      <div class="section-header"><h3>Дети 👨‍👩‍👧</h3></div>
      ${children.length === 0
        ? `<div class="empty-state"><div class="icon">👶</div><h3>Нет детей</h3><p>Поделись кодом семьи с ребёнком</p></div>`
        : children.map(childRowHTML).join('')}
    </div>`;
}

function childRowHTML(c) {
  return `
    <div class="child-row">
      <div class="child-ava">${c.avatar}</div>
      <div class="child-info">
        <div class="child-name">${esc(c.name)}</div>
        <div class="child-sub">${c.tasks_today > 0 ? c.tasks_today+' задания выполнено' : 'ничего сегодня'}</div>
      </div>
      <div class="child-bal">${c.coins_balance} 🪙</div>
    </div>`;
}

function claimCardHTML(cl) {
  return `
    <div class="claim-card">
      <div class="claim-top">
        <div>
          <div class="claim-name">${cl.emoji} ${esc(cl.title)}</div>
          <div class="claim-who">${cl.child_avatar} ${esc(cl.child_name)}</div>
        </div>
        <div style="color:var(--gold);font-weight:800;">+${cl.coins_reward} 🪙</div>
      </div>
      <div class="claim-actions">
        <button class="btn btn-ghost-green" onclick="approveClaim(${cl.id})">✓ Принять</button>
        <button class="btn btn-ghost-red"   onclick="openRejectSheet(${cl.id})">✕ Отклонить</button>
      </div>
    </div>`;
}

// ── TASKS ─────────────────────────────────────────────────
function renderParentTasks() {
  const { tasks } = parentData;
  return `
    <div class="page" style="padding-bottom:80px;">
      <div class="topbar">
        <span class="topbar-title">Задания</span>
        <button class="btn btn-gold" style="width:auto;padding:6px 14px;font-size:0.8rem;"
          onclick="openCreateTask()">＋ Добавить</button>
      </div>
      ${tasks.length === 0
        ? `<div class="empty-state"><div class="icon">📋</div><h3>Нет заданий</h3><p>Создай первое задание для детей</p></div>`
        : tasks.map(taskRowParentHTML).join('')}
    </div>`;
}

function taskRowParentHTML(t) {
  return `
    <div class="task-item">
      <div class="task-icon ${t.is_daily?'daily':'common'}">${t.emoji}</div>
      <div class="task-info">
        <div class="task-name">${esc(t.title)}</div>
        <div class="task-badges">
          ${t.is_daily       ? '<span class="badge badge-blue">Ежедневное</span>' : ''}
          ${t.type==='common'? '<span class="badge badge-green">Общее</span>'
                             : `<span class="badge badge-gold">${esc(t.target_child_name||'Личное')}</span>`}
          ${t.one_time_claim ? '<span class="badge badge-gold">1 раз</span>' : ''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
        <span class="task-coins">+${t.coins_reward} 🪙</span>
        <span style="font-size:1rem;cursor:pointer;opacity:0.5;" onclick="deleteTask(${t.id})">🗑️</span>
      </div>
    </div>`;
}

// ── REVIEW ────────────────────────────────────────────────
function renderParentReview() {
  const { pending, exchanges } = parentData;
  const total = pending.length + exchanges.length;
  return `
    <div class="page" style="padding-bottom:80px;">
      <div class="topbar">
        <span class="topbar-title">На проверке</span>
        ${total > 0 ? `<span style="background:var(--red);color:#fff;border-radius:99px;padding:2px 8px;font-size:0.7rem;font-weight:900;">${total}</span>` : ''}
      </div>
      ${total === 0
        ? `<div class="empty-state"><div class="icon">✅</div><h3>Всё проверено!</h3><p>Нет ожидающих заданий</p></div>`
        : ''}
      ${pending.map(claimCardHTML).join('')}
      ${exchanges.map(exchangeCardHTML).join('')}
    </div>`;
}

function exchangeCardHTML(ex) {
  return `
    <div class="claim-card">
      <div class="claim-top">
        <div>
          <div class="claim-name">💱 Запрос обмена</div>
          <div class="claim-who">${esc(ex.child_name||'')} · ${ex.coins_amount} 🪙 → ${ex.rub_amount} ₽</div>
        </div>
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
  const { family } = parentData;
  const code = family?.invite_code || null;
  return `
    <div class="page" style="padding-bottom:80px;padding-left:16px;padding-right:16px;">
      <div class="topbar" style="padding-left:0;padding-right:0;">
        <span class="topbar-title">Настройки</span>
      </div>

      <div class="card">
        <div class="card-title">👨‍👩‍👧 Наша семья</div>
        <div class="input-label" style="margin-bottom:8px;">Код для входа детей</div>
        <div class="invite-code-box">
          <div>
            <div style="font-size:0.65rem;color:var(--gold);font-weight:700;letter-spacing:1px;margin-bottom:4px;">КОД СЕМЬИ</div>
            ${code
              ? `<div class="invite-code" id="family-code-display">${code}</div>`
              : `<div style="color:var(--muted);font-size:0.85rem;font-weight:600;">Загрузка...</div>`}
          </div>
          ${code ? `<span style="font-size:1.3rem;cursor:pointer;" onclick="copyCode()">📋</span>` : ''}
        </div>
      </div>

      <div class="card">
        <div class="card-title">💱 Курс обмена</div>
        <div class="input-group">
          <div class="input-label">₽ за каждые 100 монет</div>
          <input class="input" id="set-rate" type="number" value="${family?.coin_rate||50}" min="1">
        </div>
        <div class="input-group">
          <div class="input-label">Лимит монет к обмену в месяц (на ребёнка)</div>
          <input class="input" id="set-limit" type="number" value="${family?.monthly_limit||500}" min="1">
        </div>
        <div id="settings-error" style="color:var(--red);font-size:0.8rem;min-height:16px;margin-bottom:8px;"></div>
        <button class="btn btn-gold" onclick="saveSettings()">Сохранить</button>
      </div>

      <button class="btn btn-outline-red mt-12" onclick="doLogout()">Выйти из аккаунта</button>
      <div style="height:16px;"></div>
    </div>`;
}

// ── CREATE TASK SHEET ─────────────────────────────────────
let selectedTaskType = 'common';
let selectedChildId  = null;

function openCreateTask() {
  selectedTaskType = 'common';
  selectedChildId  = null;
  // Заполняем содержимое шторки
  document.getElementById('p-create-task-inner').innerHTML = createTaskSheetHTML();
  // Открываем оверлей и шторку
  document.getElementById('p-overlay').classList.add('open');
  document.getElementById('p-create-task-sheet').classList.add('open');
}

function createTaskSheetHTML() {
  const children = parentData.children;
  return `
    <div class="sheet-handle"></div>
    <div class="sheet-title">Новое задание</div>

    <div class="input-group">
      <div class="input-label">Название</div>
      <input class="input" id="t-title" placeholder="Помыть посуду...">
    </div>
    <div style="display:flex;gap:10px;margin-bottom:12px;">
      <div style="flex:0 0 80px;">
        <div class="input-label">Иконка</div>
        <input class="input" id="t-emoji" value="📋" style="text-align:center;font-size:1.2rem;">
      </div>
      <div style="flex:1;">
        <div class="input-label">Монет 🪙</div>
        <input class="input" id="t-coins" type="number" value="20" min="1" max="9999">
      </div>
    </div>

    <div class="input-label" style="margin-bottom:6px;">Тип задания</div>
    <div class="type-toggle" style="margin-bottom:12px;">
      <div class="type-btn active-common" id="type-btn-common" onclick="setTaskType('common')">
        🌐 Общее<br><small style="font-weight:600;opacity:0.8;">Для всех детей</small>
      </div>
      <div class="type-btn" id="type-btn-individual" onclick="setTaskType('individual')">
        👤 Личное<br><small style="font-weight:600;opacity:0.8;">Для одного ребёнка</small>
      </div>
    </div>

    <div id="child-selector" style="display:none;margin-bottom:12px;">
      <div class="input-label" style="margin-bottom:6px;">Для кого</div>
      <div class="child-chips">
        ${children.map(c => `
          <div class="child-chip" data-id="${c.id}" onclick="selectChild(${c.id},this)">
            ${c.avatar} ${esc(c.name)}
          </div>`).join('')}
      </div>
    </div>

    <div class="toggle-row">
      <div class="toggle-info">
        <h4>📅 Ежедневное</h4>
        <p>Обновляется каждый день</p>
      </div>
      <label class="toggle"><input type="checkbox" id="t-daily"><span class="toggle-slider"></span></label>
    </div>
    <div class="toggle-row" style="margin-bottom:12px;">
      <div class="toggle-info">
        <h4>🔒 Только 1 выполнение</h4>
        <p>После взятия другим — недоступно</p>
      </div>
      <label class="toggle"><input type="checkbox" id="t-onetime"><span class="toggle-slider"></span></label>
    </div>

    <div id="task-form-error" style="color:var(--red);font-size:0.8rem;min-height:16px;margin-bottom:8px;"></div>
    <button class="btn btn-gold" onclick="submitCreateTask()">Создать задание ✓</button>
    <button class="btn btn-outline" style="margin-top:8px;" onclick="closeAllSheets()">Отмена</button>
  `;
}

function setTaskType(type) {
  selectedTaskType = type;
  selectedChildId  = null;
  document.getElementById('type-btn-common').className     = 'type-btn' + (type==='common'?     ' active-common':'');
  document.getElementById('type-btn-individual').className = 'type-btn' + (type==='individual'? ' active-individual':'');
  document.getElementById('child-selector').style.display  = type==='individual' ? 'block' : 'none';
  document.querySelectorAll('.child-chip').forEach(c => c.classList.remove('selected'));
}

function selectChild(id, el) {
  selectedChildId = id;
  document.querySelectorAll('.child-chip').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

function closeAllSheets() {
  document.getElementById('p-overlay').classList.remove('open');
  document.getElementById('p-create-task-sheet').classList.remove('open');
  document.getElementById('p-reject-sheet').classList.remove('open');
}

async function submitCreateTask() {
  const title  = document.getElementById('t-title').value.trim();
  const emoji  = document.getElementById('t-emoji').value.trim() || '📋';
  const coins  = parseInt(document.getElementById('t-coins').value) || 10;
  const daily  = document.getElementById('t-daily').checked;
  const one    = document.getElementById('t-onetime').checked;
  const errEl  = document.getElementById('task-form-error');

  if (!title) { errEl.textContent = 'Введи название'; return; }
  if (selectedTaskType === 'individual' && !selectedChildId) { errEl.textContent = 'Выбери ребёнка'; return; }

  const r = await api.createTask({
    title, emoji, coins_reward: coins,
    type: selectedTaskType,
    target_child_id: selectedTaskType === 'individual' ? selectedChildId : null,
    is_daily: daily, one_time_claim: one, description: null
  });

  if (r.ok) {
    closeAllSheets();
    toast('Задание создано! 📋');
    await renderParent('tasks');
  } else {
    errEl.textContent = r.error || 'Ошибка';
  }
}

async function deleteTask(id) {
  if (!confirm('Удалить задание?')) return;
  await api.deleteTask(id);
  toast('Задание удалено');
  await renderParent('tasks');
}

// ── Claims ────────────────────────────────────────────────
async function approveClaim(id) {
  const r = await api.approveClaim(id);
  if (r.ok) { toast('✅ Задание принято! Монеты начислены'); await renderParent(parentTab); }
  else toast(r.error, 'error');
}

let rejectClaimId = null;
function openRejectSheet(id) {
  rejectClaimId = id;
  const el = document.getElementById('reject-reason');
  if (el) el.value = '';
  document.getElementById('p-overlay').classList.add('open');
  document.getElementById('p-reject-sheet').classList.add('open');
}

async function submitReject() {
  const reason = document.getElementById('reject-reason').value.trim();
  const r = await api.rejectClaim(rejectClaimId, reason || null);
  if (r.ok) { closeAllSheets(); toast('Задание отклонено'); await renderParent(parentTab); }
  else toast(r.error, 'error');
}

async function approveExchange(id) {
  const r = await api.approveExchange(id);
  if (r.ok) { toast('💰 Обмен подтверждён!'); await renderParent(parentTab); }
  else toast(r.error, 'error');
}

async function rejectExchange(id) {
  const r = await api.rejectExchange(id);
  if (r.ok) { toast('Обмен отклонён'); await renderParent(parentTab); }
  else toast(r.error, 'error');
}

// ── Settings ──────────────────────────────────────────────
async function saveSettings() {
  const rate  = parseFloat(document.getElementById('set-rate').value);
  const limit = parseInt(document.getElementById('set-limit').value);
  const errEl = document.getElementById('settings-error');
  if (!rate || rate < 1)   { errEl.textContent = 'Введи корректный курс'; return; }
  if (!limit || limit < 1) { errEl.textContent = 'Введи корректный лимит'; return; }
  const r = await api.updateFamily({ coin_rate: rate, monthly_limit: limit });
  if (r.ok) {
    toast('Настройки сохранены ✓');
    await loadParentData();
    // Обновляем поля без полного перерендера
    if (parentData.family) {
      document.getElementById('set-rate').value  = parentData.family.coin_rate;
      document.getElementById('set-limit').value = parentData.family.monthly_limit;
    }
    errEl.textContent = '';
  } else {
    errEl.textContent = r.error || 'Ошибка сохранения';
    toast(r.error || 'Ошибка', 'error');
  }
}

function copyCode() {
  const code = parentData.family?.invite_code || '';
  if (!code) return;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(() => toast('Код скопирован! ' + code));
  } else {
    toast(code);
  }
}

async function doLogout() {
  if (!confirm('Выйти из аккаунта?')) return;
  await api.logout();
  Store.clear();
  renderSplash();
  showScreen('splash');
}

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
