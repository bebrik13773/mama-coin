# 📋 МамаКоин — План разработки (agent-plan.md)

> Этот файл — рабочий план для агента. Отмечай выполненное `[x]`.

---

## ✅ Фаза 0 — Репозиторий и структура
- [x] Создать публичный репо `bebrik13773/mama-coin`
- [x] Клонировать репо через HTTPS+токен
- [x] Создать структуру проекта: `web/`, `backend/`, `android/`, `.github/`
- [x] Написать `README.md`
- [ ] Добавить `LICENSE` (MIT)
- [x] Настроить GitHub Actions `build.yml` (автосборка APK при push в main)

---

## ✅ Фаза 1 — Веб-приложение (web/)

### CSS / UI
- [x] `css/app.css` — полная тёмная тема, все компоненты
- [ ] Добавить Google Fonts (Nunito) через `<link>` в index.html
- [ ] Сделать иконку приложения (192×192, 512×512 PNG) и положить в `web/icons/`
- [ ] Заполнить `manifest.json` финальными иконками

### JS — Auth
- [x] `js/api.js` — API-клиент, Store (localStorage), toast, роутер экранов
- [x] `js/auth.js` — Splash, Login, Register, ChildJoin
- [ ] Добавить валидацию email на фронте
- [ ] Добавить «показать/скрыть пароль» в полях

### JS — Родитель
- [x] `js/parent.js` — Home, Tasks, Review, Settings
- [x] Bottom sheet создания задания
- [x] Одобрение / отклонение заданий и обменов
- [ ] Кнопка «Обновить» (pull-to-refresh или кнопка)
- [ ] Фильтры на вкладке Задания (ежедневные / общие / личные)
- [ ] Форма редактирования задания (PUT /tasks/{id})
- [ ] Раздел «Дети» — добавление ребёнка через QR-код / кнопка показа кода
- [ ] История транзакций монет по каждому ребёнку

### JS — Ребёнок
- [x] `js/child.js` — Home, Tasks, Leaderboard, Wallet
- [x] Взять задание / сдать на проверку
- [x] Запрос обмена монет
- [x] Лидерборд с подиумом
- [ ] История транзакций в кошельке
- [ ] Анимация при начислении монет (конфетти / bounce)
- [ ] Экран уведомлений (список одобрений/отклонений)

---

## ⬜ Фаза 2 — Backend (backend/)

### Инфраструктура
- [x] `migrations/001_init.sql` — 7 таблиц (users, families, children, tasks, task_claims, coin_transactions, exchange_requests)
- [x] `config/config.example.php`
- [x] `api/index.php` — роутер
- [x] `api/Database.php`, `Auth.php`, `Response.php`, `Notify.php`

### Роуты
- [x] `routes/auth.php` — POST /register, POST /login, POST /child-join
- [x] `routes/tasks.php` — GET/POST/PUT/DELETE /tasks
- [x] `routes/claims.php` — POST/PUT/GET /claims
- [x] `routes/exchange.php` — POST/PUT /exchange
- [x] `routes/leaderboard.php` — GET /leaderboard
- [ ] `routes/wallet.php` — GET /wallet (баланс + история + лимит)
- [ ] `routes/children.php` — GET /children, DELETE /children/{id}
- [ ] `routes/family.php` — GET/PUT /family
- [ ] `routes/notifications.php` — GET /notifications (история уведомлений)
- [ ] Ежедневный сброс ежедневных заданий (cron или при запросе)
- [ ] Защита от дублирования claim при гонке запросов (транзакция БД)

### Деплой
- [ ] Зарегистрировать домен / аккаунт на InfinityFree
- [ ] Создать БД, выполнить миграцию
- [ ] Загрузить `backend/` на хостинг через FTP/FileZilla
- [ ] Заполнить `config.php` реальными данными
- [ ] Прописать реальный `API_BASE` в `web/js/api.js`
- [ ] Протестировать все endpoints через Postman/curl

---

## ⬜ Фаза 3 — Android (android/)

### Основа
- [x] `AndroidManifest.xml` — permissions, activity, FCM service
- [x] `MainActivity.kt` — WebView + JS Bridge
- [x] `FcmService.kt` — push-уведомления
- [x] `activity_main.xml` — layout с WebView
- [x] `build.gradle` (app + project), `settings.gradle`

### Доделать
- [ ] Добавить `google-services.json` (Firebase, через секрет GitHub)
- [ ] Настроить подпись APK (keystore) для релиза
- [ ] Иконка приложения — `mipmap-*/ic_launcher.png`
- [ ] Splash screen (windowBackground) пока грузится WebView
- [ ] Обработка deep links (если нужны)
- [ ] Тест на реальном устройстве

---

## ⬜ Фаза 4 — CI/CD и автоматизация

- [x] `.github/workflows/build.yml` — сборка debug APK
- [ ] Добавить шаг копирования `web/` в `android/assets` в CI ✓ (уже есть)
- [ ] Добавить сборку release APK с подписью (секрет KEYSTORE)
- [ ] Автодеплой `web/` на GitHub Pages (для веб-версии)
- [ ] Уведомление в Telegram при успешной сборке (опционально)

---

## ⬜ Фаза 5 — Тестирование и полировка

- [ ] Тест полного флоу: регистрация → создание задания → вход ребёнка → выполнение → одобрение → обмен
- [ ] Тест ежедневных заданий (сброс в полночь)
- [ ] Тест one_time_claim (блокировка для второго ребёнка)
- [ ] Проверка лимита обмена
- [ ] Проверка push-уведомлений (реальное устройство + Firebase)
- [ ] Проверка на разных размерах экрана (320px, 375px, 414px)
- [ ] Проверка в офлайн-режиме (сообщение об ошибке)

---

## ⬜ Фаза 6 — Google Play (опционально)

- [ ] Создать аккаунт разработчика Google Play ($25)
- [ ] Сделать скриншоты для Play Store (6 штук)
- [ ] Заполнить описание приложения
- [ ] Подготовить release APK / AAB с подписью
- [ ] Отправить на проверку

---

## 🗓️ Текущий статус

**Сделано:** Фаза 0 почти полностью, Фаза 1 (JS) ~70%, Фаза 2 (Backend) ~75%, Фаза 3 (Android) ~60%

**Следующий шаг:** `routes/wallet.php` → деплой backend → тест API → подключить реальный URL в web/js/api.js

---

## 📝 Заметки

- Веб-версия работает как PWA — можно использовать без Android
- InfinityFree имеет ограничение: нет cron jobs → сброс ежедневных заданий делать при каждом запросе `/tasks`
- `google-services.json` НЕ коммитить в репо — добавить как GitHub Secret
- Токен в localStorage — при разработке проверять через DevTools → Application → Local Storage
