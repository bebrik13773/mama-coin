<?php
class Response {
    public static function success($data = null, int $code = 200): void {
        http_response_code($code);
        echo json_encode(['ok'=>true,'data'=>$data], JSON_UNESCAPED_UNICODE); exit;
    }
    public static function error(string $msg, int $code = 400): void {
        http_response_code($code);
        echo json_encode(['ok'=>false,'error'=>$msg], JSON_UNESCAPED_UNICODE); exit;
    }
    public static function created($data = null): void { self::success($data, 201); }
}
