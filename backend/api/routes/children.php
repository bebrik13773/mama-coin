<?php
// backend/api/routes/children.php
$db   = Database::get();
$auth = Auth::requireParent();

// GET /children — список детей семьи
if ($method === 'GET') {
    $stmt = $db->prepare('
        SELECT c.id, c.name, c.avatar, c.coins_balance,
               COUNT(CASE WHEN tc.status="approved" AND DATE(tc.reviewed_at)=CURDATE() THEN 1 END) AS tasks_today
        FROM children c
        LEFT JOIN task_claims tc ON tc.child_id = c.id
        WHERE c.family_id = ?
        GROUP BY c.id
        ORDER BY c.created_at ASC
    ');
    $stmt->execute([$auth['family_id']]);
    Response::success($stmt->fetchAll());
}

// DELETE /children/{id}
if ($method === 'DELETE' && $id) {
    $stmt = $db->prepare('DELETE FROM children WHERE id = ? AND family_id = ?');
    $stmt->execute([$id, $auth['family_id']]);
    Response::success(['deleted' => $stmt->rowCount() > 0]);
}

Response::error('Not found', 404);
