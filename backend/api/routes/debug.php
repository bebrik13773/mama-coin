<?php
// Временный debug endpoint - удалить после отладки
// GET /api/debug-token — проверяет токен из заголовка
if ($method === 'GET') {
    $h     = $_SERVER['HTTP_AUTHORIZATION'] ?? 'NO HEADER';
    $token = str_replace('Bearer ', '', $h);
    
    if (!$token || $token === 'NO HEADER') {
        Response::success(['error' => 'No Authorization header', 'header' => $h]);
    }
    
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        Response::success(['error' => 'Invalid token format', 'parts' => count($parts)]);
    }
    
    [$hdr, $p, $s] = $parts;
    
    // Декодируем payload без проверки подписи
    $json    = base64_decode(strtr($p, '-_', '+/') . str_repeat('=', (4 - strlen($p) % 4) % 4));
    $payload = json_decode($json, true);
    
    // Проверяем подпись
    $expected = rtrim(strtr(base64_encode(hash_hmac('sha256', "$hdr.$p", JWT_SECRET, true)), '+/', '-_'), '=');
    $sigMatch = hash_equals($expected, $s);
    
    Response::success([
        'payload'        => $payload,
        'signature_ok'   => $sigMatch,
        'expected_sig'   => substr($expected, 0, 10) . '...',
        'actual_sig'     => substr($s, 0, 10) . '...',
        'jwt_secret_len' => strlen(JWT_SECRET),
        'jwt_secret_preview' => substr(JWT_SECRET, 0, 4) . '...',
        'token_preview'  => substr($token, 0, 20) . '...',
        'expired'        => $payload ? ($payload['exp'] < time()) : null,
        'time_now'       => time(),
    ]);
}
Response::error('Not found', 404);
