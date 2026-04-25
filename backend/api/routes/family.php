<?php
$db   = Database::get();
$auth = Auth::requireParent();
$body = json_decode(file_get_contents('php://input'), true) ?? [];

// GET /family
if ($method === 'GET') {
    $stmt = $db->prepare('SELECT * FROM families WHERE parent_id = ?');
    $stmt->execute([$auth['sub']]);
    $family = $stmt->fetch();
    if (!$family) Response::error('Семья не найдена', 404);
    Response::success($family);
}

// PUT /family
if ($method === 'PUT') {
    $set = []; $params = [];
    if (isset($body['coin_rate']))     { $set[] = 'coin_rate = ?';     $params[] = (float)$body['coin_rate']; }
    if (isset($body['monthly_limit'])) { $set[] = 'monthly_limit = ?'; $params[] = (int)$body['monthly_limit']; }
    if (!$set) Response::error('Нет данных для обновления');
    $params[] = $auth['sub'];
    $stmt = $db->prepare('UPDATE families SET ' . implode(',', $set) . ' WHERE parent_id = ?');
    $stmt->execute($params);
    // Возвращаем обновлённые данные
    $stmt2 = $db->prepare('SELECT * FROM families WHERE parent_id = ?');
    $stmt2->execute([$auth['sub']]);
    Response::success($stmt2->fetch());
}

Response::error('Not found', 404);
