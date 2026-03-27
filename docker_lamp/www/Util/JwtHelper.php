<?php
namespace Util;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;

// non toccare questa classe che la sto controllando

class JwtHelper {

    // Genera il JWT token
    public static function generate(string $utenteId, string $secret, int $ttl): string {
        $payload = [
            'iss' => 'Navipark-Brescia', // l'ente che rilascia il token
            'sub' => $utenteId, // a chi è associato
            'iat' => time(), // orario generazione
            'exp' => time() + $ttl // scadenza token
        ];

        return JWT::encode($payload, $secret, 'HS256');
    }

    // Ritorna l'utente_id (sub) se il token è valido, null altrimenti
    public static function verify(string $token, string $secret): ?string {
        try {
            $decoded = JWT::decode($token, new Key($secret, 'HS256'));
            return $decoded->sub;
        } catch (\Exception $e) {
            return null;
        }
    }
}