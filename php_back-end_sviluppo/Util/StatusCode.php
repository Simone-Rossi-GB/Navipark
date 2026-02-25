<?php
class StatusCode
{
    public const AUTH_TOKEN_NOT_FOUND = [
        'httpStatus' => 400,
        'errorCode' => 'A001',
        'message' => 'Token di sessione non presente nella richiesta'
    ];

    public const AUTH_TOKEN_NOT_VALID = [
        'httpStatus' => 401,
        'errorCode' => 'A003',
        'message' => 'Token di sessione non valido'
    ];

    public const AUTH_TOKEN_NOT_EXPIRED = [
        'httpStatus' => 401,
        'errorCode' => 'A003',
        'message' => 'Token di sessione scaduto. Rifare il login'
    ];

    public const DB_CONNECTION_FAILED = [
        'httpStatus' => 500,
        'errorCode' => 'D001',
        'message' => 'Connessione al database fallita'
    ];

    public const VALIDATION_REQUEST_FAILED = [
        'httpStatus' => 400,
        'errorCode' => 'V001',
        'message' => 'Fallita la validazione della richiesta'
    ];
}