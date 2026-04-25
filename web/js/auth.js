// js/auth.js — Splash, Login, Register, Child Join

function renderSplash() {
  document.getElementById('screen-splash').innerHTML = `
    <div class="splash-bg">
      <div class="splash-coin">🪙</div>
      <div class="splash-title">МамаКоин</div>
      <p class="splash-sub">Задания → монеты → настоящие деньги</p>
      <div class="splash-btns">
        <button class="btn btn-gold" onclick="renderAuth('login')">Войти как родитель</button>
        <button class="btn btn-outline" onclick="renderAuth('register')">Зарегистрироваться</button>
        <button class="btn" style="background:none;color:var(--purple);font-weight:700;margin-top:4px;"
          onclick="renderAuth('child')">Я ребёнок — войти по коду 👶</button>
      </div>
    </div>`;
}

function renderAuth(mode) {
  showScreen('auth');
  const el = document.getElementById('screen-auth');

  if (mode === 'register') {
    el.innerHTML = `
      <div class="page">
        <div class="topbar">
          <span style="font-size:1.3rem;cursor:pointer;" onclick="showScreen('splash')">←</span>
          <span></span>
        </div>
        <div class="page-content">
          <h2 style="margin-bottom:4px;">Создать аккаунт</h2>
          <p class="text-muted text-sm mb-16" style="margin-bottom:20px;">Родитель</p>
          <div class="input-group">
            <div class="input-label">Ваше имя</div>
            <input class="input" id="reg-name" placeholder="Мария Иванова" type="text">
          </div>
          <div class="input-group">
            <div class="input-label">Email</div>
            <input class="input" id="reg-email" placeholder="mama@mail.ru" type="email">
          </div>
          <div class="input-group">
            <div class="input-label">Пароль</div>
            <input class="input" id="reg-pass" placeholder="Минимум 6 символов" type="password">
          </div>
          <div id="auth-error" class="text-red text-sm" style="margin-bottom:8px;min-height:18px;"></div>
          <button class="btn btn-gold" id="reg-btn" onclick="doRegister()">Создать семью 👨‍👩‍👧</button>
          <p class="text-center text-sm mt-12" style="color:var(--muted);">Уже есть аккаунт?
            <span style="color:var(--gold);cursor:pointer;" onclick="renderAuth('login')">Войти</span>
          </p>
        </div>
      </div>`;

  } else if (mode === 'login') {
    el.innerHTML = `
      <div class="page">
        <div class="topbar">
          <span style="font-size:1.3rem;cursor:pointer;" onclick="showScreen('splash')">←</span>
          <span></span>
        </div>
        <div class="page-content">
          <h2 style="margin-bottom:4px;">Вход</h2>
          <p class="text-muted text-sm" style="margin-bottom:20px;">Аккаунт родителя</p>
          <div class="input-group">
            <div class="input-label">Email</div>
            <input class="input" id="login-email" placeholder="mama@mail.ru" type="email">
          </div>
          <div class="input-group">
            <div class="input-label">Пароль</div>
            <input class="input" id="login-pass" placeholder="••••••••" type="password">
          </div>
          <div id="auth-error" class="text-red text-sm" style="margin-bottom:8px;min-height:18px;"></div>
          <button class="btn btn-gold" onclick="doLogin()">Войти</button>
          <p class="text-center text-sm mt-12" style="color:var(--muted);">Нет аккаунта?
            <span style="color:var(--gold);cursor:pointer;" onclick="renderAuth('register')">Зарегистрироваться</span>
          </p>
        </div>
      </div>`;

  } else if (mode === 'child') {
    el.innerHTML = `
      <div class="page">
        <div class="topbar">
          <span style="font-size:1.3rem;cursor:pointer;" onclick="showScreen('splash')">←</span>
          <span></span>
        </div>
        <div class="page-content">
          <h2 style="margin-bottom:4px;">Привет! 👋</h2>
          <p class="text-muted text-sm" style="margin-bottom:20px;">Введи код от мамы или папы</p>
          <div class="input-group">
            <div class="input-label">Твоё имя</div>
            <input class="input purple" id="child-name" placeholder="Саша" type="text">
          </div>
          <div class="input-group">
            <div class="input-label">Код семьи</div>
            <input class="input code-input" id="child-code" placeholder="MC47K2"
              maxlength="6" style="text-transform:uppercase;"
              oninput="this.value=this.value.toUpperCase()">
          </div>
          <div style="background:rgba(167,139,250,0.08);border:1.5px solid rgba(167,139,250,0.2);
            border-radius:var(--radius);padding:10px 12px;margin-bottom:16px;">
            <p class="text-sm" style="color:var(--muted);font-weight:600;">
              💡 Попроси родителя показать код в разделе «Настройки»
            </p>
          </div>
          <div id="auth-error" class="text-red text-sm" style="margin-bottom:8px;min-height:18px;"></div>
          <button class="btn btn-purple" onclick="doChildJoin()">Войти в семью 🚀</button>
        </div>
      </div>`;
  }
}

async function doRegister() {
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-pass').value;
  const errEl = document.getElementById('auth-error');
  const btn   = document.getElementById('reg-btn');

  if (!name || !email || !pass) { errEl.textContent = 'Заполни все поля'; return; }
  btn.disabled = true; btn.textContent = 'Создаём...';

  const r = await api.register({ name, email, password: pass });
  if (r.ok) {
    Store.save(r.data.token, 'parent', name, { invite_code: r.data.invite_code, family_id: r.data.family_id });
    toast('Семья создана! 🎉');
    renderParent();
  } else {
    errEl.textContent = r.error || 'Ошибка регистрации';
    btn.disabled = false; btn.textContent = 'Создать семью 👨‍👩‍👧';
  }
}

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  const errEl = document.getElementById('auth-error');

  if (!email || !pass) { errEl.textContent = 'Введи email и пароль'; return; }

  const r = await api.login({ email, password: pass });
  if (r.ok) {
    Store.save(r.data.token, 'parent', r.data.name, { invite_code: r.data.invite_code, family_id: r.data.family_id });
    toast('Добро пожаловать!');
    renderParent();
  } else {
    errEl.textContent = r.error || 'Неверный логин или пароль';
  }
}

async function doChildJoin() {
  const name = document.getElementById('child-name').value.trim();
  const code = document.getElementById('child-code').value.trim().toUpperCase();
  const errEl = document.getElementById('auth-error');

  if (!name || code.length < 4) { errEl.textContent = 'Введи имя и код семьи'; return; }

  const r = await api.childJoin({ name, invite_code: code });
  if (r.ok) {
    Store.save(r.data.token, 'child', r.data.child?.name || name);
    toast('Вошли в семью! 🚀');
    renderChild();
  } else {
    errEl.textContent = r.error || 'Неверный код или имя';
  }
}
