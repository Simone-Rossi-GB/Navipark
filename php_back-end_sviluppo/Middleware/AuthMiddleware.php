<?php

namespace Middleware;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Controller\AuthController as ac;

class AuthMiddleware
{
    public static function authenticateToken($request, $handler) {
        $token = $request->getHeaderLine('Authorization');
        $body = $request->getBody();
        $utente_id = $body['utente_id'];
        $result = ac::controlToken($utente_id, $token);
    }

    public static function validateAuthRequest($request, $handler) {

    }

    public static function login($request, $handler) {

    }

    public static function register($request, $handler) {

    }

    public static function generateToken($request, $handler) {

    }
}