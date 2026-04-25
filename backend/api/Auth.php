<?php
class Auth {
    public static function generateToken(array $payload): string {
        $header  = rtrim(strtr(base64_encode(json_encode(['alg'=>'HS256','typ'=>'JWT'])), '+/', '-_'), '=');
        $payload['exp'] = time() + JWT_EXPIRE_HOURS * 3600;
        $p = rtrim(strtr(base64_encode(json_encode($payload)), '+/', '-_'), '=');
        $sig = rtrim(strtr(base64_encode(hash_hmac('sha256', "$header.$p", JWT_SECRET, true)), '+/', '-_'), '=');
        return "$header.$p.$sig";
    }

    public static function verifyToken(string $token): ?array {
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;
        [$h, $p, $s] = $parts;
        $expected = rtrim(strtr(base64_encode(hash_hmac('sha256', "$h.$p", JWT_SECRET, true)), '+/', '-_'), '=');
        if (!hash_equals($expected, $s)) return null;
        // base64url decode
        $json = base64_decode(strtr($p, '-_', '+/') . str_repeat('=', (4 - strlen($p) % 4) % 4));
        $data = json_decode($json, true);
        if (!$data || $data['exp'] < time()) return null;
        return $data;
    }

    private static function fromHeader(): ?array {
        $h = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        $token = str_replace('Bearer ', '', $h);
        if (!$token) return null;
        return self::verifyToken($token);
    }

    public static function requireAuth(): array {
        $d = self::fromHeader();
        if (!$d) { Response::error('Unauthorized', 401); exit; }
        return $d;
    }

    public static function requireParent(): array {
        $d = self::fromHeader();
        if (!$d || ($d['role'] ?? '') !== 'parent') { Response::error('Unauthorized', 401); exit; }
        return $d;
    }

    public static function requireChild(): array {
        $d = self::fromHeader();
        if (!$d || ($d['role'] ?? '') !== 'child') { Response::error('Unauthorized', 401); exit; }
        return $d;
    }
}
