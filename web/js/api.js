// js/api.js — API client + token storage

const API_BASE = window.MAMACOIN_API || 'https://mama-coin.ct.ws/api/';

// ── Token storage ────────────────────────────────────────
const Store = {
  get: (k)    => localStorage.getItem(k),
  set: (k, v) => localStorage.setItem(k, v),
  del: (k)    => localStorage.removeItem(k),
  clear: ()   => { ['mc_token','mc_role','mc_name','mc_family'].forEach(k => localStorage.removeItem(k)); },

  token:  () => Store.get('mc_token'),
  role:   () => Store.get('mc_role'),
  name:   () => Store.get('mc_name'),
  family: () => { try { return JSON.parse(Store.get('mc_family') || 'null'); } catch { return null; } },

  save(token, role, name, family = null) {
    Store.set('mc_token', token);
    Store.set('mc_role',  role);
    Store.set('mc_name',  name);
    if (family) Store.set('mc_family', JSON.stringify(family));
  }
};

// ── HTTP client ──────────────────────────────────────────
async function apiRequest(method, endpoint, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = Store.token();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(API_BASE + endpoint, opts);
    const data = await res.json();

    // Если сервер вернул 401 — токен устарел или невалидный, нужно перелогиниться
    if (res.status === 401) {
      Store.clear();
      showScreen('splash');
      renderSplash();
      toast('Сессия истекла, войди снова', 'error');
      return { ok: false, error: 'Unauthorized', status: 401 };
    }

    return { ok: data.ok, data: data.data, error: data.error, status: res.status };
  } catch (e) {
    return { ok: false, error: 'Нет подключения к серверу', status: 0 };
  }
}

const api = {
  // Auth
  register:   (b) => apiRequest('POST', 'register',   b),
  login:      (b) => apiRequest('POST', 'login',      b),
  childJoin:  (b) => apiRequest('POST', 'child-join', b),

  // Family
  getFamily:    () => apiRequest('GET',  'family'),
  updateFamily: (b) => apiRequest('PUT',  'family', b),
  getChildren:  () => apiRequest('GET',  'children'),

  // Tasks
  getTasks:    () => apiRequest('GET',    'tasks'),
  createTask:  (b) => apiRequest('POST',  'tasks', b),
  updateTask:  (id, b) => apiRequest('PUT',  `tasks/${id}`, b),
  deleteTask:  (id)    => apiRequest('DELETE', `tasks/${id}`),

  // Claims
  claimTask:    (taskId)     => apiRequest('POST', 'claims', { task_id: taskId }),
  submitClaim:  (id)         => apiRequest('PUT',  `claims/${id}`, { action: 'submit' }),
  approveClaim: (id)         => apiRequest('PUT',  `claims/${id}`, { action: 'approve' }),
  rejectClaim:  (id, reason) => apiRequest('PUT',  `claims/${id}`, { action: 'reject', reason }),
  getPending:   ()           => apiRequest('GET',  'claims?status=pending'),

  // Leaderboard
  getLeaderboard: () => apiRequest('GET', 'leaderboard'),

  // Wallet / Exchange
  getWallet:       () => apiRequest('GET',  'wallet'),
  requestExchange: (coins) => apiRequest('POST', 'exchange', { coins_amount: coins }),
  approveExchange: (id)    => apiRequest('PUT',  `exchange/${id}`, { action: 'approve' }),
  rejectExchange:  (id)    => apiRequest('PUT',  `exchange/${id}`, { action: 'reject' }),
  getPendingExchanges: ()  => apiRequest('GET',  'exchange?status=pending'),
};

// ── Re-login prompt on 401 ───────────────────────────────
function showReloginPrompt() {
  // Убираем шторки родителя если есть
  const sheets = document.getElementById('p-sheets');
  if (sheets) sheets.remove();

  const el = document.getElementById('screen-parent') || document.getElementById('screen-child');
  const target = el || document.body;

  // Показываем поверх всего
  let prompt = document.getElementById('relogin-prompt');
  if (!prompt) {
    prompt = document.createElement('div');
    prompt.id = 'relogin-prompt';
    document.body.appendChild(prompt);
  }
  prompt.style.cssText = 'position:fixed;inset:0;background:var(--bg);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;';
  prompt.innerHTML = `
    <div style="font-size:2rem;margin-bottom:16px;">🔐</div>
    <h2 style="margin-bottom:8px;text-align:center;">Сессия истекла</h2>
    <p style="color:var(--muted);text-align:center;margin-bottom:24px;font-size:0.9rem;">
      Войди снова чтобы продолжить
    </p>
    <button class="btn btn-gold" style="max-width:300px;"
      onclick="document.getElementById('relogin-prompt').remove();renderSplash();showScreen('splash');">
      Войти снова
    </button>
  `;
}

// ── Toast ────────────────────────────────────────────────
let toastTimer;
function toast(msg, type = 'success') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ''; }, 2800);
}

// ── Screen router ─────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(`screen-${id}`);
  if (el) el.classList.add('active');
}

// ── Bottom sheet helpers ─────────────────────────────────
function openSheet(sheetId) {
  document.getElementById('overlay').classList.add('open');
  document.getElementById(sheetId).classList.add('open');
}
function closeSheet(sheetId) {
  document.getElementById('overlay').classList.remove('open');
  document.getElementById(sheetId).classList.remove('open');
}

// ── Android WebView bridge ───────────────────────────────
const Android = window.MamaCoinAndroid || {
  getFcmToken: () => null,
  requestNotificationPermission: () => {},
  vibrate: () => {},
};
