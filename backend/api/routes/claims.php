<?php
$db=$db??Database::get(); $body=json_decode(file_get_contents('php://input'),true)??[];
$auth=Auth::requireAuth(); $fid=$auth['family_id']; $role=$auth['role'];

if ($method==='POST'&&!$id) {
    if ($role!=='child') Response::error('Только для детей',403);
    $cid=$auth['sub']; $tid=intval($body['task_id']??0);
    $s=$db->prepare('SELECT * FROM tasks WHERE id=? AND family_id=? AND is_active=1'); $s->execute([$tid,$fid]); $task=$s->fetch();
    if (!$task) Response::error('Задание не найдено');
    if ($task['one_time_claim']) { $s=$db->prepare("SELECT id FROM task_claims WHERE task_id=? AND status IN('in_progress','pending','approved')"); $s->execute([$tid]); if ($s->fetch()) Response::error('Задание уже занято'); }
    $s=$db->prepare("SELECT id FROM task_claims WHERE task_id=? AND child_id=? AND status!='rejected'"); $s->execute([$tid,$cid]);
    if ($s->fetch()) Response::error('Ты уже взял это задание');
    $db->prepare("INSERT INTO task_claims (task_id,child_id,status) VALUES (?,'$cid','in_progress')")->execute([$tid]);
    $db->prepare("INSERT INTO task_claims (task_id,child_id) VALUES (?,?)")->execute([$tid,$cid]);
    Response::created(['claim_id'=>$db->lastInsertId()]);
}
if ($method==='PUT'&&$id) {
    $action=$body['action']??'';
    if ($role==='child'&&$action==='submit') {
        $cid=$auth['sub'];
        $db->prepare("UPDATE task_claims SET status='pending',submitted_at=NOW() WHERE id=? AND child_id=? AND status='in_progress'")->execute([$id,$cid]);
        Notify::taskSubmitted($db,(int)$id,$fid);
        Response::success(['submitted'=>true]);
    }
    if ($role==='parent'&&in_array($action,['approve','reject'])) {
        $s=$db->prepare('SELECT tc.*,t.coins_reward,t.family_id tf FROM task_claims tc JOIN tasks t ON t.id=tc.task_id WHERE tc.id=? AND t.family_id=? AND tc.status="pending"');
        $s->execute([$id,$fid]); $cl=$s->fetch();
        if (!$cl) Response::error('Claim не найден или уже обработан');
        if ($action==='approve') {
            $db->prepare("UPDATE task_claims SET status='approved',reviewed_at=NOW() WHERE id=?")->execute([$id]);
            $db->prepare('UPDATE children SET coins_balance=coins_balance+? WHERE id=?')->execute([$cl['coins_reward'],$cl['child_id']]);
            $db->prepare("INSERT INTO coin_transactions (child_id,amount,type,reference_id,note) VALUES (?,'task_reward',?,?)")->execute([$cl['child_id'],$cl['coins_reward'],$id,'За задание']);
            $db->prepare("INSERT INTO coin_transactions (child_id,amount,type,reference_id,note) VALUES (?,?,'task_reward',?,'За задание')")->execute([$cl['child_id'],$cl['coins_reward'],$id]);
            Notify::taskApproved($db,$cl['child_id'],$cl['coins_reward']);
        } else {
            $db->prepare("UPDATE task_claims SET status='rejected',reviewed_at=NOW(),reject_reason=? WHERE id=?")->execute([$body['reason']??null,$id]);
            Notify::taskRejected($db,$cl['child_id'],$body['reason']??null);
        }
        Response::success(['action'=>$action]);
    }
}
if ($method==='GET'&&!$id) {
    if ($role!=='parent') Response::error('Только для родителей',403);
    $status=$_GET['status']??'pending';
    $s=$db->prepare('SELECT tc.*,t.title,t.emoji,t.coins_reward,c.name child_name,c.avatar child_avatar FROM task_claims tc JOIN tasks t ON t.id=tc.task_id JOIN children c ON c.id=tc.child_id WHERE t.family_id=? AND tc.status=? ORDER BY tc.submitted_at DESC');
    $s->execute([$fid,$status]);
    Response::success($s->fetchAll());
}
Response::error('Not found',404);
