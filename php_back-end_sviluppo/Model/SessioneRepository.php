<?php

namespace Model;
use Util\Connection;

class SessioneRepository{

    public function getSessioneByUtenteId(string $utente_id) : array{
        $pdo = Connection::getInstance();
        $stmt = $pdo->prepare('SELECT * FROM sessioni WHERE utente_id = :utente_id');
        $stmt->execute([
            'utente_id' => $utente_id
        ]);
        return $stmt->fetch();
    }

    public function getSessioneById(string $id) : array{
        $pdo = Connection::getInstance();
        $stmt = $pdo->prepare('SELECT * FROM sessioni WHERE id = :id');
        $stmt->execute([
            'id' => $id
        ]);
        return $stmt->fetch();
    }

    public function getSessioneByToken(string $token) : array{
        $pdo = Connection::getInstance();
        $stmt = $pdo->prepare('SELECT * FROM sessioni WHERE token = :token');
        $stmt->execute([
            'token' => $token
        ]);
        return $stmt->fetch();
    }
}