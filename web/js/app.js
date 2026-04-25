// js/app.js — Entry point

document.addEventListener('DOMContentLoaded', () => {
  // Глобальный оверлей для шитов
  if (!document.getElementById('overlay')) {
    const ov = document.createElement('div');
    ov.id = 'overlay';
    ov.className = 'overlay';
    ov.onclick = closeAllSheets;
    document.body.appendChild(ov);
  }

  // Маршрутизация при старте
  const token = Store.token();
  const role  = Store.role();

  if (token && role === 'parent') {
    renderParent();
  } else if (token && role === 'child') {
    renderChild();
  } else {
    renderSplash();
    showScreen('splash');
  }

  // Предотвращаем pull-to-refresh на мобиле
  document.body.addEventListener('touchmove', e => {
    if (e.target === document.body) e.preventDefault();
  }, { passive: false });
});

// Обработка кнопки "назад" на Android
document.addEventListener('backbutton', () => {
  const role = Store.role();
  if (role === 'parent' && parentTab !== 'home') {
    switchParentTab('home');
  } else if (role === 'child' && childTab !== 'home') {
    switchChildTab('home');
  } else if (!Store.token()) {
    // Already on splash, do nothing
  }
}, false);

// Экспорт для Android WebView
window.MamaCoinApp = {
  onFcmToken(token) {
    // Called from Android when FCM token is received
    console.log('FCM token:', token);
  },
  reloadData() {
    const role = Store.role();
    if (role === 'parent') renderParent(parentTab);
    else if (role === 'child') renderChild(childTab);
  }
};

// Обработка closeAllSheets для child экрана (у них нет overlay своего)
function closeAllSheets() {
  document.querySelectorAll('.bottom-sheet').forEach(s => s.classList.remove('open'));
  document.querySelectorAll('.overlay').forEach(o => o.classList.remove('open'));
  const pOverlay = document.getElementById('p-overlay');
  if (pOverlay) pOverlay.classList.remove('open');
}
