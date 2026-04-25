<?php
// backend/api/routes/wallet.php
$db   = Database::get();
$auth = Auth::requireAuth();

if ($method === 'GET') {
    $childId  = $auth['sub'];
    $familyId = $auth['family_id'];

    if ($auth['role'] !== 'child') Response::error('Только для детей', 403);

    // Баланс и данные ребёнка
    $stmt = $db->prepare('SELECT coins_balance FROM children WHERE id = ?');
    $stmt->execute([$childId]);
    $child = $stmt->fetch();

    // Курс и лимит семьи
    $stmt = $db->prepare('SELECT coin_rate, monthly_limit FROM families WHERE id = ?');
    $stmt->execute([$familyId]);
    $family = $stmt->fetch();

    // Использовано в этом месяце
    $stmt = $db->prepare('
        SELECT COALESCE(SUM(coins_amount),0) as used
        FROM exchange_requests
        WHERE child_id = ?
          AND status != "rejected"
          AND MONTH(created_at) = MONTH(NOW())
          AND YEAR(created_at)  = YEAR(NOW())
    ');
    $stmt->execute([$childId]);
    $used = (int)$stmt->fetch()['used'];

    // История последних 20 транзакций
    $stmt = $db->prepare('
        SELECT amount, type, note, created_at
        FROM coin_transactions
        WHERE child_id = ?
        ORDER BY created_at DESC
        LIMIT 20
    ');
    $stmt->execute([$childId]);
    $history = $stmt->fetchAll();

    Response::success([
        'balance'        => (int)$child['coins_balance'],
        'coin_rate'      => (float)$family['coin_rate'],
        'monthly_limit'  => (int)$family['monthly_limit'],
        'used_this_month'=> $used,
        'history'        => $history,
    ]);
}

Response::error('Not found', 404);
