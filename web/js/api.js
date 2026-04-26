// js/api.js — API client + session storage

const API_BASE = window.MAMACOIN_API || 'https://mama-coin.ct.ws/api/';

// ── Storage — только для role/name (не для токена) ────────
// Токен/сессия теперь хранится в httpOnly cookie на стороне PHP
const Store = {
  get: (k)    => localStorage.getItem(k),
  set: (k, v) => localStorage.setItem(k, v),

  clear() {
    ['mc_role','mc_name','mc_family'].forEach(k => localStorage.removeItem(k));
  },

  role:   () => Store.get('mc_role'),
  name:   () => Store.get('mc_name'),
  family: () => { try { return JSON.parse(Store.get('mc_family') || 'null'); } catch { return null; } },

  // Токен больше не нужен клиенту — PHP сессия в cookie
  token:  () => Store.get('mc_token'), // оставляем для fallback

  save(token, role, name, family = null) {
    // Токен сохраняем только для fallback (Bearer header)
    Store.set('mc_token', token);
    Store.set('mc_role',  role);
    Store.set('mc_name',  name);
    if (family) Store.set('mc_family', JSON.stringify(family));
  }
};

// ── HTTP client ───────────────────────────────────────────
async function apiRequest(method, endpoint, body = null) {
  const headers = { 'Content-Type': 'application/json' };

  // Fallback: если есть токен — шлём как Bearer (пока PHP сессия не установилась)
  const token = Store.token();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = {
    method,
    headers,
    credentials: 'include', // ← ГЛАВНОЕ: отправляем cookie с каждым запросом
  };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res  = await fetch(API_BASE + endpoint, opts);
    const data = await res.json();
    if (res.status === 401) {
      console.warn('[API 401]', method, endpoint);
    }
    return { ok: data.ok, data: data.data, error: data.error, status: res.status };
  } catch (e) {
    console.error('[API Error]', method, endpoint, e.message);
    return { ok: false, error: 'Нет подключения к серверу', status: 0 };
  }
}

const api = {
  // Auth
  register:   (b) => apiRequest('POST', 'register',   b),
  login:      (b) => apiRequest('POST', 'login',      b),
  childJoin:  (b) => apiRequest('POST', 'child-join', b),
  logout:     ()  => apiRequest('POST', 'logout'),
  me:         ()  => apiRequest('GET',  'me'),

  // Family
  getFamily:    ()  => apiRequest('GET', 'family'),
  updateFamily: (b) => apiRequest('PUT', 'family', b),
  getChildren:  ()  => apiRequest('GET', 'children'),

  // Tasks
  getTasks:   ()       => apiRequest('GET',    'tasks'),
  createTask: (b)      => apiRequest('POST',   'tasks', b),
  updateTask: (id, b)  => apiRequest('PUT',    `tasks/${id}`, b),
  deleteTask: (id)     => apiRequest('DELETE', `tasks/${id}`),

  // Claims
  claimTask:    (taskId)     => apiRequest('POST', 'claims', { task_id: taskId }),
  submitClaim:  (id)         => apiRequest('PUT',  `claims/${id}`, { action: 'submit' }),
  approveClaim: (id)         => apiRequest('PUT',  `claims/${id}`, { action: 'approve' }),
  rejectClaim:  (id, reason) => apiRequest('PUT',  `claims/${id}`, { action: 'reject', reason }),
  getPending:   ()           => apiRequest('GET',  'claims?status=pending'),

  // Leaderboard
  getLeaderboard: () => apiRequest('GET', 'leaderboard'),

  // Wallet / Exchange
  getWallet:           ()    => apiRequest('GET',  'wallet'),
  requestExchange:     (c)   => apiRequest('POST', 'exchange', { coins_amount: c }),
  approveExchange:     (id)  => apiRequest('PUT',  `exchange/${id}`, { action: 'approve' }),
  rejectExchange:      (id)  => apiRequest('PUT',  `exchange/${id}`, { action: 'reject' }),
  getPendingExchanges: ()    => apiRequest('GET',  'exchange?status=pending'),
};

// ── Toast ─────────────────────────────────────────────────
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

// ── Screen router ──────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(`screen-${id}`);
  if (el) el.classList.add('active');
}

// ── Android WebView bridge ────────────────────────────────
const Android = window.MamaCoinAndroid || {
  getFcmToken: () => null,
  vibrate: () => {},
};
