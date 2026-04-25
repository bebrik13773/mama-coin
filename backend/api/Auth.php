<?php
class Auth {
    public static function generateToken(array $payload): string {
        $header  = base64_encode(json_encode(['alg'=>'HS256','typ'=>'JWT']));
        $payload['exp'] = time() + JWT_EXPIRE_HOURS * 3600;
        $payload = base64_encode(json_encode($payload));
        $sig     = base64_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
        return "$header.$payload.$sig";
    }
    public static function verifyToken(string $token): ?array {
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;
        [$h, $p, $s] = $parts;
        if (!hash_equals(base64_encode(hash_hmac('sha256', "$h.$p", JWT_SECRET, true)), $s)) return null;
        $data = json_decode(base64_decode($p), true);
        if (!$data || $data['exp'] < time()) return null;
        return $data;
    }
    private static function fromHeader(): ?array {
        $h = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        return self::verifyToken(str_replace('Bearer ', '', $h));
    }
    public static function requireAuth(): array {
        $d = self::fromHeader();
        if (!$d) { Response::error('Unauthorized', 401); exit; }
        return $d;
    }
    public static function requireParent(): array {
        $d = self::fromHeader();
        if (!$d || $d['role'] !== 'parent') { Response::error('Unauthorized', 401); exit; }
        return $d;
    }
    public static function requireChild(): array {
        $d = self::fromHeader();
        if (!$d || $d['role'] !== 'child') { Response::error('Unauthorized', 401); exit; }
        return $d;
    }
}
