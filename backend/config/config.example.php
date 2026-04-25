<?php
// backend/config/config.php — скопируй и заполни
define('DB_HOST',    'localhost');
define('DB_NAME',    'your_database');
define('DB_USER',    'your_user');
define('DB_PASS',    'your_password');
define('DB_CHARSET', 'utf8mb4');

define('JWT_SECRET',      'ЗАМЕНИ_НА_СЛУЧАЙНУЮ_СТРОКУ_32+_СИМВОЛОВ');
define('JWT_EXPIRE_HOURS', 720); // 30 дней

define('FCM_SERVER_KEY', ''); // Firebase → Project Settings → Cloud Messaging

define('APP_URL',    'https://your-domain.infinityfreeapp.com');
define('DEBUG_MODE', false);
