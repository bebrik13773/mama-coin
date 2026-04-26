<?php
// GET /me — проверка токена, возвращает данные текущего пользователя
$auth = Auth::requireAuth();
$db   = Database::get();

if ($auth['role'] === 'parent') {
    $s = $db->prepare('SELECT u.id, u.name, u.email, f.invite_code, f.coin_rate, f.monthly_limit, f.id as family_id FROM users u JOIN families f ON f.parent_id = u.id WHERE u.id = ?');
    $s->execute([$auth['sub']]);
    $data = $s->fetch();
} else {
    $s = $db->prepare('SELECT id, name, avatar, coins_balance, family_id FROM children WHERE id = ?');
    $s->execute([$auth['sub']]);
    $data = $s->fetch();
}

if (!$data) Response::error('User not found', 404);

Response::success(array_merge($data, ['role' => $auth['role']]));
