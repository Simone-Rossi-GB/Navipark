<?php

namespace Middleware;
use Controller\AuthController;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Controller\AuthController as ac;
use Util\JsonResponse;

class AuthMiddleware
{
    public static function authenticateToken($request, $handler) {
        $token = $request->getHeaderLine('Authorization');
        $body = $request->getBody();
        $utente_id = $body['utente_id'];
        $result = ac::controlToken($utente_id, $token);
    }

    public static function validateAuthRequest($request)
    {
        $authHeader = $request->getHeaderLine('Authorizarion');

        if (empty($authHeader)) {
            return JsonResponse::error('token mancante', \StatusCode::AUTH_TOKEN_NOT_FOUND);
        }

        $jwtRegex = '/^Bearer\s+([a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+)$/';

        if (!preg_match($jwtRegex, $authHeader, $matches)) {
            return JsonResponse::error('token non rispetta il regex', \StatusCode::VALIDATION_REQUEST_FAILED);
        }

        $token = $matches[1];

        return $token;
    }

    public static function login($request, $handler)
    {
        $utente = AuthController::login()
        $ttl = 86400; // 24 ore in sec
        $payload = [
            'iss' => 'parcheggi-Brescia', // l'ente che rilascia il token
            'sub' => $utente['id'], // a chi è associato
            'iat' => time(), // orario generazione
            'exp' => time() + $ttl // scadenza token
        ];

        $token = JWT::encode

        Response $response =
        return $response;
    }

    public static function register($request, $handler) {

    }

    public static function generateToken($request, $handler) {

    }
}