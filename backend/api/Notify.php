<?php
class Notify {
    private static function send(string $token, string $title, string $body, array $data=[]): void {
        if (!FCM_SERVER_KEY || !$token) return;
        $ch = curl_init('https://fcm.googleapis.com/fcm/send');
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 5,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json','Authorization: key='.FCM_SERVER_KEY],
            CURLOPT_POSTFIELDS     => json_encode(['to'=>$token,'notification'=>['title'=>$title,'body'=>$body,'sound'=>'default'],'data'=>$data]),
        ]);
        curl_exec($ch); curl_close($ch);
    }

    public static function taskSubmitted(PDO $db, int $claimId, int $familyId): void {
        $s = $db->prepare('SELECT u.fcm_token,c.name cn,t.title FROM task_claims tc JOIN tasks t ON t.id=tc.task_id JOIN children c ON c.id=tc.child_id JOIN families f ON f.id=t.family_id JOIN users u ON u.id=f.parent_id WHERE tc.id=? AND f.id=?');
        $s->execute([$claimId,$familyId]); $r=$s->fetch();
        if ($r) self::send($r['fcm_token'],'📋 Задание на проверке',$r['cn'].' сдал(а) «'.$r['title'].'»',['type'=>'task_submitted']);
    }
    public static function taskApproved(PDO $db, int $childId, int $coins): void {
        $s=$db->prepare('SELECT fcm_token FROM children WHERE id=?'); $s->execute([$childId]); $r=$s->fetch();
        if ($r) self::send($r['fcm_token'],'✅ Задание принято!',"Начислено +{$coins} 🪙",['type'=>'task_approved','coins'=>$coins]);
    }
    public static function taskRejected(PDO $db, int $childId, ?string $reason): void {
        $s=$db->prepare('SELECT fcm_token FROM children WHERE id=?'); $s->execute([$childId]); $r=$s->fetch();
        if ($r) self::send($r['fcm_token'],'❌ Задание отклонено',$reason?:"Попробуй ещё раз 💪",['type'=>'task_rejected']);
    }
    public static function newTask(PDO $db, int $familyId, string $title, ?int $targetId): void {
        $s = $targetId
            ? $db->prepare('SELECT fcm_token FROM children WHERE id=?')
            : $db->prepare('SELECT fcm_token FROM children WHERE family_id=?');
        $s->execute([$targetId??$familyId]);
        foreach ($s->fetchAll() as $r) self::send($r['fcm_token'],'🆕 Новое задание!',"«{$title}» уже доступно",['type'=>'new_task']);
    }
    public static function exchangeRequested(PDO $db, int $familyId, int $childId, int $coins, float $rub): void {
        $s=$db->prepare('SELECT u.fcm_token,c.name FROM families f JOIN users u ON u.id=f.parent_id JOIN children c ON c.id=? WHERE f.id=?');
        $s->execute([$childId,$familyId]); $r=$s->fetch();
        if ($r) self::send($r['fcm_token'],'💱 Запрос обмена',$r['name']." хочет {$coins} 🪙 → ".number_format($rub,2).' ₽',['type'=>'exchange_requested']);
    }
    public static function exchangeApproved(PDO $db, int $childId, float $rub): void {
        $s=$db->prepare('SELECT fcm_token FROM children WHERE id=?'); $s->execute([$childId]); $r=$s->fetch();
        if ($r) self::send($r['fcm_token'],'💰 Обмен одобрен!',"Получишь ".number_format($rub,2).' ₽ 🎉',['type'=>'exchange_approved']);
    }
    public static function exchangeRejected(PDO $db, int $childId): void {
        $s=$db->prepare('SELECT fcm_token FROM children WHERE id=?'); $s->execute([$childId]); $r=$s->fetch();
        if ($r) self::send($r['fcm_token'],'❌ Обмен отклонён','Поговори с родителем 💬',['type'=>'exchange_rejected']);
    }
}
