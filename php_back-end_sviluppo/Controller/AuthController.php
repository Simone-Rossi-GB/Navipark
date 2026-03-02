<?php

namespace Controller;
use Model\UtenteRepository as up;

class AuthController
{
    public static function login()
    {

    }

    public static function controlToken(string $utente_id, string $token)
    {
        $result = up::checkToken($utente_id, $token);
        return $result;
    }
}