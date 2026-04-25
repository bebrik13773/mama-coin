# 🪙 МамаКоин

**Семейное приложение: задания для детей → монеты → реальные деньги**

[![Build APK](https://github.com/bebrik13773/mama-coin/actions/workflows/build.yml/badge.svg)](https://github.com/bebrik13773/mama-coin/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.txt)
[![Android](https://img.shields.io/github/v/release/bebrik13773/mama-coin)](https://github.com/bebrik13773/mama-coin/releases/tag/latest)
[![Code size](https://img.shields.io/github/languages/code-size/badges/shields.svg)]
---

## 📱 Что это

МамаКоин — Android-приложение (WebView + PHP backend) для семей.  
Родитель создаёт задания, дети их выполняют и зарабатывают **МамаКоины**, которые можно обменять на реальные рубли.

### Для родителя
- Создание заданий: **общие** (для всех) или **личные** (для одного ребёнка)
- **Ежедневные** задания — сбрасываются каждый день
- **Разовые** — как только взял один ребёнок, другим недоступно
- Проверка и одобрение / отклонение выполненных заданий
- Настройка курса обмена монет и месячного лимита
- Push-уведомления о сдаче заданий

### Для ребёнка
- Список доступных заданий, взятие и сдача на проверку
- Кошелёк с балансом и историей монет
- Обмен монет на рубли (запрос родителю)
- 🏆 Таблица лидеров среди братьев и сестёр

---

## 🏗️ Архитектура

```
mama-coin/
├── web/              ← Веб-приложение (работает и в браузере как PWA)
│   ├── index.html
│   ├── css/app.css
│   ├── js/api.js     ← HTTP-клиент + localStorage
│   ├── js/auth.js    ← Авторизация
│   ├── js/parent.js  ← Экраны родителя
│   ├── js/child.js   ← Экраны ребёнка
│   └── js/app.js     ← Роутер
├── backend/          ← PHP REST API (InfinityFree)
│   ├── api/
│   ├── config/
│   └── migrations/
├── android/          ← Kotlin WebView-обёртка + FCM
└── .github/workflows/build.yml  ← Авто-сборка APK
```

### Стек
| Слой | Технология |
|------|-----------|
| Frontend | Vanilla HTML/CSS/JS |
| Android  | Kotlin + WebView + FCM |
| Backend  | PHP 8+ + MySQL + JWT |
| Хостинг  | InfinityFree |
| CI/CD    | GitHub Actions |

---

## 🚀 Запуск

### Backend
```bash
mysql -u user -p dbname < backend/migrations/001_init.sql
cp backend/config/config.example.php backend/config/config.php
# Заполни DB_HOST, DB_NAME, DB_USER, DB_PASS, JWT_SECRET
```

### Веб (разработка)
```bash
cd web && python3 -m http.server 8080
# Открой http://localhost:8080
```

### Android APK
Каждый push в `main` → APK во вкладке **Actions → Artifacts**.

Или локально:
```bash
cp -r web android/app/src/main/assets/web
cd android && ./gradlew assembleDebug
```

---

## 📄 Лицензия

MIT — [LICENSE.txt](LICENSE.txt)
