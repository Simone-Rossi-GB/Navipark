<?php
class StatusCode
{

    // se aggiungete status code ricordatevi che gli errori hanno code più piccoli
    // mentre i successi il contrario

    // DEFAULT

    const OK = [
        'httpStatus' => 200,
        'Code' => 'OK',
        'message' => 'Successo'
    ];

    // STATUS CODE DI AUTENTICAZIONE E AUTORIZZAZIONE

    public const AUTH_TOKEN_MANCANTE = [
        'httpStatus' => 401,
        'Code' => 'A001',
        'message' => 'Token di sessione mancante'
    ];

    public const AUTH_TOKEN_NON_VALIDO = [
        'httpStatus' => 401,
        'Code' => 'A002',
        'message' => 'Token di sessione non valido'
    ];

    public const AUTH_SESSIONE_SCADUTA = [
        'httpStatus' => 401,
        'Code' => 'A003',
        'message' => 'Sessione scaduta, effettua di nuovo il login'
    ];

    public const AUTH_CREDENZIALI_ERRATE = [
        'httpStatus' => 401,
        'Code' => 'A004',
        'message' => 'Email o password non corretti'
    ];

    public const AUTH_ACCESSO_NEGATO = [
        'httpStatus' => 403,
        'Code' => 'A005',
        'message' => 'Non hai i permessi per questa operazione'
    ];

    public const AUTH_LOGIN_OK = [
        'httpStatus' => 200,
        'Code' => 'A010',
        'message' => 'Login effettuato con successo'
    ];

    public const AUTH_LOGOUT_OK = [
        'httpStatus' => 200,
        'Code' => 'A011',
        'message' => 'Logout effettuato con successo'
    ];

    public const AUTH_REGISTRAZIONE_OK = [
        'httpStatus' => 201,
        'Code' => 'A012',
        'message' => 'Registrazione completata con successo'
    ];

    // STATUS CODE DEL DATABASE -> UTENTE

    public const UTENTE_NON_TROVATO = [
        'httpStatus' => 404,
        'Code' => 'U001',
        'message' => 'Utente non trovato'
    ];

    public const UTENTE_EMAIL_ESISTENTE = [
        'httpStatus' => 409,
        'Code' => 'U002',
        'message' => 'Esiste già un account con questa email'
    ];

    public const UTENTE_AGGIORNATO = [
        'httpStatus' => 200,
        'Code' => 'U010',
        'message' => 'Profilo aggiornato con successo'
    ];

    // STATUS CODE DEL DATABASE -> PARCHEGGIO



    // STATUS CODE DEL DATABASE -> PRENOTAZIONE



    // STATUS CODE DI VALIDAZIONE

    public const VALIDATION_REQUEST_FAILED = [
        'httpStatus' => 400,
        'Code' => 'V001',
        'message' => 'Fallita la validazione della richiesta'
    ];

    // STATUS CODE DEL SERVER



}