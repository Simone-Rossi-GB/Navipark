<?php

namespace Model;
use Util\Connection;

class UtenteRepository{

    public function getUtenteById(string $id) : array{
        $pdo = Connection::getInstance();
        $stmt = $pdo->prepare('SELECT * FROM utenti WHERE id = :id');
        $stmt->execute([
            'id' => $id
        ]);
        return $stmt->fetch();
    }

    public function getUtenteByEmail(string $email) : array{
        $pdo = Connection::getInstance();
        $stmt = $pdo->prepare('SELECT * FROM utenti WHERE email = :email');
        $stmt->execute([
            'email' => $email
        ]);
        return $stmt->fetch();
    }
}