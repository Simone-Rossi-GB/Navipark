<?php
namespace Model;

use PDO;

class PrenotazioneRepository
{
    public function __construct(private PDO $pdo) {}

    public function findAll(): array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM prenotazioni ORDER BY created_at DESC');
        $stmt->execute();
        return array_map([$this, 'decode'], $stmt->fetchAll());
    }

    public function findById(string $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM prenotazioni WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ? $this->decode($row) : null;
    }

    public function findByCodice(string $codice): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM prenotazioni WHERE LOWER(codice_prenotazione) = LOWER(:codice)'
        );
        $stmt->execute(['codice' => $codice]);
        $row = $stmt->fetch();
        return $row ? $this->decode($row) : null;
    }

    public function findByUtente(string $utenteId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM prenotazioni WHERE utente_id = :id ORDER BY created_at DESC'
        );
        $stmt->execute(['id' => $utenteId]);
        return array_map([$this, 'decode'], $stmt->fetchAll());
    }

    public function findByParcheggio(string $parcheggioId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM prenotazioni WHERE parcheggio_id = :id ORDER BY created_at DESC'
        );
        $stmt->execute(['id' => $parcheggioId]);
        return array_map([$this, 'decode'], $stmt->fetchAll());
    }

    public function create(array $data): bool
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO prenotazioni
             (id, codice_prenotazione, utente_id, parcheggio_id, parcheggio_nome, targa, data_ora_inizio, data_ora_fine)
             VALUES
             (:id, :codice, :utente_id, :parcheggio_id, :parcheggio_nome, :targa, :inizio, :fine)'
        );
        return $stmt->execute([
            'id'             => $data['id'],
            'codice'         => $data['codice_prenotazione'],
            'utente_id'      => $data['utente_id'],
            'parcheggio_id'  => $data['parcheggio_id'],
            'parcheggio_nome'=> $data['parcheggio_nome'],
            'targa'          => strtoupper($data['targa']),
            'inizio'         => $data['data_ora_inizio'],
            'fine'           => $data['data_ora_fine'],
        ]);
    }

    public function countOverlapping(string $parcheggioId, string $inizio, string $fine): int
    {
        $stmt = $this->pdo->prepare('
        SELECT COUNT(*) FROM prenotazioni
        WHERE parcheggio_id = :id
          AND stato = \'attiva\'
          AND data_ora_inizio < :fine
          AND data_ora_fine > :inizio
    ');
        $stmt->execute(['id' => $parcheggioId, 'inizio' => $inizio, 'fine' => $fine]);
        return (int) $stmt->fetchColumn();
    }

    private function decode(array $row): array
    {
        foreach (['data_ora_inizio', 'data_ora_fine', 'created_at', 'updated_at'] as $field) {
            if (!empty($row[$field]) && !str_ends_with($row[$field], 'Z')) {
                $row[$field] = str_replace(' ', 'T', $row[$field]) . 'Z';
            }
        }
        return $row;
    }

    public function update(string $id, array $data): bool
    {
        $stmt = $this->pdo->prepare(
            "UPDATE prenotazioni
             SET targa = :targa, data_ora_inizio = :inizio, data_ora_fine = :fine
             WHERE id = :id AND stato = 'attiva'"
        );
        return $stmt->execute([
            'targa'  => strtoupper($data['targa']),
            'inizio' => $data['data_ora_inizio'],
            'fine'   => $data['data_ora_fine'],
            'id'     => $id,
        ]);
    }

    // Ritorna true se l'annullamento è andato a buon fine (la prenotazione era attiva)
    public function cancel(string $id): bool
    {
        $stmt = $this->pdo->prepare(
            "UPDATE prenotazioni SET stato = 'annullata' WHERE id = :id AND stato = 'attiva'"
        );
        $stmt->execute(['id' => $id]);
        return $stmt->rowCount() > 0;
    }

    // Statistiche per l'admin dashboard
    // Corrisponde esattamente a adminStats in mockData.js:
    // { totalBookings, activeBookings, totalRevenue, co2Saved, mostUsedParkings }
    public function getStats(): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT
               COUNT(*) AS total,
               SUM(CASE WHEN stato = 'attiva' THEN 1 ELSE 0 END) AS attive
             FROM prenotazioni"
        );
        $stmt->execute();
        $counts = $stmt->fetch();

        // Calcola il ricavo totale: per ogni prenotazione ore * tariffa del parcheggio
        $stmt2 = $this->pdo->prepare(
            "SELECT SUM(
                EXTRACT(EPOCH FROM (pr.data_ora_fine - pr.data_ora_inizio)) / 3600.0
                * pa.tariffa_oraria
             ) AS revenue
             FROM prenotazioni pr
             JOIN parcheggi pa ON pa.id = pr.parcheggio_id"
        );
        $stmt2->execute();
        $rev = $stmt2->fetch();

        // Top 3 parcheggi per numero di prenotazioni
        $stmt3 = $this->pdo->prepare(
            "SELECT parcheggio_nome AS nome, COUNT(*) AS prenotazioni
             FROM prenotazioni
             GROUP BY parcheggio_nome
             ORDER BY prenotazioni DESC
             LIMIT 3"
        );
        $stmt3->execute();

        $revenue = round((float)($rev['revenue'] ?? 0), 2);

        return [
            'totalBookings'    => (int) $counts['total'],
            'activeBookings'   => (int) $counts['attive'],
            'totalRevenue'     => $revenue,
            'co2Saved'         => round($revenue * 0.026, 1), // stima kg CO2
            'mostUsedParkings' => $stmt3->fetchAll(),
        ];
    }
}