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

  // Предотвращаем pull-to-refresh
  document.body.addEventListener('touchmove', e => {
    if (e.target === document.body) e.preventDefault();
  }, { passive: false });
});

// Убираем шторки родителя при смене экрана
const _origShowScreen = showScreen;
function showScreen(id) {
  // Удаляем шторки родителя если уходим с parent экрана
  if (id !== 'parent') {
    const sheets = document.getElementById('p-sheets');
    if (sheets) sheets.remove();
  }
  _origShowScreen(id);
}

// Кнопка назад на Android
document.addEventListener('backbutton', () => {
  // Сначала закрываем открытую шторку
  const overlay = document.getElementById('p-overlay');
  if (overlay && overlay.classList.contains('open')) {
    closeAllSheets();
    return;
  }
  const role = Store.role();
  if (role === 'parent' && parentTab !== 'home') {
    switchParentTab('home');
  } else if (role === 'child' && childTab !== 'home') {
    switchChildTab('home');
  }
}, false);

window.MamaCoinApp = {
  onFcmToken(token) { console.log('FCM:', token); },
  reloadData() {
    const role = Store.role();
    if (role === 'parent') renderParent(parentTab);
    else if (role === 'child') renderChild(childTab);
  }
};

function closeAllSheets() {
  const overlay     = document.getElementById('p-overlay');
  const createSheet = document.getElementById('p-create-task-sheet');
  const rejectSheet = document.getElementById('p-reject-sheet');
  if (overlay)     overlay.classList.remove('open');
  if (createSheet) createSheet.classList.remove('open');
  if (rejectSheet) rejectSheet.classList.remove('open');
}
