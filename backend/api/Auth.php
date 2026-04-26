<?php
class Auth {

    // ── Session-based auth (без JWT) ──────────────────────
    private static function startSession(): void {
        if (session_status() === PHP_SESSION_NONE) {
            session_name('mc_session');
            session_set_cookie_params([
                'lifetime' => 60 * 60 * 24 * 30, // 30 дней
                'path'     => '/',
                'domain'   => '',
                'secure'   => false, // InfinityFree иногда без HTTPS на уровне PHP
                'httponly' => true,
                'samesite' => 'Lax',
            ]);
            session_start();
        }
    }

    public static function createSession(int $userId, string $role, int $familyId): string {
        self::startSession();
        $_SESSION['user_id']   = $userId;
        $_SESSION['role']      = $role;
        $_SESSION['family_id'] = $familyId;
        $_SESSION['created']   = time();
        // Возвращаем session id как "токен" для совместимости с JS
        return session_id();
    }

    public static function requireAuth(): array {
        self::startSession();

        // Пробуем из сессии
        if (!empty($_SESSION['user_id'])) {
            return [
                'sub'       => (int)$_SESSION['user_id'],
                'role'      => $_SESSION['role'],
                'family_id' => (int)$_SESSION['family_id'],
            ];
        }

        // Fallback: Bearer токен в заголовке (для совместимости со старыми клиентами)
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        $token  = str_replace('Bearer ', '', $header);
        if ($token) {
            $data = self::verifyJWT($token);
            if ($data) {
                // Переносим в сессию
                $_SESSION['user_id']   = $data['sub'];
                $_SESSION['role']      = $data['role'];
                $_SESSION['family_id'] = $data['family_id'];
                return $data;
            }
        }

        Response::error('Unauthorized', 401);
        exit;
    }

    public static function requireParent(): array {
        $d = self::requireAuth();
        if ($d['role'] !== 'parent') { Response::error('Unauthorized', 403); exit; }
        return $d;
    }

    public static function requireChild(): array {
        $d = self::requireAuth();
        if ($d['role'] !== 'child') { Response::error('Unauthorized', 403); exit; }
        return $d;
    }

    public static function destroySession(): void {
        self::startSession();
        $_SESSION = [];
        session_destroy();
        setcookie('mc_session', '', time() - 3600, '/');
    }

    // ── JWT (оставляем для совместимости) ─────────────────
    public static function generateToken(array $payload): string {
        $h = rtrim(strtr(base64_encode(json_encode(['alg'=>'HS256','typ'=>'JWT'])), '+/', '-_'), '=');
        $payload['exp'] = time() + 720 * 3600;
        $p   = rtrim(strtr(base64_encode(json_encode($payload)), '+/', '-_'), '=');
        $sig = rtrim(strtr(base64_encode(hash_hmac('sha256', "$h.$p", JWT_SECRET, true)), '+/', '-_'), '=');
        return "$h.$p.$sig";
    }

    private static function verifyJWT(string $token): ?array {
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;
        [$h, $p, $s] = $parts;
        $exp = rtrim(strtr(base64_encode(hash_hmac('sha256', "$h.$p", JWT_SECRET, true)), '+/', '-_'), '=');
        if (!hash_equals($exp, $s)) return null;
        $json = base64_decode(strtr($p, '-_', '+/') . str_repeat('=', (4 - strlen($p) % 4) % 4));
        $data = json_decode($json, true);
        if (!$data || $data['exp'] < time()) return null;
        return $data;
    }
}
