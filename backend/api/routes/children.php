<?php
$db      = Database::get();
$auth    = Auth::requireParent();
$body    = json_decode(file_get_contents('php://input'), true) ?? [];
$subPath = $segments[2] ?? null; // children/{id}/reset-code → $subPath='reset-code'

// GET /children
if ($method === 'GET' && !$id) {
    $s = $db->prepare('
        SELECT c.id, c.name, c.avatar, c.coins_balance, c.child_code,
               COUNT(CASE WHEN tc.status="approved" AND DATE(tc.reviewed_at)=CURDATE() THEN 1 END) AS tasks_today
        FROM children c
        LEFT JOIN task_claims tc ON tc.child_id = c.id
        WHERE c.family_id = ?
        GROUP BY c.id ORDER BY c.created_at ASC
    ');
    $s->execute([$auth['family_id']]);
    Response::success($s->fetchAll());
}

// POST /children/{id}/reset-code
if ($method === 'POST' && $id && $subPath === 'reset-code') {
    $childId = intval($id);
    // Проверяем что ребёнок принадлежит этой семье
    $s = $db->prepare('SELECT id FROM children WHERE id=? AND family_id=?');
    $s->execute([$childId, $auth['family_id']]);
    if (!$s->fetch()) Response::error('Ребёнок не найден', 404);

    do {
        $code = strtoupper(substr(md5(uniqid('c', true)), 0, 6));
        $s = $db->prepare('SELECT id FROM children WHERE child_code=?');
        $s->execute([$code]);
    } while ($s->fetch());

    $db->prepare('UPDATE children SET child_code=? WHERE id=?')->execute([$code, $childId]);
    Response::success(['child_code' => $code]);
}

// GET /children/{id}
if ($method === 'GET' && $id) {
    $s = $db->prepare('SELECT * FROM children WHERE id=? AND family_id=?');
    $s->execute([$id, $auth['family_id']]);
    $child = $s->fetch();
    if (!$child) Response::error('Ребёнок не найден', 404);
    Response::success($child);
}

// DELETE /children/{id}
if ($method === 'DELETE' && $id && !$subPath) {
    $s = $db->prepare('DELETE FROM children WHERE id=? AND family_id=?');
    $s->execute([$id, $auth['family_id']]);
    Response::success(['deleted' => $s->rowCount() > 0]);
}

Response::error('Not found', 404);
