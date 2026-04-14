<?php
namespace Util;

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

    const ALIVE = [
        'httpStatus' => 200,
        'Code' => 'Alive',
        'message' => 'Alive'
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

    public const PARCHEGGIO_NON_TROVATO = [
        'httpStatus' => 404,
        'Code' => 'P001',
        'message' => 'Parcheggio non trovato'
    ];

    public const PARCHEGGIO_CREATO = [
        'httpStatus' => 201,
        'Code' => 'P010',
        'message' => 'Parcheggio creato con successo'
    ];

    public const PARCHEGGIO_AGGIORNATO = [
        'httpStatus' => 200,
        'Code' => 'P011',
        'message' => 'Parcheggio aggiornato con successo'
    ];

    public const PARCHEGGIO_ELIMINATO = [
        'httpStatus' => 200,
        'Code' => 'P012',
        'message' => 'Parcheggio eliminato con successo'
    ];

    // STATUS CODE DEL DATABASE -> PRENOTAZIONE

    public const PRENOTAZIONE_NON_TROVATA = [
        'httpStatus' => 404,
        'Code' => 'R001',
        'message' => 'Prenotazione non trovata'
    ];

    public const PRENOTAZIONE_GIA_ANNULLATA = [
        'httpStatus' => 409,
        'Code' => 'R002',
        'message' => 'La prenotazione è già stata annullata'
    ];

    public const PRENOTAZIONE_PARCHEGGIO_PIENO = [
        'httpStatus' => 409,
        'Code' => 'R003',
        'message' => 'Parcheggio pieno in questo intervallo orario'
    ];

    public const PRENOTAZIONE_CREATA = [
        'httpStatus' => 201,
        'Code' => 'R010',
        'message' => 'Prenotazione creata con successo'
    ];

    public const PRENOTAZIONE_AGGIORNATA = [
        'httpStatus' => 200,
        'Code' => 'R011',
        'message' => 'Prenotazione aggiornata con successo'
    ];

    public const PRENOTAZIONE_ANNULLATA = [
        'httpStatus' => 200,
        'Code' => 'R012',
        'message' => 'Prenotazione annullata con successo'
    ];

    // STATUS CODE DI VALIDAZIONE

    public const VALIDAZIONE_CAMPI_MANCANTI = [
        'httpStatus' => 400,
        'Code' => 'V001',
        'message' => 'Campi obbligatori mancanti'
    ];

    public const VALIDAZIONE_EMAIL_NON_VALIDA = [
        'httpStatus' => 400,
        'Code' => 'V002',
        'message' => 'Formato email non valido'
    ];

    public const VALIDAZIONE_TARGA_NON_VALIDA = [
        'httpStatus' => 400,
        'Code' => 'V003',
        'message' => 'Formato targa non valido (es: AB123CD)'
    ];

    public const VALIDAZIONE_DATE_NON_VALIDE = [
        'httpStatus' => 400,
        'Code' => 'V004',
        'message' => 'Date non valide'
    ];

    public const VALIDAZIONE_PASSWORD_DEBOLE = [
        'httpStatus' => 400,
        'Code' => 'V005',
        'message' => 'La password deve avere almeno 8 caratteri'
    ];

    // STATUS CODE DEL SERVER

    public const SERVER_ERRORE_INTERNO = [
        'httpStatus' => 500,
        'Code' => 'S001',
        'message' => 'Errore interno del server'
    ];

    public const SERVER_TROPPE_RICHIESTE = [
        'httpStatus' => 429,
        'Code' => 'S002',
        'message' => 'Troppe richieste, riprova tra poco'
    ];
}