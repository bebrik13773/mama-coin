// js/app.js — Entry point

document.addEventListener('DOMContentLoaded', () => {
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

// Кнопка назад на Android
document.addEventListener('backbutton', () => {
  // Сначала закрываем открытую шторку
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
