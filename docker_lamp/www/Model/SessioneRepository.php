<?php
namespace Model;

use PDO;

class SessioneRepository
{
    public function __construct(private PDO $pdo) {}

    // Cerca sessione valida per token + join con utente
    // AuthMiddleware usa questa per verificare che la sessione non sia stata revocata
    public function findByToken(string $token): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT s.*, u.id AS utente_id, u.email, u.nome, u.cognome, u.ruolo
             FROM sessioni s
             JOIN utenti u ON s.utente_id = u.id
             WHERE s.token = :token AND s.expires_at > NOW()'
        );
        $stmt->execute(['token' => $token]);
        return $stmt->fetch() ?: null;
    }

    public function create(string $id, string $utenteId, string $token, int $ttl): bool
    {
        // INTERVAL non accetta parametri PDO in PostgreSQL: usiamo cast intero diretto
        $sql  = "INSERT INTO sessioni (id, utente_id, token, expires_at)
                 VALUES (:id, :utente_id, :token, NOW() + INTERVAL '" . (int)$ttl . " seconds')";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute(['id' => $id, 'utente_id' => $utenteId, 'token' => $token]);
    }

    public function deleteByToken(string $token): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM sessioni WHERE token = :token');
        return $stmt->execute(['token' => $token]);
    }

    public function deleteExpired(): void
    {
        $this->pdo->exec('DELETE FROM sessioni WHERE expires_at < NOW()');
    }
}