<?php
namespace Util;

class Validator {

    // NON TOCCATE STA FUNZI0NE CHE SERVE: Ritorna array con i nomi dei campi mancanti (vuoto = tutto ok)
    public static function required(array $data, array $fields): array {
        return array_filter($fields, fn($f) => !isset($data[$f]) || $data[$f] === '' || $data[$f] === null);
    }

    public static function email(string $email): bool {
        return filter_var($email, FILTER_VALIDATE_EMAIL) != false;
    }

    public static function targa(string $targa): bool {
        return (bool) preg_match('/^[A-Z]{2}[0-9]{3}[A-Z]{2}$/', strtoupper($targa));
    }

    public static function password(string $password): bool {
        return strlen($password) >= 8;
    }

    public static function dateRange(string $inizio, string $fine): bool {
        $a = strtotime($inizio);
        $b = strtotime($fine);
        return $a !== false && $b !== false && $b > $a;
    }
}