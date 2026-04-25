<?php
$db   = Database::get();
$body = json_decode(file_get_contents('php://input'), true) ?? [];

if ($resource === 'register' && $method === 'POST') {
    $name=$body['name']??''; $email=$body['email']??''; $pass=$body['password']??'';
    if (!$name||!$email||!$pass) Response::error('Заполни все поля');
    if (!filter_var($email,FILTER_VALIDATE_EMAIL)) Response::error('Неверный email');
    if (strlen($pass)<6) Response::error('Пароль минимум 6 символов');
    $s=$db->prepare('SELECT id FROM users WHERE email=?'); $s->execute([$email]);
    if ($s->fetch()) Response::error('Email уже зарегистрирован');
    $db->prepare('INSERT INTO users (name,email,password_hash) VALUES (?,?,?)')->execute([$name,$email,password_hash($pass,PASSWORD_BCRYPT)]);
    $uid=$db->lastInsertId();
    $code=strtoupper(substr(md5(uniqid($uid,true)),0,6));
    $db->prepare('INSERT INTO families (parent_id,invite_code) VALUES (?,?)')->execute([$uid,$code]);
    $fid=$db->lastInsertId();
    $token=Auth::generateToken(['sub'=>$uid,'role'=>'parent','family_id'=>$fid]);
    Response::created(['token'=>$token,'invite_code'=>$code,'family_id'=>$fid]);
}

if ($resource === 'login' && $method === 'POST') {
    $email=$body['email']??''; $pass=$body['password']??'';
    if (!$email||!$pass) Response::error('Введи email и пароль');
    $s=$db->prepare('SELECT u.*,f.id fid,f.invite_code ic FROM users u JOIN families f ON f.parent_id=u.id WHERE u.email=?');
    $s->execute([$email]); $u=$s->fetch();
    if (!$u||!password_verify($pass,$u['password_hash'])) Response::error('Неверный логин или пароль');
    if (!empty($body['fcm_token'])) $db->prepare('UPDATE users SET fcm_token=? WHERE id=?')->execute([$body['fcm_token'],$u['id']]);
    $token=Auth::generateToken(['sub'=>$u['id'],'role'=>'parent','family_id'=>$u['fid']]);
    Response::success(['token'=>$token,'name'=>$u['name'],'family_id'=>$u['fid'],'invite_code'=>$u['ic']]);
}

if ($resource === 'child-join' && $method === 'POST') {
    $name=$body['name']??''; $code=strtoupper(trim($body['invite_code']??'')); $avatar=$body['avatar']??'🧒';
    if (!$name||!$code) Response::error('Введи имя и код семьи');
    $s=$db->prepare('SELECT * FROM families WHERE invite_code=?'); $s->execute([$code]); $fam=$s->fetch();
    if (!$fam) Response::error('Неверный код семьи');
    $s=$db->prepare('SELECT id FROM children WHERE family_id=? AND name=?'); $s->execute([$fam['id'],$name]); $ex=$s->fetch();
    if ($ex) { $cid=$ex['id']; }
    else { $db->prepare('INSERT INTO children (family_id,name,avatar) VALUES (?,?,?)')->execute([$fam['id'],$name,$avatar]); $cid=$db->lastInsertId(); }
    if (!empty($body['fcm_token'])) $db->prepare('UPDATE children SET fcm_token=? WHERE id=?')->execute([$body['fcm_token'],$cid]);
    $token=Auth::generateToken(['sub'=>$cid,'role'=>'child','family_id'=>$fam['id']]);
    $s=$db->prepare('SELECT id,name,avatar,coins_balance FROM children WHERE id=?'); $s->execute([$cid]);
    Response::success(['token'=>$token,'child'=>$s->fetch()]);
}

Response::error('Not found',404);
