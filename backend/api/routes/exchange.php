<?php
$db   = Database::get();
$body = json_decode(file_get_contents('php://input'), true) ?? [];
$auth = Auth::requireAuth();
$fid  = $auth['family_id'];
$role = $auth['role'];

// POST /exchange — ребёнок запрашивает обмен
if ($method === 'POST' && !$id) {
    if ($role !== 'child') Response::error('Только для детей', 403);
    $cid   = $auth['sub'];
    $coins = intval($body['coins_amount'] ?? 0);
    if ($coins < 1) Response::error('Укажи количество монет');

    $s = $db->prepare('SELECT coins_balance FROM children WHERE id=?');
    $s->execute([$cid]);
    $ch = $s->fetch();
    if (!$ch || $ch['coins_balance'] < $coins) Response::error('Недостаточно монет');

    $s = $db->prepare('SELECT monthly_limit, coin_rate FROM families WHERE id=?');
    $s->execute([$fid]);
    $fam = $s->fetch();

    $s = $db->prepare("SELECT COALESCE(SUM(coins_amount),0) used FROM exchange_requests
        WHERE child_id=? AND status!='rejected'
        AND MONTH(created_at)=MONTH(NOW()) AND YEAR(created_at)=YEAR(NOW())");
    $s->execute([$cid]);
    $used = (int)$s->fetch()['used'];

    if ($used + $coins > $fam['monthly_limit'])
        Response::error("Превышен лимит {$fam['monthly_limit']} монет/мес");

    $rub = round($coins * $fam['coin_rate'] / 100, 2);
    $db->prepare('INSERT INTO exchange_requests (child_id,coins_amount,rub_amount) VALUES (?,?,?)')->execute([$cid, $coins, $rub]);
    Notify::exchangeRequested($db, $fid, $cid, $coins, $rub);
    Response::created(['request_id' => $db->lastInsertId(), 'rub_amount' => $rub]);
}

// PUT /exchange/{id} — родитель одобряет/отклоняет
if ($method === 'PUT' && $id) {
    if ($role !== 'parent') Response::error('Только для родителей', 403);
    $action = $body['action'] ?? '';
    if (!in_array($action, ['approve','reject'])) Response::error('Неверное действие');

    $s = $db->prepare('
        SELECT er.*, c.coins_balance
        FROM exchange_requests er
        JOIN children c ON c.id = er.child_id
        JOIN families f ON f.id = c.family_id
        WHERE er.id=? AND f.id=? AND er.status="pending"
    ');
    $s->execute([$id, $fid]);
    $req = $s->fetch();
    if (!$req) Response::error('Запрос не найден или уже обработан');

    if ($action === 'approve') {
        if ($req['coins_balance'] < $req['coins_amount'])
            Response::error('У ребёнка недостаточно монет');

        $db->prepare("UPDATE exchange_requests SET status='approved',reviewed_at=NOW() WHERE id=?")->execute([$id]);
        $db->prepare('UPDATE children SET coins_balance=coins_balance-? WHERE id=?')->execute([$req['coins_amount'], $req['child_id']]);
        // Одна запись в транзакции (была двойная — это вызывало ошибку)
        $db->prepare("INSERT INTO coin_transactions (child_id,amount,type,reference_id,note) VALUES (?,?,'exchange',?,?)")
            ->execute([$req['child_id'], -$req['coins_amount'], $id, "Обмен на {$req['rub_amount']} ₽"]);
        Notify::exchangeApproved($db, $req['child_id'], (float)$req['rub_amount']);
    } else {
        $db->prepare("UPDATE exchange_requests SET status='rejected',reviewed_at=NOW() WHERE id=?")->execute([$id]);
        Notify::exchangeRejected($db, $req['child_id']);
    }
    Response::success(['action' => $action]);
}

// GET /exchange?status=pending
if ($method === 'GET' && !$id) {
    if ($role !== 'parent') Response::error('Только для родителей', 403);
    $status = $_GET['status'] ?? 'pending';
    $s = $db->prepare('
        SELECT er.*, c.name child_name, c.avatar child_avatar
        FROM exchange_requests er
        JOIN children c ON c.id = er.child_id
        WHERE c.family_id=? AND er.status=?
        ORDER BY er.created_at DESC
    ');
    $s->execute([$fid, $status]);
    Response::success($s->fetchAll());
}

Response::error('Not found', 404);
