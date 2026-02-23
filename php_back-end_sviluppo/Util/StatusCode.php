<?php
class StatusCode
{
    public const AUTH_TOKEN_NOT_VALID = [
        'httpStatus' => 401,
        'errorCode' => 'A001',
        'message' => 'Token di sessione non valido'
    ];

    public const DB_CONNECTION_FAILED = [
        'httpStatus' => 500,
        'errorCode' => 'D001',
        'message' => 'Connessione al database fallita'
    ];
}