<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Auth.php';
require_once __DIR__ . '/Response.php';
require_once __DIR__ . '/Notify.php';

$path     = trim($_SERVER['PATH_INFO'] ?? '/', '/');
$method   = $_SERVER['REQUEST_METHOD'];
$segments = explode('/', $path);
$resource = $segments[0] ?? '';
$id       = $segments[1] ?? null;

try {
    switch ($resource) {
        case 'register':      case 'login': case 'child-join': require __DIR__ . '/routes/auth.php';         break;
        case 'family':        require __DIR__ . '/routes/family.php';       break;
        case 'children':      require __DIR__ . '/routes/children.php';     break;
        case 'tasks':         require __DIR__ . '/routes/tasks.php';        break;
        case 'claims':        require __DIR__ . '/routes/claims.php';       break;
        case 'wallet':        require __DIR__ . '/routes/wallet.php';       break;
        case 'exchange':      require __DIR__ . '/routes/exchange.php';     break;
        case 'leaderboard':   require __DIR__ . '/routes/leaderboard.php';  break;
        default:              Response::error('Not found', 404);
    }
} catch (Exception $e) {
    Response::error(defined('DEBUG_MODE') && DEBUG_MODE ? $e->getMessage() : 'Server error', 500);
}
