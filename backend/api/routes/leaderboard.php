<?php
$db=$db??Database::get(); $auth=Auth::requireAuth();
if ($method==='GET') {
    $s=$db->prepare('SELECT id,name,avatar,coins_balance,(SELECT COUNT(*) FROM task_claims tc WHERE tc.child_id=children.id AND tc.status="approved" AND DATE(tc.reviewed_at)=CURDATE()) tasks_today FROM children WHERE family_id=? ORDER BY coins_balance DESC');
    $s->execute([$auth['family_id']]);
    Response::success($s->fetchAll());
}
Response::error('Not found',404);
