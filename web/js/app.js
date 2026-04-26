// js/app.js — Entry point

document.addEventListener('DOMContentLoaded', async () => {

  // Проверяем есть ли активная сессия на сервере
  const check = await api.me();

  if (check.ok && check.data) {
    const role = check.data.role;
    // Синхронизируем localStorage с данными сессии
    Store.set('mc_role', role);
    Store.set('mc_name', check.data.name || '');

    if (role === 'parent') {
      renderParent();
    } else if (role === 'child') {
      renderChild();
    } else {
      renderSplash();
      showScreen('splash');
    }
  } else {
    // Нет сессии — показываем сплеш
    Store.clear();
    renderSplash();
    showScreen('splash');
  }

  // Предотвращаем pull-to-refresh на мобиле
  document.body.addEventListener('touchmove', e => {
    if (e.target === document.body) e.preventDefault();
  }, { passive: false });
});

// Кнопка назад на Android
document.addEventListener('backbutton', () => {
  const overlay = document.getElementById('p-overlay');
  if (overlay && overlay.classList.contains('open')) {
    closeAllSheets();
    return;
  }
  const role = Store.role();
  if (role === 'parent' && typeof parentTab !== 'undefined' && parentTab !== 'home') {
    switchParentTab('home');
  } else if (role === 'child' && typeof childTab !== 'undefined' && childTab !== 'home') {
    switchChildTab('home');
  }
}, false);

window.MamaCoinApp = {
  onFcmToken(token) { console.log('FCM token received'); },
  reloadData() {
    const role = Store.role();
    if (role === 'parent') renderParent(parentTab);
    else if (role === 'child') renderChild(childTab);
  }
};

function closeAllSheets() {
  ['p-overlay','p-create-task-sheet','p-reject-sheet'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  });
}
