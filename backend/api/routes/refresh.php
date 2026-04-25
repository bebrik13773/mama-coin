<?php
// POST /refresh — получить новый токен (нужны email+password или child code)
// Используется когда старый токен невалиден из-за смены JWT_SECRET
$db   = Database::get();
$body = json_decode(file_get_contents('php://input'), true) ?? [];

if ($method !== 'POST') Response::error('Method not allowed', 405);

$role = $body['role'] ?? '';

if ($role === 'parent') {
    $email = trim($body['email'] ?? '');
    $pass  = $body['password'] ?? '';
    if (!$email || !$pass) Response::error('Нужны email и пароль');

    $s = $db->prepare('SELECT u.*,f.id fid,f.invite_code ic FROM users u JOIN families f ON f.parent_id=u.id WHERE u.email=?');
    $s->execute([$email]); $u = $s->fetch();
    if (!$u || !password_verify($pass, $u['password_hash'])) Response::error('Неверный логин или пароль');

    $token = Auth::generateToken(['sub'=>$u['id'],'role'=>'parent','family_id'=>$u['fid']]);
    Response::success(['token'=>$token,'name'=>$u['name'],'family_id'=>$u['fid'],'invite_code'=>$u['ic']]);
}

if ($role === 'child') {
    $name = trim($body['name'] ?? '');
    $code = strtoupper(trim($body['invite_code'] ?? ''));
    if (!$name || !$code) Response::error('Нужны имя и код семьи');

    $s = $db->prepare('SELECT * FROM families WHERE invite_code=?'); $s->execute([$code]); $fam = $s->fetch();
    if (!$fam) Response::error('Неверный код');

    $s = $db->prepare('SELECT * FROM children WHERE family_id=? AND name=?'); $s->execute([$fam['id'], $name]); $child = $s->fetch();
    if (!$child) Response::error('Ребёнок не найден');

    $token = Auth::generateToken(['sub'=>$child['id'],'role'=>'child','family_id'=>$fam['id']]);
    Response::success(['token'=>$token,'child'=>$child]);
}

Response::error('Укажи role: parent или child');
