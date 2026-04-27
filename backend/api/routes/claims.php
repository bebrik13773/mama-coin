<?php
$db   = Database::get();
$body = json_decode(file_get_contents('php://input'), true) ?? [];
$auth = Auth::requireAuth();
$fid  = $auth['family_id'];
$role = $auth['role'];

// POST /claims — взять задание
if ($method === 'POST' && !$id) {
    if ($role !== 'child') Response::error('Только для детей', 403);
    $cid = $auth['sub'];
    $tid = intval($body['task_id'] ?? 0);
    if (!$tid) Response::error('Укажи task_id');

    $db->beginTransaction();
    try {
        $s = $db->prepare('SELECT * FROM tasks WHERE id=? AND family_id=? AND is_active=1 FOR UPDATE');
        $s->execute([$tid, $fid]);
        $task = $s->fetch();
        if (!$task) { $db->rollBack(); Response::error('Задание не найдено'); }

        // Ребёнок может иметь только 1 активное задание одновременно
        $s = $db->prepare("SELECT COUNT(*) cnt FROM task_claims WHERE child_id=? AND status IN('in_progress','pending')");
        $s->execute([$cid]);
        if ($s->fetch()['cnt'] > 0) { $db->rollBack(); Response::error('Сначала сдай текущее задание'); }

        // Это задание уже взято?
        $s = $db->prepare("SELECT id FROM task_claims WHERE task_id=? AND child_id=? AND status IN('in_progress','pending','approved')");
        $s->execute([$tid, $cid]);
        if ($s->fetch()) { $db->rollBack(); Response::error('Ты уже выполнял это задание'); }

        // one_time_claim
        if ($task['one_time_claim']) {
            $s = $db->prepare("SELECT id FROM task_claims WHERE task_id=? AND status IN('in_progress','pending','approved')");
            $s->execute([$tid]);
            if ($s->fetch()) { $db->rollBack(); Response::error('Задание уже занято'); }
        }

        $db->prepare("INSERT INTO task_claims (task_id,child_id,status) VALUES (?,?,'in_progress')")->execute([$tid, $cid]);
        $claimId = $db->lastInsertId();
        $db->commit();
        Response::created(['claim_id' => $claimId]);
    } catch (Exception $e) {
        $db->rollBack();
        Response::error('Ошибка при взятии задания', 500);
    }
}

// PUT /claims/{id} — сдать/одобрить/отклонить
if ($method === 'PUT' && $id) {
    $action = $body['action'] ?? '';

    // Ребёнок сдаёт задание
    if ($role === 'child' && $action === 'submit') {
        $cid = $auth['sub'];
        $s = $db->prepare("UPDATE task_claims SET status='pending',submitted_at=NOW()
                           WHERE id=? AND child_id=? AND status='in_progress'");
        $s->execute([$id, $cid]);
        if ($s->rowCount() === 0) Response::error('Задание не найдено или уже сдано');
        Notify::taskSubmitted($db, (int)$id, $fid);
        Response::success(['submitted' => true]);
    }

    // Родитель одобряет/отклоняет
    if ($role === 'parent' && in_array($action, ['approve','reject'])) {
        $s = $db->prepare('
            SELECT tc.*, t.coins_reward, t.one_time_claim, t.id task_id
            FROM task_claims tc
            JOIN tasks t ON t.id = tc.task_id
            WHERE tc.id=? AND t.family_id=? AND tc.status="pending"
        ');
        $s->execute([$id, $fid]);
        $cl = $s->fetch();
        if (!$cl) Response::error('Claim не найден или уже обработан');

        if ($action === 'approve') {
            $db->prepare("UPDATE task_claims SET status='approved',reviewed_at=NOW() WHERE id=?")->execute([$id]);
            $db->prepare('UPDATE children SET coins_balance=coins_balance+? WHERE id=?')->execute([$cl['coins_reward'], $cl['child_id']]);
            $db->prepare("INSERT INTO coin_transactions (child_id,amount,type,reference_id,note) VALUES (?,?,'task_reward',?,'За задание')")
                ->execute([$cl['child_id'], $cl['coins_reward'], $id]);
            if ($cl['one_time_claim']) {
                $db->prepare('UPDATE tasks SET is_active=0 WHERE id=?')->execute([$cl['task_id']]);
            }
            Notify::taskApproved($db, $cl['child_id'], $cl['coins_reward']);
        } else {
            $reason = $body['reason'] ?? null;
            $db->prepare("UPDATE task_claims SET status='rejected',reviewed_at=NOW(),reject_reason=? WHERE id=?")->execute([$reason, $id]);
            // Освобождаем ребёнка — он может взять другое задание
            Notify::taskRejected($db, $cl['child_id'], $reason);
        }
        Response::success(['action' => $action]);
    }
}

// GET /claims?status=pending
if ($method === 'GET' && !$id) {
    if ($role !== 'parent') Response::error('Только для родителей', 403);
    $status = $_GET['status'] ?? 'pending';
    $s = $db->prepare('
        SELECT tc.*, t.title, t.emoji, t.coins_reward, c.name child_name, c.avatar child_avatar
        FROM task_claims tc
        JOIN tasks t ON t.id = tc.task_id
        JOIN children c ON c.id = tc.child_id
        WHERE t.family_id=? AND tc.status=?
        ORDER BY tc.submitted_at DESC
    ');
    $s->execute([$fid, $status]);
    Response::success($s->fetchAll());
}

Response::error('Not found', 404);
