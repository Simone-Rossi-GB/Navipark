<?php

namespace Model;
use Util\Connection;

class UtenteRepository{

    private $config;

    public function __construct($config){
        $this->config = $config;
    }

    public function getUserById(string $id) : array{
        $pdo = Connection::getInstance();
        $stmt = $pdo->prepare('SELECT * FROM utenti WHERE id = :id');
        $stmt->execute([
            'id' => $id
        ]);
        return $stmt->fetch();
    }

    public function getUserByEmail(string $email) : array{
        $pdo = Connection::getInstance();
        $stmt = $pdo->prepare('SELECT * FROM utenti WHERE email = :email');
        $stmt->execute([
            'email' => $email
        ]);
        return $stmt->fetch();
    }
}