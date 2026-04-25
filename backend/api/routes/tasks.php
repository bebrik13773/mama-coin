<?php
// routes/tasks.php
$db=$db??Database::get(); $body=json_decode(file_get_contents('php://input'),true)??[];
$auth=Auth::requireAuth(); $fid=$auth['family_id']; $role=$auth['role'];

if ($method==='GET'&&!$id) {
    if ($role==='parent') {
        $s=$db->prepare('SELECT t.*,c.name target_child_name FROM tasks t LEFT JOIN children c ON c.id=t.target_child_id WHERE t.family_id=? AND t.is_active=1 ORDER BY t.created_at DESC');
        $s->execute([$fid]);
    } else {
        $cid=$auth['sub'];
        $s=$db->prepare('SELECT t.*,mc.status my_status,mc.id my_claim_id,(SELECT COUNT(*) FROM task_claims tc2 WHERE tc2.task_id=t.id AND tc2.child_id!=:c AND tc2.status IN("in_progress","pending","approved")) taken_by_others FROM tasks t LEFT JOIN task_claims mc ON mc.task_id=t.id AND mc.child_id=:c2 AND mc.status!="rejected" WHERE t.family_id=:f AND t.is_active=1 AND (t.type="common" OR t.target_child_id=:c3) ORDER BY t.created_at DESC');
        $s->execute([':c'=>$cid,':c2'=>$cid,':c3'=>$cid,':f'=>$fid]);
    }
    $tasks=$s->fetchAll();
    if ($role==='child') foreach ($tasks as &$t) $t['available']=!($t['one_time_claim']&&$t['taken_by_others']>0||in_array($t['my_status'],['in_progress','pending','approved']));
    Response::success($tasks);
}
if ($method==='POST'&&!$id) {
    if ($role!=='parent') Response::error('Только для родителей',403);
    $title=trim($body['title']??''); if (!$title) Response::error('Введи название');
    $type=$body['type']??'common'; $coins=max(1,min(9999,intval($body['coins_reward']??10)));
    if ($type==='individual'&&empty($body['target_child_id'])) Response::error('Укажи ребёнка');
    $db->prepare('INSERT INTO tasks (family_id,title,description,emoji,type,target_child_id,is_daily,one_time_claim,coins_reward) VALUES (?,?,?,?,?,?,?,?,?)')->execute([$fid,$title,$body['description']??null,$body['emoji']??'📋',$type,$body['target_child_id']??null,intval($body['is_daily']??0),intval($body['one_time_claim']??0),$coins]);
    $tid=$db->lastInsertId();
    Notify::newTask($db,$fid,$title,$body['target_child_id']??null);
    $s=$db->prepare('SELECT * FROM tasks WHERE id=?'); $s->execute([$tid]);
    Response::created($s->fetch());
}
if ($method==='PUT'&&$id) {
    if ($role!=='parent') Response::error('Только для родителей',403);
    $fields=['title','description','emoji','coins_reward','is_daily','one_time_claim','is_active'];
    $set=[];$params=[];
    foreach ($fields as $f) if (isset($body[$f])) { $set[]="$f=?"; $params[]=$body[$f]; }
    if (!$set) Response::error('Нет данных');
    $params[]=$id; $params[]=$fid;
    $db->prepare('UPDATE tasks SET '.implode(',',$set).' WHERE id=? AND family_id=?')->execute($params);
    Response::success(['updated'=>true]);
}
if ($method==='DELETE'&&$id) {
    if ($role!=='parent') Response::error('Только для родителей',403);
    $db->prepare('UPDATE tasks SET is_active=0 WHERE id=? AND family_id=?')->execute([$id,$fid]);
    Response::success(['deleted'=>true]);
}
Response::error('Not found',404);
