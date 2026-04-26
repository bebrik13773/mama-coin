<?php
$db   = Database::get();
$body = json_decode(file_get_contents('php://input'), true) ?? [];

if ($resource === 'register' && $method === 'POST') {
    $name  = trim($body['name']  ?? '');
    $email = trim($body['email'] ?? '');
    $pass  = $body['password']   ?? '';

    if (!$name || !$email || !$pass) Response::error('Заполни все поля');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) Response::error('Неверный email');
    if (strlen($pass) < 6) Response::error('Пароль минимум 6 символов');

    $s = $db->prepare('SELECT id FROM users WHERE email=?');
    $s->execute([$email]);
    if ($s->fetch()) Response::error('Email уже зарегистрирован');

    $db->prepare('INSERT INTO users (name,email,password_hash) VALUES (?,?,?)')->execute([$name, $email, password_hash($pass, PASSWORD_BCRYPT)]);
    $uid = $db->lastInsertId();

    $code = strtoupper(substr(md5(uniqid($uid, true)), 0, 6));
    $db->prepare('INSERT INTO families (parent_id,invite_code) VALUES (?,?)')->execute([$uid, $code]);
    $fid = $db->lastInsertId();

    $token = Auth::createSession($uid, 'parent', $fid);
    Response::created(['token' => $token, 'invite_code' => $code, 'family_id' => $fid, 'name' => $name]);
}

if ($resource === 'login' && $method === 'POST') {
    $email = trim($body['email'] ?? '');
    $pass  = $body['password']   ?? '';

    if (!$email || !$pass) Response::error('Введи email и пароль');

    $s = $db->prepare('SELECT u.*,f.id fid,f.invite_code ic FROM users u JOIN families f ON f.parent_id=u.id WHERE u.email=?');
    $s->execute([$email]);
    $u = $s->fetch();

    if (!$u || !password_verify($pass, $u['password_hash'])) Response::error('Неверный логин или пароль');

    $token = Auth::createSession($u['id'], 'parent', $u['fid']);
    Response::success(['token' => $token, 'name' => $u['name'], 'family_id' => $u['fid'], 'invite_code' => $u['ic']]);
}

if ($resource === 'child-join' && $method === 'POST') {
    $code   = strtoupper(trim($body['invite_code'] ?? ''));
    $name   = trim($body['name'] ?? '');
    $avatar = $body['avatar'] ?? '🧒';

    if (!$code) Response::error('Введи код');

    // Пробуем найти по child_code (повторный вход ребёнка)
    $s = $db->prepare('SELECT c.*,c.family_id FROM children c WHERE c.child_code=?');
    $s->execute([$code]);
    $child = $s->fetch();

    if ($child) {
        // Повторный вход по личному коду ребёнка
        $token = Auth::createSession($child['id'], 'child', $child['family_id']);
        Response::success(['token' => $token, 'child' => $child]);
    }

    // Иначе — вход по коду семьи (первая регистрация)
    if (!$name) Response::error('Введи имя');
    $s = $db->prepare('SELECT * FROM families WHERE invite_code=?');
    $s->execute([$code]);
    $fam = $s->fetch();
    if (!$fam) Response::error('Неверный код — проверь код семьи или личный код');

    $s = $db->prepare('SELECT * FROM children WHERE family_id=? AND name=?');
    $s->execute([$fam['id'], $name]);
    $ex = $s->fetch();

    if ($ex) {
        $cid = $ex['id'];
    } else {
        // Генерируем child_code при первой регистрации
        do {
            $childCode = strtoupper(substr(md5(uniqid('c', true)), 0, 6));
            $sc = $db->prepare('SELECT id FROM children WHERE child_code=?');
            $sc->execute([$childCode]);
        } while ($sc->fetch());
        $db->prepare('INSERT INTO children (family_id,name,avatar,child_code) VALUES (?,?,?,?)')->execute([$fam['id'], $name, $avatar, $childCode]);
        $cid = $db->lastInsertId();
    }

    $token = Auth::createSession($cid, 'child', $fam['id']);
    $s = $db->prepare('SELECT * FROM children WHERE id=?');
    $s->execute([$cid]);
    Response::success(['token' => $token, 'child' => $s->fetch()]);
}

if ($resource === 'logout' && $method === 'POST') {
    Auth::destroySession();
    Response::success(['logged_out' => true]);
}

Response::error('Not found', 404);
