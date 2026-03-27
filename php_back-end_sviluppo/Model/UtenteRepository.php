<?php

namespace Model;
use Util\Connection;

use PDO;

class UtenteRepository{

    public function __construct(private PDO $pdo) {}

    public function findById(string$id): ?array {
        $stmt = $this->pdo->prepare(
            'SELECT id, email, nome, cognome, telefono, ruolo, created_at, ultimo_accesso
                   FROM utenti WHERE id = :id'
        );
        $stmt->execute([
            'id' => $id
        ]);

        return $stmt->fetch() ?: null;
    }

    // usarla solo per il login siccome ritorna anche l'hash della password
    public function findByEmail(string $email): ?array {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM utenti WHERE email = :email'
        );
        $stmt->execute([
            'email' => $email
        ]);

        return $stmt->fetch() ?: null;
    }

    public function create(array $data): bool {
        $stmt = $this->pdo->prepare(
            'INSERT INTO utenti (id, email, password_hash, nome, cognome, telefono)
                   VALUES (:id, :email, :password_hash, :nome, :cognome, :telefono)'
        );
        return $stmt->execute([
            'id' => $data['id'],
            'email' => $data['email'],
            'password_hash' => $data['password_hash'],
            'nome' => $data['nome'],
            'cognome' => $data['cognome'] ?? '',
            'telefono' => $data['telefono'] ?? ''
        ]);
    }

    public function update(string $id, array $data): bool {
        $stmt = $this->pdo->prepare(
            'UPDATE utenti SET nome = :nome, cognome = :cognome, telefono = :telefono
                   WHERE id = :id'
        );
        return $stmt->execute([
            'nome' => $data['nome'],
            'cognome' => $data['cognome'],
            'telefono' => $data['telefono'],
            'id' => $id,
        ]);
    }

    public function delete(string $id): bool{
        $stmt = $this->pdo->prepare(
            'DELETE FROM utenti WHERE id = :id'
        );
        return $stmt->execute([
            'id' => $id
        ]);
    }

    public function updateUltimoAccesso(string $id): bool {
        $stmt = $this->pdo->prepare(
            'UPDATE utenti SET ultimo_accesso = NOW() WHERE id = :id'
        );
        return $stmt->execute([
            'id' => $id
        ]);
    }
}