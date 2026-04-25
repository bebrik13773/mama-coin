<?php
// backend/api/migrate.php
// Вызывается автоматически из index.php если таблиц нет
// Можно также открыть напрямую: https://mama-coin.ct.ws/api/migrate.php

function runMigrations(PDO $db): void {
    $db->exec("SET NAMES utf8mb4");
    $db->exec("SET FOREIGN_KEY_CHECKS = 0");

    $db->exec("CREATE TABLE IF NOT EXISTS `users` (
        `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `name`          VARCHAR(100) NOT NULL,
        `email`         VARCHAR(255) NOT NULL UNIQUE,
        `password_hash` VARCHAR(255) NOT NULL,
        `fcm_token`     VARCHAR(255) DEFAULT NULL,
        `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $db->exec("CREATE TABLE IF NOT EXISTS `families` (
        `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `parent_id`     INT UNSIGNED NOT NULL,
        `invite_code`   CHAR(6) NOT NULL UNIQUE,
        `coin_rate`     DECIMAL(8,2) DEFAULT 50.00,
        `monthly_limit` INT UNSIGNED DEFAULT 500,
        `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`parent_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $db->exec("CREATE TABLE IF NOT EXISTS `children` (
        `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `family_id`     INT UNSIGNED NOT NULL,
        `name`          VARCHAR(100) NOT NULL,
        `avatar`        VARCHAR(10) DEFAULT '🧒',
        `fcm_token`     VARCHAR(255) DEFAULT NULL,
        `coins_balance` INT UNSIGNED DEFAULT 0,
        `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $db->exec("CREATE TABLE IF NOT EXISTS `tasks` (
        `id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `family_id`       INT UNSIGNED NOT NULL,
        `title`           VARCHAR(200) NOT NULL,
        `description`     TEXT DEFAULT NULL,
        `emoji`           VARCHAR(10) DEFAULT '📋',
        `type`            ENUM('common','individual') NOT NULL DEFAULT 'common',
        `target_child_id` INT UNSIGNED DEFAULT NULL,
        `is_daily`        TINYINT(1) DEFAULT 0,
        `one_time_claim`  TINYINT(1) DEFAULT 0,
        `coins_reward`    INT UNSIGNED NOT NULL DEFAULT 10,
        `is_active`       TINYINT(1) DEFAULT 1,
        `created_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`target_child_id`) REFERENCES `children`(`id`) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $db->exec("CREATE TABLE IF NOT EXISTS `task_claims` (
        `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `task_id`       INT UNSIGNED NOT NULL,
        `child_id`      INT UNSIGNED NOT NULL,
        `status`        ENUM('in_progress','pending','approved','rejected') DEFAULT 'in_progress',
        `claimed_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `submitted_at`  TIMESTAMP NULL DEFAULT NULL,
        `reviewed_at`   TIMESTAMP NULL DEFAULT NULL,
        `reject_reason` VARCHAR(255) DEFAULT NULL,
        FOREIGN KEY (`task_id`)  REFERENCES `tasks`(`id`) ON DELETE CASCADE,
        FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $db->exec("CREATE TABLE IF NOT EXISTS `coin_transactions` (
        `id`           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `child_id`     INT UNSIGNED NOT NULL,
        `amount`       INT NOT NULL,
        `type`         ENUM('task_reward','exchange','bonus','penalty') NOT NULL,
        `reference_id` INT UNSIGNED DEFAULT NULL,
        `note`         VARCHAR(255) DEFAULT NULL,
        `created_at`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $db->exec("CREATE TABLE IF NOT EXISTS `exchange_requests` (
        `id`           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `child_id`     INT UNSIGNED NOT NULL,
        `coins_amount` INT UNSIGNED NOT NULL,
        `rub_amount`   DECIMAL(10,2) NOT NULL,
        `status`       ENUM('pending','approved','rejected') DEFAULT 'pending',
        `created_at`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `reviewed_at`  TIMESTAMP NULL DEFAULT NULL,
        FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $db->exec("SET FOREIGN_KEY_CHECKS = 1");
}

// Если файл открыт напрямую — показать статус
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    header('Content-Type: application/json; charset=utf-8');
    require_once __DIR__ . '/../config/config.php';
    try {
        $db = new PDO("mysql:host=".DB_HOST.";dbname=".DB_NAME.";charset=utf8mb4", DB_USER, DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        runMigrations($db);
        echo json_encode(['ok' => true, 'message' => 'Таблицы созданы / уже существуют']);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
    }
}
